import { motion } from 'framer-motion'
import type { ArenaRun } from '../types'

export function SynthesisPanel({ run }: { run: ArenaRun | null }) {
  return (
    <div className="pane-elevated border-accent/30 shadow-glow-accent flex flex-col min-h-[340px]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-accent/20">
        <div className="flex items-center gap-3">
          <span className="status-dot active bg-accent shadow-[0_0_16px_-2px_rgba(139,92,246,0.6)]" />
          <div>
            <div className="font-mono text-xs font-semibold text-accent tracking-tight">SYNTHESIZER</div>
            <div className="label">claude-opus-4-7 · consensus-weighted</div>
          </div>
        </div>
        {run && (
          <div className="text-right font-mono text-[10px] text-fg-2">
            <div>{run.consensus_patterns} consensus</div>
            <div className="text-warn mt-0.5">{run.dissent_flags} dissent flags</div>
          </div>
        )}
      </div>

      <div className="flex-1 p-5 overflow-y-auto max-h-[280px]">
        {run?.summary ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-mono text-[13px] leading-relaxed text-fg-0 whitespace-pre-wrap"
          >
            {run.summary}
          </motion.p>
        ) : (
          <div className="text-fg-3 italic font-mono text-xs">awaiting round-3 synthesis</div>
        )}
      </div>

      {run && (
        <div className="border-t border-accent/20 px-5 py-3 grid grid-cols-4 gap-3 font-mono">
          <Metric label="chats" value={run.peec_chats_analyzed.toString()} />
          <Metric label="urls" value={run.peec_urls_scraped.toString()} />
          <Metric label="tokens" value={run.total_tokens.toLocaleString()} />
          <Metric label="cost" value={`$${run.total_cost_usd.toFixed(3)}`} accent />
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`text-sm font-semibold ${accent ? 'text-accent' : 'text-fg-0'}`}>{value}</div>
    </div>
  )
}
