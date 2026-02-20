# Customization Guide

## Changing the Agent Identity

Set these in your `.env.local`:

```bash
AGENT_NAME="MyBot"
AGENT_DESCRIPTION="Your personal AI assistant"
```

The agent's personality is defined in two files stored in the `agent_workspace_files` table:

- **IDENTITY.md** — Who the agent is, what it does
- **SOUL.md** — Personality traits, communication style, values

Edit these via Supabase dashboard or a custom admin UI.

---

## Adding Custom Tools

Open `src/lib/agent/tools.ts` and add tools to the `buildAgentTools()` function:

```typescript
import { z } from 'zod';

// Inside buildAgentTools():
getRecentOrders: {
  description: 'Fetch recent orders from the database',
  parameters: z.object({
    limit: z.number().max(50).default(10).describe('Number of orders'),
    status: z.enum(['pending', 'shipped', 'delivered']).optional(),
  }),
  execute: async ({ limit, status }) => {
    // Your Supabase query here
    let query = supabase.from('orders').select('*').limit(limit);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return { error: error.message };
    return { data };
  },
},
```

---

## Creating Skills

Skills are markdown files that inject instructions into the agent's system prompt.

1. Create a directory: `src/skills/my-skill/`
2. Add a `SKILL.md` with YAML frontmatter:

```markdown
---
name: my-skill
description: Teaches the agent domain-specific behavior.
---

# My Skill

Instructions go here...
```

3. Enable the skill in `agent_settings.enabled_skills` (via Supabase).

---

## Changing the LLM Provider

Finclaw uses the [Vercel AI SDK](https://sdk.vercel.ai), which supports multiple providers:

```typescript
// src/app/api/agent/route.ts

// Anthropic (default)
import { anthropic } from '@ai-sdk/anthropic';
const model = anthropic('claude-sonnet-4-20250514');

// OpenAI
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4o');

// Google
import { google } from '@ai-sdk/google';
const model = google('gemini-2.5-flash');
```

Install the provider package (`npm i @ai-sdk/openai`) and swap the import.

---

## Customizing the Chat UI

Both `AgentChat` and `PublicChat` accept props:

```tsx
<AgentChat
  agentName="MyBot"
  subtitle="Always here to help"
  endpoint="/api/agent"
/>

<PublicChat
  title="Chat with us"
  welcomeMessage="Hi there! \ud83d\udc4b"
  welcomeSubtitle="Ask about our services."
/>
```

Colors use Tailwind CSS classes — search for `emerald` in the components to swap the accent color.
