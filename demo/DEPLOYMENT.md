## Deploying the demo on Vercel with per-user state and cost control

### Goals
- Isolate user state (likes, comments) so users never see each other’s data
- Keep the demo fast and cheap to run
- Add guardrails (rate limiting, TTLs) to prevent abuse and cost spikes

### Recommended architecture
- **Adapter**: Use Vercel’s adapter for Astro (serverless or edge), deploy via Vercel
- **Identity**: Anonymous session cookie to distinguish users (`HttpOnly`, `Secure`, `SameSite=Lax`)
- **State storage options** (pick one):
  - **Vercel KV (recommended)**: Store per-user likes and comments by session ID. Durable, multi-region, works across serverless cold starts
  - **Cookie-only fallback (shipped here)**: Minimal state persisted in signed cookies for a zero-infra demo. Good for low traffic, but limited storage and not shareable across devices
- **Rate limiting**:
  - Simple, low-overhead limiter per user + IP for write endpoints (likes, comments)
  - For production: `@upstash/ratelimit` with Vercel KV/Redis at the edge

### What’s already included in this demo
- `src/lib/session.ts`
  - Generates a per-user session ID cookie
  - Stores a small per-user state payload in a signed, `HttpOnly` cookie (last 10 comments, truncated text)
  - Provides a lightweight cookie-based rate limiter per user + IP (leaky bucket style)

This keeps state isolated per user even on Vercel’s serverless platform without adding external services. It’s intentionally minimal for a documentation/demo site.

### Upgrading to Vercel KV (recommended for “wild” usage)
Use Vercel KV to persist per-user state keyed by the session ID. Benefits: better durability, no cookie bloat, works across devices when session is shared, enables stronger rate limiting.

Suggested key layout:
- `u:{sessionId}:likes` → boolean + count or per-item map
- `u:{sessionId}:comments` → list (store last N, e.g., 50) with server timestamps

Operational practices:
- **TTL**: Set TTLs on keys (e.g., 7–30 days) to bound storage
- **Size caps**: Truncate comment text and cap list sizes
- **Batching**: For bursts, batch reads/writes if your patterns allow

### Rate limiting policies
- **Write endpoints** (likes, comments): 5 requests / 10 seconds / user (+IP)
- **Burst control**: small bursts allowed; hard cap per minute (e.g., 60/min)
- **429 handling**: return `Retry-After` seconds; hx-optimistic will show errors gracefully

Implementation options:
- Cookie-based limiter (already included) for zero-infra demos
- Edge Middleware + `@upstash/ratelimit` for production-grade limits with Vercel KV/Redis

### Deploying on Vercel
1) Ensure the Astro Vercel adapter is configured (serverless or edge)
2) Add environment variables if using Vercel KV (REST URL/token)
3) Deploy via Vercel; static assets are cached automatically; API routes run as Functions

### Cost control checklist
- Use rate limiting on all write endpoints
- Cap list sizes and truncate large fields (done here)
- Add TTLs to KV keys
- Prefer Serverless over always-on compute for sporadic traffic
- Cache static assets aggressively (Vercel does by default)
- Keep logs minimal; avoid noisy console output in production

### Approximate cost ranges (order-of-magnitude)
These are directional estimates for a docs-style interactive site and will vary with traffic patterns and Vercel pricing. Check your Vercel dashboard for real usage and current rates.

- **Very low traffic** (≤ 10k page views/mo; ≤ 50k API calls; ≤ 50k KV ops)
  - Likely fits in free tiers or costs in the ~$0–$5 range/month

- **Small** (50k–200k page views/mo; 250k–1M API calls; 250k–1M KV ops)
  - Expect roughly $0–$10 usage plus any base plan fee (e.g., Pro plan)

- **Medium** (200k–1M page views/mo; 1M–5M API calls; 1M–5M KV ops)
  - Expect roughly low tens of dollars in usage; with a Pro plan, budget ~$20–$80+ total

- **Larger** (1M–5M page views/mo; 5M–20M API calls)
  - Expect mid-to-high tens or low hundreds of dollars, depending on function time, KV ops, and bandwidth

Primary cost drivers:
- Number and duration of Serverless/Edge function invocations (API routes)
- KV requests and stored data size
- Bandwidth for assets and API responses

How to stay on the low end:
- Keep API payloads small and cacheable
- Limit comment sizes and cap history length
- Use conservative rate limits and backoff on errors
- Prefer cookie-only mode for small demos; switch to KV only when needed

### Migration notes (cookie-only → Vercel KV)
- Replace `getUserState`/`setUserState` in `src/lib/session.ts` with KV-backed versions
- Keep the session cookie for identity; store only an ID in the cookie
- Add TTL and list size caps in KV layer
- Optionally move the rate limiter to `@upstash/ratelimit` using the same session ID + IP keying

### Security
- Cookies are `HttpOnly`, `Secure`, `SameSite=Lax`
- Avoid storing secrets or PII; only anonymous session IDs and non-sensitive demo data
- Validate and sanitize inputs (length checks already present)

### TL;DR
- Start with the built-in cookie-based session + limiter for a zero-cost demo
- When traffic grows, switch to Vercel KV for state and `@upstash/ratelimit` for rate limiting
- Use TTLs, caps, and conservative limits to keep bills minimal


