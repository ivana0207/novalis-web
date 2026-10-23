// Rate limit for the job application form (api/apply.mjs): at most PER_IP submissions per address and ALL per
// instance in a sliding 10-minute window. Kept in memory: each serverless instance counts on its own and forgets on a
// cold start, so this is best effort against floods, not an exact quota. No cookies, nothing stored about visitors
// beyond these timestamps, which expire with the window.
const WINDOW = 10 * 60 * 1000;
const PER_IP = 5;
const ALL = 60;
const MAX_KEYS = 5000;

let byIp = new Map();
let all = [];

function prune(now) {
  const since = now - WINDOW;
  all = all.filter((t) => t > since);
  if (byIp.size > MAX_KEYS / 2) {
    for (const [ip, list] of byIp) if (!list.some((t) => t > since)) byIp.delete(ip);
  }
}

// Counts one submission from ip. Returns 0 when it may go ahead, else the seconds to wait (Retry-After).
export function take(ip, now = Date.now()) {
  prune(now);
  const since = now - WINDOW;
  const list = (byIp.get(ip) || []).filter((t) => t > since);
  if (all.length >= ALL) return Math.max(1, Math.ceil((all[0] + WINDOW - now) / 1000));
  if (list.length >= PER_IP) return Math.max(1, Math.ceil((list[0] + WINDOW - now) / 1000));
  if (byIp.size >= MAX_KEYS && !byIp.has(ip)) return Math.max(1, Math.ceil(WINDOW / 1000));
  list.push(now);
  all.push(now);
  byIp.set(ip, list);
  return 0;
}

// Tests and the local dev server only (never called from a request).
export function resetLimits() {
  byIp = new Map();
  all = [];
}
