import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentSession {
  id: string;
  user_id: string;
  channel: 'web' | 'slack' | 'api' | 'public';
  thread_id?: string;
  title?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

/**
 * Get or create a session for a user + channel combination.
 */
export async function getOrCreateSession(
  userId: string,
  channel: AgentSession['channel'] = 'web',
  sessionId?: string
): Promise<AgentSession> {
  if (sessionId) {
    const { data, error } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      return data as AgentSession;
    }
  }

  const { data, error } = await supabase
    .from('agent_sessions')
    .insert({ user_id: userId, channel })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return data as AgentSession;
}

/**
 * List recent sessions for a user.
 */
export async function listSessions(
  userId: string,
  limit = 20
): Promise<AgentSession[]> {
  const { data, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[memory] Error listing sessions:', error);
    return [];
  }

  return (data || []) as AgentSession[];
}

// ---------------------------------------------------------------------------
// Message History
// ---------------------------------------------------------------------------

/**
 * Load the message history for a session.
 */
export async function loadMessages(
  sessionId: string,
  limit = 50
): Promise<AgentMessage[]> {
  const { data, error } = await supabase
    .from('agent_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[memory] Error loading messages:', error);
    return [];
  }

  return (data || []) as AgentMessage[];
}

/**
 * Save a message to a session.
 */
export async function saveMessage(
  sessionId: string,
  message: Pick<AgentMessage, 'role' | 'content'> & { tool_calls?: Record<string, unknown>[] }
): Promise<AgentMessage | null> {
  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      tool_calls: message.tool_calls || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[memory] Error saving message:', error);
    return null;
  }

  // Update session timestamp
  await supabase
    .from('agent_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  return data as AgentMessage;
}

/**
 * Save a full conversation turn (user + assistant) in one call.
 */
export async function saveConversationTurn(
  sessionId: string,
  userContent: string,
  assistantContent: string,
  toolCalls?: Record<string, unknown>[]
): Promise<void> {
  const messages = [
    { session_id: sessionId, role: 'user', content: userContent },
    {
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls || null,
    },
  ];

  const { error } = await supabase.from('agent_messages').insert(messages);

  if (error) {
    console.error('[memory] Error saving conversation turn:', error);
  }

  await supabase
    .from('agent_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Update the session title.
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('agent_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) {
    console.error('[memory] Error updating session title:', error);
  }
}
