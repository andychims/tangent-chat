# Fork Chat

A chat interface for LLMs with a key differentiator: you can highlight any text in a response and open a parallel **sub-chat** about that specific passage. Multiple sub-chats can be open simultaneously, each anchored to a highlighted excerpt, all sharing the parent conversation as context.

## The core idea

Standard chat forces one thread. When reading a long LLM response — research, analysis, a technical explanation — you often have questions about several different parts at once. Fork Chat treats the LLM's response as an annotatable surface. Highlight a phrase, click Fork, and a side panel opens a focused chat about just that passage, while the main conversation continues independently.

This interaction pattern is similar to Google Docs inline comments, but applied to live LLM output.

## What's been built

A fully functional single-page app (`index.html`) + one serverless API route (`api/chat.js`). No framework, no build step. Vanilla HTML/CSS/JS on the frontend, Vercel serverless functions on the backend.

**Features:**
- Main chat with any model via OpenRouter (Claude, GPT-4o, Gemini, etc.)
- Text selection on assistant responses → "Fork" popover → sub-chat card in right panel
- Highlighted text gets a color-coded underline; hovering it glows the corresponding card
- Sub-chats receive: full parent conversation as context + the highlighted excerpt in system prompt
- Sub-chat card sizing: collapsed / mid (default) / full-height (collapses others)
- Click the card header to cycle through sizes
- Close a sub-chat → moves to a "Closed" section (dimmed, recoverable)
- Reopen from closed section or permanently delete
- Dark mode UI, dark scrollbars, markdown rendering (via marked.js CDN)
- Streaming SSE responses for both main chat and all sub-chats
- Model selector: Claude Sonnet 4.6, Claude Opus 4.7, Claude Haiku 4.5, GPT-4o, GPT-4o mini, Gemini 2.5 Pro

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | No build tooling, fast iteration, easy to modify |
| Markdown | marked.js (CDN) | Zero deps, good enough |
| API | Vercel serverless functions | Same as hosting, no extra infra |
| LLM routing | OpenRouter | Single API key → all major models; avoids per-provider key management |
| Streaming | SSE (text/event-stream) | Simple, works well with Vercel serverless |

OpenRouter uses the OpenAI-compatible `/v1/chat/completions` endpoint with `stream: true`. The API route is a thin proxy that injects the system prompt (including parent context + excerpt for sub-chats) and relays the SSE stream to the browser.

No npm dependencies are needed — Node 18+ (which Vercel uses) has native `fetch`.

## File structure

```
forkchat/
  api/
    chat.js          # Serverless function — OpenRouter proxy, handles both main + sub-chat
  index.html         # Entire frontend — layout, CSS, JS state, DOM rendering
  package.json       # Declares "type": "module" for ESM; no dependencies
  vercel.json        # cleanUrls + trailingSlash config
  .env.example       # Template for required env vars
  .env.local         # Local secrets (gitignored)
  README.md
```

## Running locally

```bash
# 1. Copy env template and fill in your OpenRouter key
cp .env.example .env.local
# edit .env.local: OPENROUTER_API_KEY=sk-or-v1-...

# 2. Start the dev server (requires Vercel CLI)
npx vercel dev --listen 3002

# vercel dev doesn't always auto-load .env.local — if you see
# "OPENROUTER_API_KEY not configured", prefix the command:
export $(cat .env.local | xargs) && npx vercel dev --listen 3002

# 3. Open http://localhost:3002
```

You can get an OpenRouter API key at openrouter.ai. It gives access to Claude, GPT-4o, Gemini, and many others through a single key.

## What's next

### 1. Vercel deployment
```bash
npx vercel          # follow prompts, link to a Vercel project
# Set OPENROUTER_API_KEY in Vercel dashboard → Project → Settings → Environment Variables
npx vercel --prod   # deploy to production
```
The app is already structured for Vercel (static file + api/ functions). Should work on first deploy.

### 2. Authentication
Recommended: **Clerk** (clerk.com)
- Drop-in auth with Google/GitHub OAuth or email
- Free tier covers personal use
- Add `<script>` tag to index.html, wrap the app, check session in the API route

Alternatively: Supabase Auth (if also using Supabase for persistence).

### 3. Persistence
Recommended: **Supabase** (supabase.com) — Postgres with a JS client

Proposed schema:
```sql
-- Conversations (main chat threads)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,           -- from auth
  model text not null,
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sub-chats (anchored to a conversation)
create table sub_chats (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  excerpt text not null,           -- the highlighted text
  color jsonb not null,            -- {border, highlight} color pair
  messages jsonb not null default '[]',
  position int,                    -- display order
  closed boolean default false,
  created_at timestamptz default now()
);
```

The frontend currently holds all state in JS memory. To add persistence:
1. On each message sent (main or sub-chat), POST to a new `/api/save` route that upserts to Supabase
2. On load, GET `/api/conversations` to show a sidebar of past sessions
3. On session select, hydrate `mainMessages`, `subChats`, and re-render

### 4. Conversation sidebar
Once persistence exists, add a left sidebar (collapsible) listing past conversations. Clicking one loads it. The layout would shift to a three-panel view: sidebar | main chat | sub-chats.

## Key implementation notes

**Sub-chat context injection** (`api/chat.js`): When `parentContext` and `excerpt` are in the request body, the system prompt includes the full parent conversation transcript and the highlighted text. This gives sub-chat responses meaningful context without the user having to re-explain.

**Text selection + DOM marking**: When the user clicks Fork, `range.extractContents()` wraps the selection in a `<mark>` element with a color-coded background. This modifies the live DOM inside the assistant message bubble. If the selection spans multiple HTML elements (e.g., bold + normal text), the fragment is wrapped correctly. The `mark` element gets `mouseenter`/`mouseleave` listeners that glow the corresponding right-panel card.

**Size state machine**: Each sub-chat has `size: 'collapsed' | 'mid' | 'full'`. Going full saves all other cards' sizes and collapses them; leaving full restores them. This state is tracked in the JS `sc` objects, not in the DOM.

**Closed cards**: Closed cards are moved below a `#closed-divider` element in the DOM but remain in the `subChats` array (with `sc.closed = true`). Reopening moves them back above the divider and restores their header controls.

**OpenRouter model IDs** (as of May 2026): `anthropic/claude-sonnet-4.6`, `anthropic/claude-opus-4.7`, `anthropic/claude-haiku-4.5`, `openai/gpt-4o`, `openai/gpt-4o-mini`, `google/gemini-2.5-pro-preview`. Check openrouter.ai/models for current slugs if these stop working.
