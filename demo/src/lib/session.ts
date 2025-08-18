// Simple per-user state and rate limit utilities backed by signed cookies

type UserState = {
  like?: {
    liked: boolean;
    count: number;
  };
  comments?: Array<{
    id: string;
    author: string;
    text: string;
    timestamp: string;
  }>;
};

const COOKIE_USER_ID = "demo_user_id";
const COOKIE_STATE = "demo_user_state";
const COOKIE_RL = "demo_rate_limit";

function getCookie(Astro: any, name: string): string | undefined {
  return Astro.cookies.get(name)?.value;
}

function setCookie(Astro: any, name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 365) {
  Astro.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: maxAgeSeconds
  });
}

export function getOrCreateUserId(Astro: any): string {
  let id = getCookie(Astro, COOKIE_USER_ID);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    setCookie(Astro, COOKIE_USER_ID, id);
  }
  return id;
}

export function getUserState(Astro: any): UserState {
  const raw = getCookie(Astro, COOKIE_STATE);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as UserState : {};
  } catch {
    return {};
  }
}

export function setUserState(Astro: any, state: UserState) {
  // Keep cookie small: cap comments to 10, truncate text to 300 chars
  const safeState: UserState = { ...state };
  if (Array.isArray(safeState.comments)) {
    safeState.comments = safeState.comments
      .slice(-10)
      .map(c => ({
        ...c,
        text: c.text.slice(0, 300)
      }));
  }
  setCookie(Astro, COOKIE_STATE, JSON.stringify(safeState));
}

type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export function rateLimit(Astro: any, key: string, limit: number, windowSeconds: number): RateLimitResult {
  const userId = getOrCreateUserId(Astro);
  const ip = Astro.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucketKey = `${key}:${userId}:${ip}`;

  let rlRaw = getCookie(Astro, COOKIE_RL);
  let rl: Record<string, { c: number; ts: number }> = {};
  try {
    if (rlRaw) rl = JSON.parse(rlRaw);
  } catch {}

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = rl[bucketKey];

  if (!entry || now - entry.ts >= windowMs) {
    rl[bucketKey] = { c: 1, ts: now };
    setCookie(Astro, COOKIE_RL, JSON.stringify(rl), windowSeconds * 2);
    return { ok: true };
  }

  if (entry.c >= limit) {
    const retryAfter = Math.ceil((entry.ts + windowMs - now) / 1000);
    return { ok: false, retryAfter };
  }

  entry.c += 1;
  rl[bucketKey] = entry;
  setCookie(Astro, COOKIE_RL, JSON.stringify(rl), windowSeconds * 2);
  return { ok: true };
}

export function getSampleComments() {
  return [
    {
      id: "1",
      author: "Alice",
      text: "This is really helpful, thanks for sharing!",
      timestamp: "2:30 PM"
    },
    {
      id: "2",
      author: "Bob",
      text: "I had the same question. Great explanation!",
      timestamp: "2:45 PM"
    }
  ];
}


