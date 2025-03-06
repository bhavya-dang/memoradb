#!/usr/bin/env node

import net from "net";

const port: number = process.argv[2] ? parseInt(process.argv[2]) : 6379;

class Memora {
  private store: Map<string, string | number>;
  private expirations: Map<string, number>;

  constructor() {
    this.store = new Map();
    this.expirations = new Map();
  }

  set(
    key: string,
    value: string | number,
    expiry: number | null = null
  ): string {
    this.store.set(key, value);
    if (expiry) {
      this.setExpiry(key, expiry);
    }
    return "OK";
  }

  get(key: string): string | number | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  del(key: string): string {
    this.store.delete(key);
    this.expirations.delete(key);
    return "OK";
  }

  expire(key: string, seconds: number): number {
    if (this.store.has(key)) {
      this.setExpiry(key, seconds);
      return 1;
    }
    return 0;
  }

  ttl(key: string): number {
    if (!this.expirations.has(key)) return -1;
    const expiryTime = this.expirations.get(key)!;
    const remaining = Math.ceil((expiryTime - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  persist(key: string): number {
    return this.expirations.delete(key) ? 1 : 0;
  }

  flushAll(): string {
    this.store.clear();
    this.expirations.clear();
    return "OK";
  }

  incr(key: string): number {
    if (!this.store.has(key) || isNaN(Number(this.store.get(key)))) {
      this.store.set(key, 0);
    }
    this.store.set(key, Number(this.store.get(key)) + 1);
    return Number(this.store.get(key));
  }

  decr(key: string): number {
    if (!this.store.has(key) || isNaN(Number(this.store.get(key)))) {
      this.store.set(key, 0);
    }
    this.store.set(key, Number(this.store.get(key)) - 1);
    return Number(this.store.get(key));
  }

  private setExpiry(key: string, seconds: number): void {
    const expiryTime = Date.now() + seconds * 1000;
    this.expirations.set(key, expiryTime);
    setTimeout(() => {
      if (Date.now() >= expiryTime) {
        this.del(key);
      }
    }, seconds * 1000);
  }
}

class MemoraClient {
  private client: net.Socket;
  private host: string;
  private port: number;

  constructor(host: string = "localhost", port: number = 6379) {
    this.host = host;
    this.port = port;
    this.client = new net.Socket();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.connect(this.port, this.host, resolve);
      this.client.on("error", reject);
    });
  }

  private sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.once("data", (data) => resolve(data.toString().trim()));
      this.client.write(command + "\n");
    });
  }

  async set(
    key: string,
    value: string | number,
    expiry: number | null = null
  ): Promise<string> {
    return expiry
      ? this.sendCommand(`SET ${key} ${value} EX ${expiry}`)
      : this.sendCommand(`SET ${key} ${value}`);
  }

  async get(key: string): Promise<string> {
    return this.sendCommand(`GET ${key}`);
  }

  async del(key: string): Promise<string> {
    return this.sendCommand(`DEL ${key}`);
  }

  async expire(key: string, seconds: number): Promise<string> {
    return this.sendCommand(`EXPIRE ${key} ${seconds}`);
  }

  async ttl(key: string): Promise<string> {
    return this.sendCommand(`TTL ${key}`);
  }

  async persist(key: string): Promise<string> {
    return this.sendCommand(`PERSIST ${key}`);
  }

  async flushAll(): Promise<string> {
    return this.sendCommand(`FLUSHALL`);
  }

  async incr(key: string): Promise<string> {
    return this.sendCommand(`INCR ${key}`);
  }

  async decr(key: string): Promise<string> {
    return this.sendCommand(`DECR ${key}`);
  }
}

const db = new Memora();

const server = net.createServer((socket) => {
  socket.write(`Memora Server Connected\nmemora:${port}> `);
  let buffer = "";

  socket.on("data", (data) => {
    buffer += data.toString();
    if (buffer.includes("\n")) {
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      lines.forEach((line) => {
        const input = line.trim().split(/\s+/);
        const command = input[0]?.toUpperCase();
        let response = "Unknown command";
        switch (command) {
          case "SET":
            response = db.set(
              input[1],
              input[2],
              input[3] === "EX" ? parseInt(input[4]) : null
            );
            break;
          case "GET":
            response = db.get(input[1])?.toString() || "(nil)";
            break;
          case "DEL":
            response = db.del(input[1]);
            break;
          case "EXPIRE":
            response = db.expire(input[1], parseInt(input[2])).toString();
            break;
          case "TTL":
            response = db.ttl(input[1]).toString();
            break;
          case "PERSIST":
            response = db.persist(input[1]).toString();
            break;
          case "FLUSHALL":
            response = db.flushAll();
            break;
          case "INCR":
            response = db.incr(input[1]).toString();
            break;
          case "DECR":
            response = db.decr(input[1]).toString();
            break;
          default:
            response = "Unknown command";
        }
        socket.write(response + "\nmemora:" + port + "> ");
      });
    }
  });

  socket.on("end", () => console.log("Client disconnected"));
});

server.listen(port, () => {
  console.log(`Memora Server listening on port ${port}`);
});

export { MemoraClient };
