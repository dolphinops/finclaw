import { createClient } from '@supabase/supabase-js';
import { agentConfig } from './config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ═══════════════════════════════════════════════════════════════════
// ACCESS TIERS — Three-tier security model
// ═══════════════════════════════════════════════════════════════════
//
// Tier 1: INTERNAL (admins / staff)
//   → Full unrestricted access to ALL knowledge sources
//
// Tier 2: PUBLIC (unauthenticated visitors)
//   → Only public FAQs, service descriptions, and marketing content
//
// Tier 3: PORTAL (authenticated non-admin users)
//   → Their own scoped data + public content
//
// ═══════════════════════════════════════════════════════════════════

export type AccessTier = 'internal' | 'public' | 'portal';

/** Sources that contain confidential data — admin only */
export const CONFIDENTIAL_SOURCES = [
  'internal',
  'private',
  'admin',
] as const;

/** Sources safe for public/unauthenticated visitors */
export const PUBLIC_SOURCES = ['faq', 'service', 'public'] as const;

/** Sources accessible to authenticated portal users */
export const PORTAL_SOURCES = ['faq', 'service', 'public', 'user_scoped'] as const;

/**
 * Get the correct source filter for a given access tier.
 */
export function getSourceFilter(
  tier: AccessTier
): { excludeSources?: string[]; allowedSources?: string[] } | undefined {
  switch (tier) {
    case 'internal':
      return undefined; // Full access
    case 'public':
      return { allowedSources: [...PUBLIC_SOURCES] };
    case 'portal':
      return { allowedSources: [...PORTAL_SOURCES] };
    default:
      return { allowedSources: [...PUBLIC_SOURCES] };
  }
}

/**
 * Generate an embedding vector for a given text using Voyage AI.
 * Falls back to a zero-vector if VOYAGE_API_KEY is not set (dev mode).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const voyageApiKey = process.env.VOYAGE_API_KEY;

  if (!voyageApiKey) {
    console.warn('[embeddings] VOYAGE_API_KEY not set. Using zero-vector fallback.');
    return new Array(agentConfig.embeddingDimensions).fill(0);
  }

  try {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${voyageApiKey}`,
      },
      body: JSON.stringify({
        model: agentConfig.embeddingModel,
        input: [text],
        input_type: 'document',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Voyage AI API error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('[embeddings] Error generating embedding:', error);
    return new Array(agentConfig.embeddingDimensions).fill(0);
  }
}

/**
 * Generate an embedding for search queries (uses 'query' input_type).
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const voyageApiKey = process.env.VOYAGE_API_KEY;

  if (!voyageApiKey) {
    console.warn('[embeddings] VOYAGE_API_KEY not set. Using zero-vector fallback.');
    return new Array(agentConfig.embeddingDimensions).fill(0);
  }

  try {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${voyageApiKey}`,
      },
      body: JSON.stringify({
        model: agentConfig.embeddingModel,
        input: [text],
        input_type: 'query',
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('[embeddings] Error generating query embedding:', error);
    return new Array(agentConfig.embeddingDimensions).fill(0);
  }
}

/**
 * Upsert a knowledge document with its embedding.
 */
export async function upsertKnowledge(doc: {
  title: string;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  const embedding = await generateEmbedding(`${doc.title}\n\n${doc.content}`);

  const { data, error } = await supabase
    .from('agent_knowledge')
    .insert({
      title: doc.title,
      content: doc.content,
      source: doc.source || 'manual',
      metadata: doc.metadata || {},
      embedding: JSON.stringify(embedding),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[embeddings] Error upserting knowledge:', error);
    throw error;
  }

  return data;
}

/**
 * Perform semantic similarity search against the knowledge base.
 */
export async function searchKnowledge(
  query: string,
  matchCount = 5,
  threshold = 0.7,
  options?: { excludeSources?: string[]; allowedSources?: string[] }
) {
  const queryEmbedding = await generateQueryEmbedding(query);

  const { data, error } = await supabase.rpc('match_knowledge', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: matchCount + 10,
  });

  if (error) {
    console.error('[embeddings] Error searching knowledge:', error);
    return [];
  }

  let results = data || [];

  // Apply source filtering
  if (options?.allowedSources && options.allowedSources.length > 0) {
    results = results.filter((r: { source: string }) =>
      options.allowedSources!.includes(r.source)
    );
  } else if (options?.excludeSources && options.excludeSources.length > 0) {
    results = results.filter((r: { source: string }) =>
      !options.excludeSources!.includes(r.source)
    );
  }

  return results.slice(0, matchCount);
}
