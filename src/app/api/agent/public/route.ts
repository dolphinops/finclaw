import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import { searchKnowledge, getSourceFilter } from '@/lib/agent/embeddings';
import { agentConfig } from '@/lib/agent/config';
import { z } from 'zod';

// Stricter rate limiting for public endpoint
const rateLimiter = createRateLimiter({
  windowMs: agentConfig.rateLimitWindowMs,
  max: agentConfig.rateLimitPublicMax,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  // -- Rate limiting --
  const clientIp = getClientIp(req);
  const rateResult = rateLimiter.check(clientIp);
  if (!rateResult.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests', retryAfterMs: rateResult.resetMs }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rateResult.resetMs / 1000)),
        },
      }
    );
  }

  // -- No auth required for public endpoint --

  let body: { messages: Array<Record<string, unknown>> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
    });
  }

  const coreMessages = convertToModelMessages(body.messages);

  try {
    // Public-only knowledge search tool
    const publicTools = {
      searchPublicKnowledge: {
        description:
          'Search the public knowledge base for FAQs, services, and general information.',
        parameters: z.object({
          query: z.string().describe('The search query'),
        }),
        execute: async ({ query }: { query: string }) => {
          const sourceFilter = getSourceFilter('public');
          const results = await searchKnowledge(query, 5, 0.65, sourceFilter);

          if (results.length === 0) {
            return { message: 'No relevant information found.' };
          }

          return {
            results: results.map(
              (r: { title: string; content: string; similarity: number }) => ({
                title: r.title,
                content: r.content,
                relevance: Math.round(r.similarity * 100) + '%',
              })
            ),
          };
        },
      },
    };

    const systemPrompt = `
You are ${agentConfig.name}, a helpful assistant.
You are answering questions from a public website visitor.
Only use information from the public knowledge base.
Be friendly, concise, and helpful.
If you don't know something, say so and suggest they contact support.
Format responses using Markdown.
`;

    const result = streamText({
      model: anthropic(agentConfig.defaultModel),
      system: systemPrompt,
      messages: coreMessages as Parameters<typeof streamText>[0]['messages'],
      tools: publicTools as Parameters<typeof streamText>[0]['tools'],
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[/api/agent/public] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal agent error' }), {
      status: 500,
    });
  }
}
