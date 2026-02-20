/**
 * Finclaw Agent Configuration
 *
 * Central config for agent identity, model defaults, and runtime settings.
 * All values can be overridden via environment variables.
 */

export const agentConfig = {
  /** Display name for the agent */
  name: process.env.AGENT_NAME || 'Agent',

  /** Short description shown in the chat UI */
  description: process.env.AGENT_DESCRIPTION || 'AI Assistant',

  /** Default LLM model identifier */
  defaultModel: 'claude-sonnet-4-20250514',

  /** Embedding model (Voyage AI) */
  embeddingModel: 'voyage-3-lite',

  /** Embedding vector dimensions */
  embeddingDimensions: 1536,

  /** Rate limiting */
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 20,
  rateLimitPublicMax: Number(process.env.RATE_LIMIT_PUBLIC_MAX) || 10,
} as const;
