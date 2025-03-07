# MemoraDB

MemoraDB is a lightweight, type safe, Redis-like in-memory key-value store written in TypeScript. It supports operations like `SET`, `GET`, `EXPIRE`, and more.

## Features

- In-memory key-value storage
- Supports TTL (Time-To-Live) for keys
- Basic Redis-like commands (`SET`, `GET`, `DEL`, `INCR`, `DECR`, `FLUSHALL`, etc.)
- Lightweight and easy to integrate
- TCP server for remote communication
- TypeScript support with an easy-to-use client library

## Installation

You can install MemoraDB via npm:

```sh
npm install memoradb
```

## Usage

### Running Memora Server

You can start the Memora server using:

```sh
npx memoradb 7000
```

This will start the server on port `7000`.

<!-- ### Using MemoraDB in a Node.js Project

You can use Memora as a client inside your Node.js application:

```ts
import { MemoraClient } from "memoradb";

(async () => {
  const memora = new MemoraClient("localhost", 7000);
  await memora.connect();

  console.log(await memora.set("user", "Harshit")); // OK
  console.log(await memora.get("user")); // Harshit
  console.log(await memora.incr("counter")); // 1
  console.log(await memora.expire("user", 10)); // 1 (sets expiry for 10 seconds)

  setTimeout(async () => {
    console.log(await memora.get("user")); // (nil)
  }, 11000);
})();
``` -->

### Memora Commands

Memora supports the following commands:

| Command                      | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `SET key value [EX seconds]` | Stores a key with an optional expiration time |
| `GET key`                    | Retrieves the value of a key                  |
| `DEL key`                    | Deletes a key                                 |
| `EXPIRE key seconds`         | Sets a time-to-live (TTL) for a key           |
| `TTL key`                    | Gets the remaining TTL for a key              |
| `PERSIST key`                | Removes expiration from a key                 |
| `FLUSHALL`                   | Deletes all keys                              |
| `INCR key`                   | Increments a numerical key                    |
| `DECR key`                   | Decrements a numerical key                    |

### Connecting via TCP (Netcat / Telnet)

If Memora is running as a TCP server, you can interact with it using `netcat`:

```sh
nc localhost 7000
```

Then, you can enter commands like:

```sh
SET name Memora
GET name
INCR counter
```

### Running Memora Locally

To run Memora locally:

```sh
node index.js 6379
```

This starts the server on port `6379`.

## Contributing

Contributions are welcome! Feel free to open issues or submit PRs.

## License

This project is licensed under the MIT License.
