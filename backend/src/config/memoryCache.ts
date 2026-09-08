class MemoryCacheService {
  private readonly entries = new Map<string, { value: string; expiry: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    this.entries.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async flushPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.entries.keys()) {
      if (regex.test(key)) {
        this.entries.delete(key);
      }
    }
  }
}

export const cache = new MemoryCacheService();
