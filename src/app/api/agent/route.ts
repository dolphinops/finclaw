import { createClient } from '@supabase/supabase-js';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import { loadActiveSkills } from '@/lib/agent/skills-loader';
import { buildAgentTools } from '@/lib/agent/tools';
import { getOrCreateSession, saveMessage } from '@/lib/agent/memory';
import { agentConfig } from '@/lib/agent/config';

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------
const rateLimiter = createRateLimiter({
  windowMs: agentConfig.rateLimitWindowMs,
  max: agentConfig.rateLimitMax,
});

// ---------------------------------------------------------------------------
// Supabase (service role for agent operations)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const maxDuration = 60;

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

  // -- Auth validation --
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // -- Get user profile --
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const userRole = (profile?.role as 'admin' | 'user') || 'user';
  const userName = profile?.full_name || 'User';

  // -- Parse messages --
  let body: { messages: Array<Record<string, unknown>>; sessionId?: string };
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
    // 1. Fetch workspace files & settings
    const [{ data: settings }, { data: files }] = await Promise.all([
      supabase.from('agent_settings').select('*').single(),
      supabase.from('agent_workspace_files').select('name, content'),
    ]);

    const getFileContent = (name: string) =>
      files?.find((f: { name: string; content: string }) => f.name === name)?.content || '';

    // 2. Load active skills
    const activeSkills = settings?.enabled_skills || [];
    const loadedSkills = await loadActiveSkills(activeSkills);
    const skillInstructions = loadedSkills
      .map((s) => `\n<skill>\n### ${s.name}\n${s.instructions}\n</skill>`)
      .join('\n');

    // 3. Build system prompt
    const securityContext =
      userRole === 'admin'
        ? `[SECURITY CLEARANCE: ADMIN]\nYou have full authorization to view all data. You are speaking to ${userName}, an administrator.`
        : `[SECURITY CLEARANCE: USER]\nYou are speaking to ${userName}. Only share data they are authorized to see.`;

    const systemPrompt = `
You are ${agentConfig.name}, ${agentConfig.description}.

<identity>
${getFileContent('IDENTITY.md')}
</identity>

<soul>
${getFileContent('SOUL.md')}
</soul>

<user_context>
${securityContext}
Email: ${profile?.email || 'Unknown'}
User ID: ${user.id}
</user_context>

<active_skills>
${skillInstructions}
</active_skills>

Please follow all instructions within your active skills and format responses clearly using Markdown.
`;

    // -- Session persistence --
    const session = await getOrCreateSession(user.id, 'web', body.sessionId);

    // Save the latest user message
    const lastUserMsg = body.messages
      .filter((m: Record<string, unknown>) => m.role === 'user')
      .pop();
    if (lastUserMsg) {
      await saveMessage(session.id, {
        role: 'user',
        content: lastUserMsg.content as string,
      });
    }

    // -- Stream via Anthropic Claude --
    const result = streamText({
      model: anthropic(agentConfig.defaultModel),
      system: systemPrompt,
      messages: coreMessages as Parameters<typeof streamText>[0]['messages'],
      tools: buildAgentTools(user.id, userRole) as Parameters<typeof streamText>[0]['tools'],
      onFinish: async ({ text }) => {
        if (text) {
          await saveMessage(session.id, { role: 'assistant', content: text });
        }
      },
    });

    return result.toTextStreamResponse({
      headers: {
        'X-Agent-Session-Id': session.id,
      },
    });
  } catch (error) {
    console.error('[/api/agent] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal agent error' }), {
      status: 500,
    });
  }
}
