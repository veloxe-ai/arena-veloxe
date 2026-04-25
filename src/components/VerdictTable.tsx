import type { ArenaVerdict, VerdictTag } from '../types'

const TAG_STYLES: Record<VerdictTag, { bg: string; text: string; label: string }> = {
  HIGH:    { bg: 'bg-ok/10 border-ok/40',       text: 'text-ok',   label: 'HIGH ●●●' },
  PARTIAL: { bg: 'bg-warn/10 border-warn/40',   text: 'text-warn', label: 'PARTIAL ●●' },
  LOW:     { bg: 'bg-fg-3/10 border-fg-3/60',   text: 'text-fg-1', label: 'LOW ●' },
  BLOCKED: { bg: 'bg-err/10 border-err/50',     text: 'text-err',  label: 'BLOCKED ✕' },
}

export function VerdictTable({ verdicts }: { verdicts: ArenaVerdict[] }) {
  return (
    <div className="pane-elevated">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <div className="font-mono text-xs font-semibold text-fg-0 tracking-tight">
            PEEC ACTIONS · ARENA VERDICT
          </div>
          <div className="label mt-0.5">adversarial validation of single-model recommendations</div>
        </div>
        <div className="font-mono text-[10px] text-fg-2">
          {verdicts.length} actions evaluated
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {verdicts.map((v, i) => {
          const style = TAG_STYLES[v.arena_verdict]
          return (
            <div key={v.peec_action_id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-6 text-right font-mono text-fg-2 text-xs pt-1">#{i + 1}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="font-mono text-[13px] text-fg-0 leading-snug">
                        {v.peec_action_summary}
                      </div>
                      <div className="label mt-1">
                        peec score {v.peec_score}/3 · consensus {v.consensus_count}/3
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded border font-mono text-[10px] font-semibold tracking-[0.15em] ${style.bg} ${style.text}`}>
                      {style.label}
                    </div>
                  </div>

                  <div className="font-mono text-[11px] text-fg-1 leading-relaxed mb-2">
                    {v.reasoning}
                  </div>

                  {v.refinements.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="label mb-1.5">arena refinements</div>
                      <ul className="space-y-1">
                        {v.refinements.map((r, j) => (
                          <li key={j} className="font-mono text-[11px] text-fg-0 flex items-start gap-2">
                            <span className="text-accent mt-0.5">▸</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
