import { Header } from './components/Header'
import { InputBar } from './components/InputBar'
import { AgentPane } from './components/AgentPane'
import { SynthesisPanel } from './components/SynthesisPanel'
import { TelemetryRail } from './components/TelemetryRail'
import { VerdictTable } from './components/VerdictTable'
import { CitationsStrip } from './components/CitationsStrip'
import { AGENT_ORDER } from './lib/agents'
import { useArenaRun } from './lib/useArenaRun'

export default function App() {
  const {
    run, agents, verdicts, citations, telemetry,
    phase, error, isRunning, thinkingAgents, start,
  } = useArenaRun()

  return (
    <div className="relative z-10 min-h-screen">
      {/* ─── BLOCK 1 · HERO ─────────────────────────────────────────── */}
      <Header run={run} />

      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 space-y-12">

        {/* ─── INPUT BAR · the action affordance ──────────────────── */}
        <section>
          <InputBar
            onSubmit={start}
            isRunning={isRunning}
            phase={phase}
            error={error}
            defaultBrand={run.brand}
          />
        </section>

        {/* ─── BLOCK 2 · THE BRIEF (the product, the money shot) ─── */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="label-active mb-1">↓ The deliverable</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-fg-0 tracking-tight">
                Weekly AEO Brief
              </h2>
              <p className="text-sm text-fg-1 mt-1">
                Hand this to your content team Monday morning. Every recommendation survived 3-model debate.
              </p>
            </div>
            <span className="text-[11px] font-mono text-fg-2 hidden md:inline-block">
              {run.created_at.slice(0,10)} · {run.brand}
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-bg-1/60 backdrop-blur-sm shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="bg-gradient-to-r from-accent/10 via-transparent to-ok/10 px-6 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-y-2">
              <div className="flex items-center gap-3">
                <span className={`status-dot ${phase === 'done' ? 'active' : isRunning ? 'warn' : 'active'}`}></span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-1">
                  {phase === 'synthesizing' ? 'Writing the brief…' :
                   isRunning ? `Brief will render when ${phase.replace('_', '-')} completes…` :
                   'Brief generated'}
                </span>
              </div>
              <div className="flex items-center gap-x-4 gap-y-1 font-mono text-[11px] flex-wrap">
                <span className="text-fg-2">briefs/{run.created_at.slice(0,10)}-{run.brand.toLowerCase().replace(/\s+/g,'-')}.md</span>
                {run.total_cost_usd > 0 && (
                  <>
                    <span className="text-fg-3">·</span>
                    <span className="text-ok font-semibold">${run.total_cost_usd.toFixed(2)}</span>
                    <span className="text-fg-3">·</span>
                    <span className="text-fg-0">{Math.round(run.duration_ms / 1000)}s</span>
                    <span className="text-fg-3">·</span>
                    <span className="text-fg-0">{(run.total_tokens / 1000).toFixed(1)}k tok</span>
                  </>
                )}
              </div>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-fg-1 leading-relaxed whitespace-pre-wrap font-mono text-[12.5px] overflow-auto max-h-[760px] p-6 bg-black/30">
              {run.summary ?? (isRunning
                ? '> Brief will appear here when synthesis completes (~95s).'
                : 'Type a brand above and hit "Run debate" to generate a fresh brief.')}
            </div>
          </div>
        </section>

        {/* ─── BLOCK 3 · RUN ON YOUR BRAND CTA ──────────────────── */}
        <section className="rounded-xl border border-ok/20 bg-gradient-to-br from-ok/5 via-bg-1/60 to-accent/5 p-8 md:p-10">
          <div className="grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5">
              <div className="label-active mb-2">→ Repeatable</div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-fg-0 tracking-tight mb-3">
                Run ARENA on your brand
              </h2>
              <p className="text-sm text-fg-1 leading-relaxed">
                You bring your own OpenRouter key + Peec project. ARENA writes a fresh brief
                in <span className="text-ok font-semibold">~95 seconds for ~$0.08</span>. No SaaS. No login.
                Open source MIT.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="https://github.com/veloxe-ai/arena-veloxe"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-ok text-bg-0 font-mono text-xs font-semibold hover:shadow-glow-ok transition-shadow"
                >
                  → Clone on GitHub
                </a>
                <a
                  href="https://github.com/veloxe-ai/arena-veloxe#quick-start"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-white/15 text-fg-0 font-mono text-xs hover:bg-white/5 transition-colors"
                >
                  Quick-start guide
                </a>
              </div>
            </div>
            <div className="md:col-span-7">
              <ol className="space-y-3 mb-4 font-mono text-xs">
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-ok/15 border border-ok/30 text-ok flex items-center justify-center text-[10px] font-bold">1</span>
                  <span className="text-fg-1"><span className="text-fg-0">Clone</span> the repo · install deps · drop your OpenRouter key in <code className="text-ok">.env</code></span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-ok/15 border border-ok/30 text-ok flex items-center justify-center text-[10px] font-bold">2</span>
                  <span className="text-fg-1"><span className="text-fg-0">Pull your Peec data</span> — <code className="text-ok">bash scripts/peec-pull.sh "Your Brand" or_your_project_id</code></span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-ok/15 border border-ok/30 text-ok flex items-center justify-center text-[10px] font-bold">3</span>
                  <span className="text-fg-1"><span className="text-fg-0">Run the brief</span> — <code className="text-ok">npx tsx scripts/orchestrate.ts --brand "Your Brand" --peec-data peec-data-YYYY-MM-DD.json</code></span>
                </li>
              </ol>
              <div className="rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-[11px] text-fg-1 leading-relaxed">
                <div className="flex items-center gap-2 mb-2 text-fg-2">
                  <span className="status-dot active"></span>
                  <span className="text-[10px] uppercase tracking-[0.18em]">terminal</span>
                </div>
                <div className="text-ok">$ MODEL_TIER=cheap npx tsx scripts/orchestrate.ts --brand "Your Brand" --peec-data peec-data-2026-04-26.json</div>
                <div className="text-fg-2 mt-1">[BOOT] ARENA starting · tier=cheap · brand="Your Brand"</div>
                <div className="text-fg-2">[ROUND-1] Three agents analyzing in parallel...</div>
                <div className="text-fg-2">[ROUND-2] Cross-agent critique...</div>
                <div className="text-fg-2">[SYNTHESIS] Synthesizer: anthropic/claude-sonnet-4.6</div>
                <div className="text-ok">[DONE] $0.08 · 95s · Brief: briefs/2026-04-26-your-brand.md</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── BLOCK 4 · HOW THIS BRIEF WAS MADE (the proof) ─── */}
        <section>
          <div className="flex items-end justify-between mb-5 pb-4 border-b border-white/5">
            <div>
              <div className="label mb-1">↓ The receipts</div>
              <h2 className="font-display text-2xl font-bold text-fg-0 tracking-tight">
                How this brief was made
              </h2>
              <p className="text-sm text-fg-1 mt-1">
                Three frontier models · two rounds · one consensus-validated brief. Every recommendation here survived adversarial review.
              </p>
            </div>
            <span className="text-[11px] font-mono text-fg-2 hidden md:inline-block">
              run · {run.id.slice(0, 16)}
            </span>
          </div>

          <div className="space-y-6">
            {/* The three agent panes */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-4">
                {AGENT_ORDER.map(family => {
                  const isPeecPulling = phase === 'peec_pulling'
                  return (
                    <AgentPane
                      key={family}
                      family={family}
                      output={agents[family] ?? null}
                      active={isPeecPulling || thinkingAgents.has(family) || agents[family] !== null}
                      queuedLabel={
                        isPeecPulling
                          ? 'queued · waiting on Peec MCP…'
                          : thinkingAgents.has(family)
                          ? `analyzing Peec data…`
                          : undefined
                      }
                    />
                  )
                })}
              </div>
              <div className="col-span-12 lg:col-span-3">
                <TelemetryRail t={telemetry} />
              </div>
            </div>

            {/* Synthesis */}
            <SynthesisPanel run={run} />

            {/* Verdict table — every Peec action with its consensus tag */}
            {verdicts.length > 0 && <VerdictTable verdicts={verdicts} />}

            {/* Citations */}
            {citations.length > 0 && <CitationsStrip citations={citations} />}
          </div>
        </section>

        {/* ─── BLOCK 5 · FOOTER ───────────────────────────────────── */}
        <footer className="pt-10 pb-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 font-mono text-[11px] text-fg-2">
            <div className="max-w-2xl space-y-2">
              <div className="text-fg-0 font-semibold text-xs">
                ARENA by <a href="https://veloxe.ai" target="_blank" rel="noreferrer" className="text-ok hover:underline">Veloxe AI</a> ·
                Open source MIT ·{' '}
                <a href="https://github.com/veloxe-ai/arena-veloxe" target="_blank" rel="noreferrer" className="text-ok hover:underline">
                  github.com/veloxe-ai/arena-veloxe
                </a>
              </div>
              <div>
                Built for the <a href="https://peec.ai/mcp-challenge" target="_blank" rel="noreferrer" className="text-ok hover:underline">#BuiltWithPeec</a> challenge.
                Pulls your Peec AI visibility data via MCP, runs 3 models in adversarial debate, outputs a Weekly AEO Brief your team can act on.
              </div>
              <div className="text-fg-2/60">
                Skills used: <a href="https://github.com/rebelytics/peec-ai-mcp" target="_blank" rel="noreferrer" className="hover:text-fg-2">Eoghan Henn's peec-ai-mcp</a> (CC BY 4.0) ·{' '}
                <a href="https://github.com/lukONINO/peec-mcp-playbook" target="_blank" rel="noreferrer" className="hover:text-fg-2">Lukas Wipf's peec-mcp-playbook</a> (MIT)
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="label">data source</div>
              <div>Peec AI MCP · 35 tools · OAuth</div>
              <div className="label mt-2">models</div>
              <div>Claude · Grok · GPT</div>
              <div className="text-fg-2/60">via OpenRouter</div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
