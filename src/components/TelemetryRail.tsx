import type { TelemetrySnapshot } from '../types'
import { AGENT_PROFILES, MODEL_DOT, MODEL_TEXT } from '../lib/agents'

export function TelemetryRail({ t }: { t: TelemetrySnapshot }) {
  const maxWins = Math.max(1, ...t.model_leaderboard.map(m => m.consensus_wins))
  return (
    <div className="pane flex flex-col gap-6 p-5">
      {/* Header */}
      <div>
        <div className="label mb-1">telemetry</div>
        <div className="font-mono text-xs text-fg-0">live · 1s refresh</div>
      </div>

      {/* Runs */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="runs today" value={t.runs_today.toString()} />
        <Stat label="runs / 7d" value={t.runs_week.toString()} />
        <Stat label="cost today" value={`$${t.total_cost_today_usd.toFixed(2)}`} color="warn" />
        <Stat label="cost / 7d" value={`$${t.total_cost_week_usd.toFixed(2)}`} color="warn" />
      </div>

      {/* Peec data freshness — ticks live every second when fresh pull happened */}
      <div>
        <div className="label mb-1">peec data age</div>
        <div className="flex items-baseline gap-1">
          {(() => {
            const h = t.peec_data_freshness_hours
            const totalSec = Math.floor(h * 3600)
            if (totalSec < 60) return (<>
              <div className="font-mono font-semibold text-ok text-lg">{totalSec}</div>
              <div className="font-mono text-xs text-fg-2">sec · live</div>
            </>)
            if (totalSec < 3600) return (<>
              <div className="font-mono font-semibold text-ok text-lg">{Math.floor(totalSec / 60)}</div>
              <div className="font-mono text-xs text-fg-2">min · {totalSec % 60}s</div>
            </>)
            return (<>
              <div className="font-mono font-semibold text-ok text-lg">{h.toFixed(1)}</div>
              <div className="font-mono text-xs text-fg-2">hours</div>
            </>)
          })()}
        </div>
        <div className="mt-2 h-1 w-full bg-bg-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-ok transition-all duration-700"
            style={{ width: `${Math.max(4, 100 - (t.peec_data_freshness_hours / 24) * 100)}%` }}
          />
        </div>
      </div>

      {/* Model leaderboard */}
      <div>
        <div className="label mb-2">consensus leaderboard</div>
        <div className="space-y-2">
          {t.model_leaderboard.map(m => (
            <div key={m.family} className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${MODEL_DOT[m.family]}`} />
                  <span className={MODEL_TEXT[m.family]}>{AGENT_PROFILES[m.family].label}</span>
                </div>
                <span className="text-fg-0 font-semibold">{m.consensus_wins}</span>
              </div>
              <div className="h-0.5 bg-bg-3 rounded-full overflow-hidden">
                <div
                  className={`h-full ${MODEL_DOT[m.family]}`}
                  style={{ width: `${(m.consensus_wins / maxWins) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peec MCP status */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="label mb-1">peec-ai mcp</div>
        <div className="flex items-center gap-2">
          <span className="status-dot active" />
          <span className="font-mono text-[11px] text-ok">authenticated · 35 tools</span>
        </div>
        <div className="font-mono text-[10px] text-fg-2 mt-1">api.peec.ai/mcp · streamable-http</div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: 'ok' | 'warn' | 'err' }) {
  const colorCls = color === 'warn' ? 'text-warn' : color === 'err' ? 'text-err' : 'text-fg-0'
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`font-mono font-semibold text-sm ${colorCls}`}>{value}</div>
    </div>
  )
}
