# Website assistant (AI)

An "Ask a question" assistant on every page. It answers visitors' questions from the site's own
content, and when someone needs service it turns the conversation into a **service request** they
can send by phone, email or the contact form. It is off until you switch it on (see Setup).

## What it does

- **Answers questions from the website only.** Services, service areas and neighborhoods,
  emergency availability, hours, maintenance and filter advice, warranty, permits, and how quotes
  work. It links to the page that covers the topic. If the site doesn't say something, it says so
  and offers the phone number instead of guessing. It never quotes prices: the site promises a
  written estimate after an assessment, and that is what it tells people.
- **Turns a conversation into a lead.** When a visitor wants a repair, installation, maintenance
  visit or quote, it asks one question at a time (what's wrong, what system, which area), then shows a
  card with the details and three buttons: **Call**, **Email this request** (a pre-filled email)
  and **Use the contact form** (fills in the message). Nothing is sent until the visitor does it
  themselves, and the card says so. It never asks for names, phone numbers or addresses.
- **Puts emergencies first.** For no heat, no cooling, leaks or burning smells it gives the phone
  number before anything else. For a gas smell or a carbon monoxide alarm it tells the visitor to
  leave and call 911 or the gas utility from outside.
- **Knows which page the visitor is on** and offers starter questions that fit it (repair problems
  on the Repair page, neighborhoods on area pages, and so on).

## Architecture

```
Browser                                       Server (Vercel Function)                     Anthropic
───────                                       ────────────────────────                     ─────────
Assistant.astro  launcher button (no React)
   │ first click
   ▼
mount.tsx → AssistantPanel  (lazy chunk)      api/assistant.ts
   │ POST /api/assistant/                       └ handler.ts
   │ { messages (last ≤10), page }  ───────────►  origin + JSON + size checks
   │                                              validate.ts (roles, lengths, page allowlist)
   │                                              rate-limit.ts (per visitor, per day, parallel)
   │                                              prompt.ts: cached system prompt =
   │                                                rules + knowledge.generated.ts
   │                                              provider-anthropic.ts ──────────────────► Messages API
   │  ◄─── text/event-stream ────────────────────  text deltas                    ◄──────── (streaming)
   │       {text} {service_request} {done|error}   tool input → validate.ts → card
   ▼
Markdown.tsx (safe subset, link allowlist)
```

**Knowledge, not a vector database.** The whole site is about 32,000 characters (roughly 8,000
tokens). That fits in every request, so the assistant always sees all of it: no retrieval step that
could miss the right passage, no embeddings, no extra service. `scripts/build-knowledge.mjs` reads
the built pages in `dist/` (exactly what visitors see), keeps the text inside `<main>`, drops repeated
blocks, and writes `src/server/assistant/knowledge.generated.ts`. Business facts (phone, hours,
areas) come from the page's structured data. Because the system prompt is identical on every
request, the provider caches it, so repeat questions pay about a tenth of the input price. If the
site grows past 60,000 characters the build stops and says so; that is the point to switch to
retrieving sections per question.

**Updating what it knows:** edit the page copy as usual, run `npm run build` (it regenerates the
knowledge file), and commit. `npm run verify` fails if the committed knowledge file is out of date.

**Model.** `claude-haiku-5-5` (Claude Haiku 5.5) at low effort. Answering short questions from a
small, given set of pages doesn't need a larger model; Haiku is the fastest and cheapest Claude
model. Set `ASSISTANT_MODEL=claude-sonnet-5-5` for a stronger model (about 20× the price per
token). The rest of the code doesn't know which provider it talks to: `provider-anthropic.ts` is the
only file that does. Switching providers means writing one file with the same `stream()` interface.

**Costs** (Haiku 5.5: $0.10 per million input tokens, $0.50 per million output tokens; check
current pricing). A typical answer with the cached knowledge is about $0.0005; the worst case (cache
cold, long conversation) is about $0.002. The default daily cap of 2,000 replies bounds the spend at
roughly $1–4 per day. Each reply is logged with its token counts and estimated cost (see Monitoring).

## Security and privacy

- **The API key stays on the server.** It is read from the host's environment by the function and
  is never in the page, the build output or git.
- **Only this site can use the endpoint.** Requests must come from the site's own origin (or one
  listed in `ASSISTANT_ALLOWED_ORIGINS`) and be JSON. Other sites can't call it from a browser,
  and scripts without an `Origin` header are refused.
- **Spending is capped** at four levels: a per-visitor limit (12 messages per 10 minutes, 60 per
  day), a daily total for the whole site (2,000), at most 2 parallel replies per visitor, and a
  1,500-token cap on every reply. Also set a monthly spend limit in the Anthropic console: that is
  the hard ceiling. Note that limits are kept in memory per server instance unless Upstash Redis
  is configured (see Setup).
- **Input limits:** 800 characters per message, the last 10 turns, a 24 KB body. Invisible and
  control characters are stripped.
- **Prompt injection.** Visitor text only ever goes into user turns, never into the instructions.
  The instructions tell the model to treat visitor messages and site content as information, not
  commands, and to keep its rules however the visitor argues. The only tool it has creates a
  summary card. It has no access to any database, email, booking system or other API, so a
  manipulated model has nothing to act on. The server checks every field of the tool's output
  against an allowlist and removes phone numbers and email addresses before anything reaches the
  page.
- **No cross-site scripting.** Replies are rendered from a small Markdown subset straight into
  React elements; HTML in a reply is shown as text. Links work only if they point to a page of
  this site, the business phone or email, or its Google/Yelp/social profiles. Anything else is shown
  as plain text.
