const net = require("net");

const port = process.argv[2] ? parseInt(process.argv[2]) : 6379;

class Memora {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
  }

  set(key, value, expiry = null) {
    this.store.set(key, value);
    if (expiry) {
      this.setExpiry(key, expiry);
    }
    return "OK";
  }

  get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  del(key) {
    this.store.delete(key);
    this.expirations.delete(key);
    return "OK";
  }

  expire(key, seconds) {
    if (this.store.has(key)) {
      this.setExpiry(key, seconds);
      return 1;
    }
    return 0;
  }

  ttl(key) {
    if (!this.expirations.has(key)) return -1;
    const expiryTime = this.expirations.get(key);
    const remaining = Math.ceil((expiryTime - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  persist(key) {
    return this.expirations.delete(key) ? 1 : 0;
  }

  flushAll() {
    this.store.clear();
    this.expirations.clear();
    return "OK";
  }

  incr(key) {
    if (!this.store.has(key) || isNaN(this.store.get(key))) {
      this.store.set(key, 0);
    }
    this.store.set(key, Number(this.store.get(key)) + 1);
    return this.store.get(key);
  }

  decr(key) {
    if (!this.store.has(key) || isNaN(this.store.get(key))) {
      this.store.set(key, 0);
    }
    this.store.set(key, Number(this.store.get(key)) - 1);
    return this.store.get(key);
  }

  setExpiry(key, seconds) {
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
  constructor(host = "localhost", port = port) {
    this.host = host;
    this.port = port;
    this.client = new net.Socket();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client.connect(this.port, this.host, resolve);
      this.client.on("error", reject);
    });
  }

  sendCommand(command) {
    return new Promise((resolve, reject) => {
      this.client.once("data", (data) => resolve(data.toString().trim()));
      this.client.write(command + "\n");
    });
  }

  async set(key, value, expiry = null) {
    if (expiry) {
      return this.sendCommand(`SET ${key} ${value} EX ${expiry}`);
    }
    return this.sendCommand(`SET ${key} ${value}`);
  }

  async get(key) {
    return this.sendCommand(`GET ${key}`);
  }

  async del(key) {
    return this.sendCommand(`DEL ${key}`);
  }

  async expire(key, seconds) {
    return this.sendCommand(`EXPIRE ${key} ${seconds}`);
  }

  async ttl(key) {
    return this.sendCommand(`TTL ${key}`);
  }

  async persist(key) {
    return this.sendCommand(`PERSIST ${key}`);
  }

  async flushAll() {
    return this.sendCommand(`FLUSHALL`);
  }

  async incr(key) {
    return this.sendCommand(`INCR ${key}`);
  }

  async decr(key) {
    return this.sendCommand(`DECR ${key}`);
  }
}

const db = new Memora();

const server = net.createServer((socket) => {
  socket.write(`Memora Server Connected\nmemora:${port}>`);
  let buffer = "";

  socket.on("data", (data) => {
    buffer += data.toString();
    if (buffer.includes("\n")) {
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep any incomplete line

      lines.forEach((line) => {
        const input = line.trim().split(/\s+/);
        const command = input[0]?.toUpperCase();
        let response = "Unknown command";
        switch (command) {
          case "SET" || "set":
            response = db.set(
              input[1],
              input[2],
              input[3] === "EX" || "ex" ? parseInt(input[4]) : null
            );
            break;
          case "GET" || "get":
            response = db.get(input[1]);
            break;
          case "DEL" || "del":
            response = db.del(input[1]);
            break;
          case "EXPIRE" || "expire":
            response = db.expire(input[1], parseInt(input[2]));
            break;
          case "TTL" || "ttl":
            response = db.ttl(input[1]);
            break;
          case "PERSIST" || "persist":
            response = db.persist(input[1]);
            break;
          case "FLUSHALL" || "flushall":
            response = db.flushAll();
            break;
          case "INCR" || "incr":
            response = db.incr(input[1]);
            break;
          case "DECR" || "decr":
            response = db.decr(input[1]);
            break;
          default:
            response = "Unknown command";
        }
        socket.write(response + "\n");
        socket.write(`memora:${port}>`); // Explicitly flush prompt
      });
    }
  });

  socket.on("end", () => console.log("Client disconnected"));
});

server.listen(port, () => {
  console.log(`Memora Server listening on port ${port}`);
});

module.exports = { MemoraClient };
