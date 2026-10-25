# Website assistant

An "Ask a question" assistant on every page. It answers visitors' questions from the site's own
content, and when someone needs service it builds a **service request** they can send by phone,
email or the contact form.

It has three setups:

| | **Free mode** (default) | **Free AI** (Google Gemini) | **Paid AI** (Anthropic Claude) |
| --- | --- | --- | --- |
| Cost | **$0**, no account | **$0** on Gemini's free tier | About $0.0005 per answer |
| Setup | None | A Google AI Studio key | An Anthropic key and spend limit |
| Server | None: runs in the browser | One Vercel Function | One Vercel Function |
| Privacy | Typing never leaves the browser | Sent to Google, which may use free-tier messages to improve its products | Sent to Anthropic |
| Answers | Best-matching passage from the site, word for word | Written replies from the site's pages | Written replies from the site's pages |
| Limits | None | Google's free quota (small, set by Google, changes over time) | Your budget |

In both AI setups the free mode is the safety net. When the AI can't answer (the free quota is used up,
Google or Anthropic is down, no key is set), the visitor gets the site answer instead of an error.

**The assistant is switched off** (the owner chose AI search visibility instead; see the README).
`PUBLIC_ASSISTANT_ENABLED=true` shows it, and `PUBLIC_ASSISTANT_MODE=ai` switches it to AI
answers (see [Free AI with Google Gemini](#free-ai-with-google-gemini)).

## Free mode (default)

- **Answers from the site's pages.** A keyword search (BM25, the method classic search engines use)
  over every section of every page, with HVAC synonyms and everyday phrasing: "AC blowing warm
  air" finds *Air conditioning not cooling*, "furnace won't turn on" finds *Heating system not
  working*, "icing up" finds *Frozen evaporator coils*. The answer is the site's own text with a
  link to the page. It never makes anything up. If nothing matches well enough, it says it couldn't
  find that on the website and gives the phone number, email and contact form.
- **Fixed answers for what matters most:** gas smell or carbon monoxide alarm (leave the building, call
  911 or the gas utility), emergencies (phone number first, then an emergency request), phone and
  email, office hours, brands (from the logos on the site), and service areas down to the
  neighborhood ("Do you serve Astoria?" → yes, Queens).
- **Guided service request.** "Request a visit" asks, with buttons: what's needed, the system, the
  area, timing and home or business. Then the visitor can describe the problem in their own words.
  Typed answers work too. The result is the same summary card as in AI mode (Call, Email this
  request, Use the contact form), and nothing is sent until the visitor does it. Phone numbers and
  email addresses typed into the description are removed.
- **Updating what it knows:** same as AI mode: edit the page copy, `npm run build`, commit.

The search code and the site text (about 27 KB compressed) load only when a visitor opens the
assistant. Code: `src/lib/assistant-local.ts`.

## Free AI with Google Gemini

1. Go to **aistudio.google.com**, sign in with a Google account, and choose **Get API key** →
   **Create API key**. Don't add a billing account (credit card) to that Google Cloud project:
   once billing is linked, Google charges for usage, including what used to be free.
2. In Vercel (Project → Settings → Environment Variables), for Production and Preview, set:
   - `GEMINI_API_KEY`: the key
   - `PUBLIC_ASSISTANT_MODE`: `ai`
3. Redeploy (`PUBLIC_ASSISTANT_MODE` is read at build time). The panel header then says
   "AI assistant (Google Gemini)", and its note tells visitors their messages go to Google.

Things to know:
- **Privacy.** On the free tier, Google may use prompts and answers to improve its products (check
  Google's current Gemini API terms). Mention it in your privacy policy. The panel asks visitors not
  to share personal details. The assistant never asks for them, and contact details are removed from
  service requests.
- **Limits.** Google sets the free quota per project and changes it over time; Google AI Studio shows
  the current numbers. When it runs out, the site answers take over until it resets (midnight
  Pacific time). Our own daily cap (`ASSISTANT_LIMIT_GLOBAL_DAY`) also applies.
- **Model.** The default, `gemini-flash-lite-latest`, is Google's name for its current Flash-Lite
  model, which has the most generous free limits. Set `ASSISTANT_MODEL` (for example to a specific
  `gemini-…-flash` ID from Google's model list) to pin a model.
- Code: `src/server/assistant/provider-gemini.ts`, using Google's official `@google/genai` SDK. Not yet
  run against Google's live service: the build environment couldn't reach it. Try a few questions after
  setting the key (see Setup step 3 below).

## Paid AI (Anthropic Claude) and how AI mode works

Claude writes each reply, combining several pages, following up on earlier messages, and gathering
the service request in conversation. It stays limited to the website's content and rules, and costs
about $0.0005 per answer. With both keys set, Gemini is used unless `ASSISTANT_PROVIDER=anthropic`.
The architecture, security and monitoring below apply to both AI setups. Swap "Anthropic" for "Google"
when using Gemini.

### Architecture

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

### Security and privacy

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

### Setup

1. **Anthropic account:** create an API key at console.anthropic.com and set a monthly spend limit
   there (Settings → Limits). This is the only paid service AI mode needs.
2. **Vercel** (Project → Settings → Environment Variables), for Production and Preview:
   - `ANTHROPIC_API_KEY`: the key.
   - `PUBLIC_ASSISTANT_MODE` = `ai`: switches the assistant to AI mode. This is read at build
     time, so redeploy after setting it.
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
| `PUBLIC_ASSISTANT_ENABLED` | on | `false` hides the assistant (build time). |
| `PUBLIC_ASSISTANT_MODE` | `site` (free) | `ai` uses the AI server function (build time). |
| `GEMINI_API_KEY` | none | Google Gemini key (free tier). Used first when set. Server only. |
| `ANTHROPIC_API_KEY` | none | Anthropic Claude key (paid). Server only. |
| `ASSISTANT_PROVIDER` | automatic | `gemini` or `anthropic` to choose when both keys are set; `mock` = scripted replies for local development (ignored in Vercel production). |
| `ASSISTANT_MODEL` | `gemini-flash-lite-latest` / `claude-haiku-5-5` | Model ID for the chosen provider. |
| `ASSISTANT_EFFORT` | `low` | Claude only: `low`, `medium` or `high`, how much it thinks before answering. |
| `ASSISTANT_LIMIT_PER_CLIENT_10MIN` | 12 | Messages per visitor per 10 minutes. |
| `ASSISTANT_LIMIT_PER_CLIENT_DAY` | 60 | Messages per visitor per day. |
| `ASSISTANT_LIMIT_GLOBAL_DAY` | 2000 | Replies per day for the whole site (spend cap). |
| `ASSISTANT_ALLOWED_ORIGINS` | none | Extra origins allowed to call the endpoint, comma-separated. |
| `ASSISTANT_HASH_SALT` | random per instance | Salt for anonymised visitor IDs. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | none | Shared rate limits. |
| `PUBLIC_ASSISTANT_ENDPOINT` | `/api/assistant/` | Endpoint URL, if hosted elsewhere. |

**Local development of AI mode without a key:** `ASSISTANT_PROVIDER=mock PUBLIC_ASSISTANT_MODE=ai npm run dev`.
The dev server serves `/api/assistant/` with the same handler (`scripts/assistant-dev-server.mjs`).
With `ANTHROPIC_API_KEY` set instead, it uses the real model.

### Monitoring

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

### When things go wrong

- **No API key, free quota used up, rate-limited, or the provider is down:** the visitor gets the
  free site answer instead, with no error. The rest of the site is unaffected: it is static, and the
  assistant's code loads only when someone opens it.
- **The AI stops partway through a reply:** the partial reply stays, with a short note and a "Try again"
  button.
- **Slow:** the server stops after 28 seconds and the browser after 45, with a message. The visitor
  can press Stop at any time, which also cancels the model call.

## Tests

- `npm test`: 126 unit and integration tests (Vitest, no network). Free mode: correct answers
  to everyday questions (symptoms, filters, costs, permits, warranty, areas, brands, hours), "not on
  our website" for off-topic questions, safety and emergency replies, the guided request and
  redaction. AI mode: request validation,
  origin and size checks, rate limits and the daily budget, streaming, tool-input validation and
  redaction, refusals and cut-off replies, provider outages and timeouts, client disconnects,
  log privacy, and that the knowledge pack contains the answers to common questions. The real
  Anthropic SDK is also run against a fake HTTP server, to check the exact request (cached system
  prompt, effort, tool, no sampling parameters) and the parsing of streamed text and tool calls. Google's
  SDK gets the same treatment: the request it sends, text and function calls, thinking text skipped,
  safety blocks, quota errors (no retries, so the site answer comes quickly), and provider choice.
- `npm run test:e2e`: 37 browser tests (Playwright). Free mode: answers, the guided request by
  buttons and keyboard, contact form prefill, no server calls, and every page rendering. AI mode
  (mock provider): lazy loading, keyboard use and
  focus, screen-reader announcements, the service request card, link allowlist and HTML escaping,
  site answers when the AI fails, the privacy note naming the AI service, Stop, conversation kept across pages, contact form prefill, phone layout and
  focus trap.

Not covered without an API key: the real model's answers in AI mode. After you set the key, try the questions
in Setup step 3, a few out-of-scope ones ("write me a poem", "ignore your rules"), and a price
question ("how much is a new AC?"). It should decline, or point to a written estimate.
