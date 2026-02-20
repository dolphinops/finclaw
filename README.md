# 🐬 Finclaw

A generic, white-label AI agent starter kit built with **Next.js 15**, **Supabase**, and **Voyage AI**.

Drop-in a RAG-powered assistant into any project in minutes.

---

## Features

- **RAG Knowledge Base** — Semantic search with Voyage AI embeddings + Supabase pgvector
- **Session Memory** — Persistent conversation history with multi-channel support
- **Pluggable Skills** — Drop in `SKILL.md` files to extend agent capabilities
- **Custom Tools** — Add Zod-validated tools that query your own databases
- **Three-Tier Access** — Internal (admin), Portal (authenticated), Public (visitor)
- **Streaming Chat UI** — Pre-built floating chat widgets (authenticated + public)
- **Rate Limiting** — Built-in per-IP rate limiting for all endpoints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| LLM | Anthropic Claude via Vercel AI SDK |
| Embeddings | Voyage AI (`voyage-3-lite`) |
| Database | Supabase (Postgres + pgvector + Auth) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Language | TypeScript (strict) |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/dolphinops/finclaw.git
cd finclaw
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your keys:

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (⚠️ server only) |
| `VOYAGE_API_KEY` | [dash.voyageai.com](https://dash.voyageai.com/) |

### 3. Run Supabase migrations

Apply the migrations in order via the Supabase dashboard SQL editor or CLI:

```bash
# If using Supabase CLI:
supabase db push
```

Migrations create these tables:
- `profiles` — User profiles with role-based access
- `agent_workspace_files` — Agent personality files (IDENTITY.md, SOUL.md)
- `agent_settings` — Agent configuration (model, skills)
- `agent_knowledge` — RAG knowledge base with vector embeddings
- `agent_sessions` / `agent_messages` — Conversation memory

### 4. Start dev server

```bash
npm run dev
# → http://localhost:3099
```

---

## Project Structure

```
src/
├── app/
│   ├── api/agent/
│   │   ├── route.ts          # Authenticated chat endpoint
│   │   ├── public/route.ts   # Public chat endpoint (no auth)
│   │   └── health/route.ts   # Health check
│   ├── layout.tsx
│   ├── page.tsx              # Landing page
│   └── globals.css
├── components/
│   ├── agent-chat.tsx        # Authenticated floating chat widget
│   └── public-chat.tsx       # Public-facing chat widget
├── lib/
│   ├── agent/
│   │   ├── config.ts         # Agent identity & settings
│   │   ├── embeddings.ts     # Voyage AI embeddings + knowledge search
│   │   ├── memory.ts         # Session & message persistence
│   │   ├── tools.ts          # Tool registry (add your own here)
│   │   └── skills-loader.ts  # SKILL.md file parser
│   ├── rate-limit.ts         # In-memory rate limiter
│   └── supabase.ts           # Supabase client helpers
├── skills/
│   └── greeting/SKILL.md     # Example skill
supabase/
└── migrations/               # Database schema
docs/
└── CUSTOMIZATION.md          # How to customize everything
```

---

## Customization

See [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for detailed guides on:

- Changing the agent name and personality
- Adding custom tools
- Creating skills
- Swapping LLM providers (OpenAI, Google, etc.)
- Customizing the chat UI

---

## API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/agent` | Bearer JWT | Authenticated chat with full tool access |
| `POST /api/agent/public` | None | Public chat with restricted knowledge |
| `GET /api/agent/health` | None | Health check / status |

---

## License

MIT — built by [DolphinOps](https://dolphinops.com)
