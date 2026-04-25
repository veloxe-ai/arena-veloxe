import { motion } from 'framer-motion'
import type { ArenaRun } from '../types'

type HeaderProps = { run: ArenaRun }

export function Header({ run }: HeaderProps) {
  return (
    <header className="relative z-10 overflow-hidden border-b border-white/5">
      {/* Cinematic background — soft glow + subtle grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(139, 92, 246, 0.18) 0%, transparent 55%), radial-gradient(ellipse at 75% 70%, rgba(16, 185, 129, 0.12) 0%, transparent 55%)',
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 pt-10 pb-8">
        {/* ─── Top row: wordmark + meta ─────────────────────────── */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5">
            {/* Animated 3-agent triangle — proof element, not decoration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative w-14 h-14 shrink-0 hidden md:block"
            >
              <svg viewBox="0 0 56 56" className="w-full h-full">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" />
                <circle cx="28" cy="28" r="14" fill="none" stroke="rgba(255,255,255,0.04)" />
                <motion.circle
                  cx="28" cy="6" r="3" fill="#cc785c"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: 0 }}
                />
                <motion.circle
                  cx="47" cy="40" r="3" fill="#e8375a"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: 0.8 }}
                />
                <motion.circle
                  cx="9" cy="40" r="3" fill="#10a37f"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: 1.6 }}
                />
                <line x1="28" y1="6" x2="47" y2="40" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
                <line x1="47" y1="40" x2="9" y2="40" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
                <line x1="9" y1="40" x2="28" y2="6" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
              </svg>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-display font-bold tracking-[-0.04em] text-[52px] md:text-[64px] leading-none text-fg-0">
                  ARENA
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ok hidden md:inline">
                  v0.1 · live showcase
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.34em] text-fg-2">
                Adversarial AEO · Built for marketers
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col items-end gap-3 hidden md:flex">
            <div className="text-right font-mono text-fg-2 text-[11px]">
              <div className="label">Built by</div>
              <a
                href="https://veloxe.ai"
                target="_blank"
                rel="noreferrer"
                className="text-fg-0 font-display font-semibold text-lg tracking-tight hover:text-ok transition-colors"
              >
                Veloxe AI
              </a>
              <div className="mt-1">powered by Peec · #BuiltWithPeec</div>
            </div>
            {/* Cinematic 15s intro loop — right-aligned, lines up under the meta stack */}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-[260px] h-[146px] rounded-md object-cover border border-white/10 shadow-[0_6px_28px_-8px_rgba(139,92,246,0.4)]"
              src="/promos/arena-intro-720.mp4"
            />
          </div>
        </div>

        {/* ─── Tagline pattern (cinematic) ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-7 font-display font-bold tracking-[0.12em] text-[15px] md:text-[17px] uppercase"
        >
          <span className="text-claude">INGEST</span>
          <span className="text-fg-3 mx-3">·</span>
          <span className="text-grok">DEBATE</span>
          <span className="text-fg-3 mx-3">·</span>
          <span className="text-gpt">SYNTHESIZE</span>
          <span className="text-fg-3 mx-3">·</span>
          <span className="text-accent">ACT</span>
        </motion.div>

        {/* ─── One-line value prop ──────────────────────────────── */}
        <p className="mt-5 font-sans text-base md:text-[17px] text-fg-1 leading-relaxed max-w-3xl">
          Three frontier models debate <span className="text-ok font-semibold">Peec AI</span>'s visibility
          data, then write you a <span className="text-fg-0 font-semibold">Weekly AEO Brief</span> your
          content team can act on Monday morning. <span className="text-fg-2">95 seconds. ~$0.08 per run. Open source.</span>
        </p>

        {/* ─── Run metadata as proof line ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px]"
        >
          <span className="flex items-center gap-2">
            <span className="status-dot active"></span>
            <span className="text-fg-2 uppercase tracking-[0.18em]">Last run</span>
          </span>
          <span className="text-fg-1">{run.created_at.slice(0,10)}</span>
          <span className="text-fg-3">·</span>
          <span className="text-fg-1">brand: <span className="text-fg-0">{run.brand}</span></span>
          <span className="text-fg-3">·</span>
          <span className="text-fg-1">cost: <span className="text-ok">${run.total_cost_usd.toFixed(2)}</span></span>
          <span className="text-fg-3">·</span>
          <span className="text-fg-1">duration: <span className="text-fg-0">{Math.round(run.duration_ms/1000)}s</span></span>
          <span className="text-fg-3">·</span>
          <span className="text-fg-1">tokens: <span className="text-fg-0">{run.total_tokens.toLocaleString()}</span></span>
          <span className="text-fg-3">·</span>
          <span className="text-fg-1">models: <span className="text-fg-0">3</span></span>
        </motion.div>
      </div>

      <div className="hudline" />
    </header>
  )
}
