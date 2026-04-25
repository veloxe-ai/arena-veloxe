import { useState, FormEvent, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

type Props = {
  onSubmit: (brand: string) => void
  isRunning: boolean
  phase: string
  error: string | null
  defaultBrand?: string
}

const MCP_TOOLS = [
  'list_brands',
  'get_brand_report',
  'get_domain_report',
  'get_actions',
  'list_chats',
] as const

const PHASE_LABEL: Record<string, string> = {
  idle:        'IDLE — ready to debate',
  peec_pulling:'PEEC MCP · pulling fresh data via Claude Code (~25s)',
  booting:     'BOOTING · spawning orchestrator…',
  ingesting:   'INGEST · parsing Peec response',
  round_1:     'ROUND 1 · 3 agents analyzing in parallel',
  round_2:     'ROUND 2 · adversarial cross-critique',
  synthesizing:'SYNTHESIS · writing the brief',
  done:        'DONE — brief generated below',
  error:       'ERROR',
}

export function InputBar({ onSubmit, isRunning, phase, error, defaultBrand = 'Veloxe AI' }: Props) {
  const [brand, setBrand] = useState(defaultBrand)
  const [knownBrands, setKnownBrands] = useState<string[]>([])
  const [pullElapsed, setPullElapsed] = useState(0)
  const [pullToolIdx, setPullToolIdx] = useState(0)
  const pullStartRef = useRef<number>(0)

  useEffect(() => {
    fetch('/api/brands')
      .then(r => r.ok ? r.json() : { brands: [] })
      .then((d: { brands: string[] }) => {
        const list = (d.brands ?? []).map(b => b.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
        if (list.length) setKnownBrands(list)
      })
      .catch(() => { /* offline / no api */ })
  }, [])

  // Tick a visible elapsed-second counter + cycle MCP tool names during peec_pulling
  useEffect(() => {
    if (phase === 'peec_pulling') {
      pullStartRef.current = Date.now()
      const tick = setInterval(() => {
        const elapsed = Math.floor((Date.now() - pullStartRef.current) / 1000)
        setPullElapsed(elapsed)
        // Rotate the displayed tool every ~6s through the 5 calls
        setPullToolIdx(Math.min(MCP_TOOLS.length - 1, Math.floor(elapsed / 6)))
      }, 200)
      return () => clearInterval(tick)
    } else {
      setPullElapsed(0)
      setPullToolIdx(0)
    }
  }, [phase])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isRunning) return
    onSubmit(brand.trim())
  }

  const phaseColor =
    phase === 'done'  ? 'text-ok' :
    phase === 'error' ? 'text-err' :
    phase === 'idle'  ? 'text-fg-2' :
    'text-accent'

  return (
    <div className="rounded-xl border border-white/10 bg-bg-1/60 backdrop-blur-sm p-5 md:p-6 shadow-[0_4px_24px_-12px_rgba(139,92,246,0.3)]">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-stretch">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg bg-black/40 border border-white/10 focus-within:border-accent/40 transition-colors">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-2 hidden sm:inline">brand</span>
          <input
            type="text"
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="e.g. Veloxe AI"
            disabled={isRunning}
            className="flex-1 bg-transparent text-fg-0 placeholder-fg-3 font-mono text-sm focus:outline-none disabled:opacity-50"
          />
        </div>
        <motion.button
          type="submit"
          disabled={isRunning || !brand.trim()}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 rounded-lg bg-accent text-white font-mono text-xs font-bold tracking-[0.18em] uppercase hover:shadow-glow-accent transition-shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
        >
          {isRunning ? (
            <>
              <span className="status-dot active"></span>
              <span>Running…</span>
            </>
          ) : (
            <>
              <span>→ Run AEO Intel</span>
            </>
          )}
        </motion.button>
      </form>

      {/* Phase indicator strip */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-y-2 gap-x-4 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${isRunning ? 'active' : phase === 'error' ? 'err' : phase === 'done' ? 'active' : 'idle'}`}></span>
          <span className={phaseColor}>{PHASE_LABEL[phase] ?? phase}</span>
        </div>
        {knownBrands.length > 0 && !isRunning && (
          <div className="flex items-center gap-2 text-fg-2">
            <span className="label">Try</span>
            {knownBrands.slice(0, 4).map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className="px-2 py-0.5 rounded border border-white/10 hover:border-ok/40 hover:text-ok text-fg-1 transition-colors"
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live MCP-tool ticker — only renders during peec_pulling phase. Gives the
          dashboard visible movement during the 30–60s wait while Claude Code is
          calling Peec MCP tools. Counter ticks each second, current tool label
          cycles every ~6s. */}
      {phase === 'peec_pulling' && (
        <div className="mt-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-3">
          <div className="flex items-center justify-between font-mono text-[11px] flex-wrap gap-y-2">
            <div className="flex items-center gap-2 text-fg-1">
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="status-dot bg-accent"
              />
              <span className="text-accent">peec-ai mcp</span>
              <span className="text-fg-3">→</span>
              <span className="text-fg-0">
                {MCP_TOOLS[pullToolIdx]}
                <span className="animate-pulse text-accent">_</span>
              </span>
            </div>
            <span className="text-fg-2">{pullElapsed}s elapsed · ~30–60s typical</span>
          </div>
          <div className="mt-2 flex gap-1">
            {MCP_TOOLS.map((tool, i) => (
              <div
                key={tool}
                className={`flex-1 h-1 rounded ${i < pullToolIdx ? 'bg-ok' : i === pullToolIdx ? 'bg-accent animate-pulse' : 'bg-white/8'}`}
                title={tool}
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 px-3 py-2 rounded-md bg-err/10 border border-err/30 text-err font-mono text-[11px]">
          {error}
        </div>
      )}
    </div>
  )
}
