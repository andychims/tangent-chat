# Tangent — Todo

## Infra / Shipping

- [ ] **Vercel deployment** — `npx vercel --prod`, set `OPENROUTER_API_KEY` in Vercel dashboard. Already structured for it; should work on first deploy.
- [ ] **Authentication** — Recommended: Clerk (clerk.com). Drop-in Google/GitHub OAuth, free tier. Add `<script>` to index.html, wrap the app, validate session in `api/chat.js`.
- [ ] **Persistence** — Recommended: Supabase. Schema already designed in README (conversations + sub_chats tables). Add `/api/save` upsert + `/api/conversations` list route. Hydrate state on load.

## Product

- [ ] **Conversation sidebar** — Left panel listing past sessions (depends on persistence). Three-panel layout: sidebar | main chat | sub-chats.
- [ ] **Better name than "ForkChat"** — See name ideas below.
- [ ] **Marketing page** — Static page that markets the product and links to a live (static) demo UX. No live LLM calls. Pre-filled with 3 forked chat conversations. If a user types and submits, show placeholder response like "Your forked chat response goes here." Should be self-contained HTML (same no-build-step approach as the app).

## Name ideas

The core concept: highlight text in an LLM response → open a parallel sub-chat anchored to that passage. Think margin notes meets live chat.

- **Gloss** — a "gloss" is a marginal annotation; clean, literary, memorable
- **Marginalia** — margin notes; evocative but maybe too obscure
- **Tangent** — going off on tangents from a conversation; very intuitive
- **Aside** — theatrical asides; conversations happening in parallel
- **Annotalk** — annotate + talk; descriptive but a bit forced
- **Folio** — document/page vibes; sophisticated
- **Threadfork** — git metaphor, clear but technical
- **Splinter** — splitting off; edgy, memorable
- **Diverge** — diverging paths; clean domain name potential
- **Ripple** — ripple effects from a conversation
- **Chorus** — multiple voices/threads at once
