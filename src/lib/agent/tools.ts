import { z } from 'zod';
import { searchKnowledge, getSourceFilter } from './embeddings';

/**
 * Builds the tool registry for the agent.
 *
 * @param userId - the current user's ID
 * @param userRole - 'admin' | 'user'
 *
 * Add your own tools here following the same pattern:
 *   toolName: {
 *     description: '...',
 *     parameters: z.object({ ... }),
 *     execute: async (params) => { ... },
 *   }
 */
export function buildAgentTools(userId: string, userRole: string) {
  return {
    // ─── Knowledge Base / RAG Search ───────────────────────────────
    searchKnowledgeBase: {
      description:
        'Search the knowledge base for relevant documents using semantic similarity. ' +
        'Use this when the user asks general questions about your organization, services, or processes.',
      parameters: z.object({
        query: z.string().describe('The natural language search query'),
        limit: z
          .number()
          .max(10)
          .default(5)
          .optional()
          .describe('Max number of results'),
      }),
      execute: async ({ query, limit }: { query: string; limit?: number }) => {
        // Access tier: admins get full access, users get portal-scoped results
        const sourceFilter =
          userRole === 'admin'
            ? getSourceFilter('internal')
            : getSourceFilter('portal');

        const results = await searchKnowledge(
          query,
          limit || 5,
          0.65,
          sourceFilter
        );

        if (results.length === 0) {
          return {
            message: 'No relevant knowledge base articles found for this query.',
          };
        }

        return {
          results: results.map(
            (r: {
              title: string;
              content: string;
              source: string;
              similarity: number;
            }) => ({
              title: r.title,
              content: r.content,
              source: r.source,
              relevance: Math.round(r.similarity * 100) + '%',
            })
          ),
        };
      },
    },

    // ─── Example Tool (Template) ──────────────────────────────────
    // Uncomment and modify this to add your own tools:
    //
    // getRecentItems: {
    //   description: 'Fetch recent items from your database',
    //   parameters: z.object({
    //     limit: z.number().max(50).default(10).describe('Number of items'),
    //   }),
    //   execute: async ({ limit }: { limit: number }) => {
    //     // Your Supabase query here
    //     return { data: [] };
    //   },
    // },
  };
}
