import { agentConfig } from '@/lib/agent/config';

export async function GET() {
  return Response.json({
    status: 'ok',
    agent: agentConfig.name,
    model: agentConfig.defaultModel,
    timestamp: new Date().toISOString(),
  });
}
