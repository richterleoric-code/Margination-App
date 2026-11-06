// Simple in-memory sliding-window limiter (fine for a single local server).
export function createRateLimiter() {
  const hits = new Map();

  return function check(key, limit, windowMs = 60_000) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
      return { allowed: false, retryAfter };
    }
    recent.push(now);
    hits.set(key, recent);

    // Opportunistic cleanup so the map cannot grow forever.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      }
    }
    return { allowed: true, retryAfter: 0 };
  };
}
