const net = require("net");

const port = process.argv[2] ? parseInt(process.argv[2]) : 6379;

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

const Memora = require("./client");
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
