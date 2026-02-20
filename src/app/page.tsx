import { agentConfig } from '@/lib/agent/config';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl">
          🐬
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">
          {agentConfig.name}
        </h1>
        <p className="mb-8 text-lg text-slate-400">
          {agentConfig.description} — powered by{' '}
          <span className="font-medium text-emerald-400">Finclaw</span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-left backdrop-blur-sm">
            <h2 className="mb-2 text-sm font-semibold text-emerald-400">RAG Knowledge Base</h2>
            <p className="text-sm text-slate-400">
              Semantic search powered by Voyage AI embeddings and Supabase pgvector.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-left backdrop-blur-sm">
            <h2 className="mb-2 text-sm font-semibold text-emerald-400">Session Memory</h2>
            <p className="text-sm text-slate-400">
              Persistent conversation history with multi-channel support.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-left backdrop-blur-sm">
            <h2 className="mb-2 text-sm font-semibold text-emerald-400">Pluggable Skills</h2>
            <p className="text-sm text-slate-400">
              Drop in SKILL.md files to extend agent capabilities.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-left backdrop-blur-sm">
            <h2 className="mb-2 text-sm font-semibold text-emerald-400">Custom Tools</h2>
            <p className="text-sm text-slate-400">
              Add Zod-validated tools that query your own databases.
            </p>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Edit <code className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-400">src/app/page.tsx</code> to get started.
        </p>
      </div>
    </main>
  );
}
