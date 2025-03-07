#!/usr/bin/env node

import net from "net";

const port: number = process.argv[2] ? parseInt(process.argv[2]) : 6379;

class MemoraDB {
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

const db = new MemoraDB();

const server = net.createServer((socket) => {
  socket.write(`MemoraDB Server Connected\nMemoraDB:${port}> `);
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
        socket.write(response + "\nMemoraDB:" + port + "> ");
      });
    }
  });

  socket.on("end", () => console.log("Client disconnected"));
});

server.listen(port, () => {
  console.log(`MemoraDB Server listening on port ${port}`);
});

export default MemoraDB;
