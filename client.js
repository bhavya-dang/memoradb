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