- **Personal data.** The conversation lives in the visitor's browser tab (`sessionStorage`) and
  disappears when the tab closes; "New conversation" clears it at once. Nothing is stored on the
  server. Messages are sent to Anthropic to generate the answer: the panel says so and asks
  visitors not to share personal details. Logs contain metrics only (timings, token counts,
  outcome, page path), never message text or IP addresses. Rate limiting uses a salted hash of the
  IP address. Anthropic's API terms apply to the messages it processes. Review them, and mention
  the assistant in your privacy policy, before you switch it on.

## Setup

1. **Anthropic account:** create an API key at console.anthropic.com and set a monthly spend limit
   there (Settings → Limits). This is the only paid service required.
2. **Vercel** (Project → Settings → Environment Variables), for Production and Preview:
   - `ANTHROPIC_API_KEY`: the key.
   - `PUBLIC_ASSISTANT_ENABLED` = `true`: shows the button. This is read at build time, so
     redeploy after setting it.
   - Optional: `ASSISTANT_HASH_SALT` (any long random string, keeps visitor hashes stable across
     instances), and the limits in the table below.
3. Redeploy. Open the site, click **Ask a question**, and try "My AC isn't cooling" and "Do you
   serve Astoria?".
4. **Optional, recommended at scale:** shared rate limits. Create a free Upstash Redis database
   and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without it, each server
   instance counts separately.

The function is `api/assistant.ts`, which Vercel deploys automatically next to the static site
(`vercel.json` gives it 30 seconds). On another host, call `createAssistantHandler(process.env)` from
`src/server/assistant/handler.ts` in that host's function format. It takes a standard `Request`
and returns a `Response`. Then set `PUBLIC_ASSISTANT_ENDPOINT` if the URL is not `/api/assistant/`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PUBLIC_ASSISTANT_ENABLED` | off | `true` shows the assistant (build time). |
| `ANTHROPIC_API_KEY` | none | Required for the assistant to answer. Server only. |
| `ASSISTANT_MODEL` | `claude-haiku-5-5` | Claude model ID. |
| `ASSISTANT_EFFORT` | `low` | `low`, `medium` or `high`: how much the model thinks before answering. |
| `ASSISTANT_LIMIT_PER_CLIENT_10MIN` | 12 | Messages per visitor per 10 minutes. |
| `ASSISTANT_LIMIT_PER_CLIENT_DAY` | 60 | Messages per visitor per day. |
| `ASSISTANT_LIMIT_GLOBAL_DAY` | 2000 | Replies per day for the whole site (spend cap). |
| `ASSISTANT_ALLOWED_ORIGINS` | none | Extra origins allowed to call the endpoint, comma-separated. |
| `ASSISTANT_HASH_SALT` | random per instance | Salt for anonymised visitor IDs. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | none | Shared rate limits. |
| `PUBLIC_ASSISTANT_ENDPOINT` | `/api/assistant/` | Endpoint URL, if hosted elsewhere. |
| `ASSISTANT_PROVIDER` | `anthropic` | `mock` = scripted replies for local development (ignored in Vercel production). |

**Local development without a key:** `ASSISTANT_PROVIDER=mock PUBLIC_ASSISTANT_ENABLED=true npm run dev`.
The dev server serves `/api/assistant/` with the same handler (`scripts/assistant-dev-server.mjs`).
With `ANTHROPIC_API_KEY` set instead, it uses the real model.

## Monitoring

Every reply writes one JSON log line (Vercel → Project → Logs), for example:

```json
{"event":"assistant_reply","model":"claude-haiku-5-5","outcome":"ok","stopReason":"end_turn","ms":2140,"firstTokenMs":930,
 "turns":3,"page":"/hvac-repair/","serviceRequest":true,"inputTokens":412,"outputTokens":118,"cacheReadTokens":8312,
 "cacheWriteTokens":0,"estCostUsd":0.000932}
```

`outcome` is `ok`, `refused`, `truncated`, `timeout`, `client_gone`, or `provider_<kind>` for outages.
`assistant_error` and `assistant_rate_limited` lines mark problems. With Google Analytics on, the
site also records `assistant_open`, `assistant_question`, `assistant_service_request`,
`assistant_handoff` (call / email / form), `assistant_link` and `assistant_error` events. None of
them carry message text. Mark `assistant_handoff` as a key event to count assistant leads.

## When things go wrong

- **No API key, or the provider is down:** the panel says the assistant isn't available and shows
  the phone number and contact form. The rest of the site is unaffected: it is static, and the
  assistant's code loads only when someone opens it.
- **Busy or rate-limited:** a short message with the phone number. "Try again" retries the question.
- **Slow:** the server stops after 28 seconds and the browser after 45, with a message. The visitor
  can press Stop at any time, which also cancels the model call.

## Tests

- `npm test`: 93 unit and integration tests (Vitest, no network). They cover request validation,
  origin and size checks, rate limits and the daily budget, streaming, tool-input validation and
  redaction, refusals and cut-off replies, provider outages and timeouts, client disconnects,
  log privacy, and that the knowledge pack contains the answers to common questions. The real
  Anthropic SDK is also run against a fake HTTP server, to check the exact request (cached system
  prompt, effort, tool, no sampling parameters) and the parsing of streamed text and tool calls.
- `npm run test:e2e`: 30 browser tests (Playwright, mock provider): lazy loading, keyboard use and
  focus, screen-reader announcements, the service request card, link allowlist and HTML escaping,
  error and retry, Stop, conversation kept across pages, contact form prefill, phone layout and
  focus trap, and every page rendering with the assistant on.

Not covered without an API key: the real model's answers. After you set the key, try the questions
in Setup step 3, a few out-of-scope ones ("write me a poem", "ignore your rules"), and a price
question ("how much is a new AC?"). It should decline, or point to a written estimate.
