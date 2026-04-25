import { motion } from 'framer-motion'
import type { AgentOutput, ModelFamily } from '../types'
import { AGENT_PROFILES, MODEL_BORDER, MODEL_DOT, MODEL_TEXT } from '../lib/agents'

interface Props {
  family: ModelFamily
  output: AgentOutput | null
  active: boolean
  queuedLabel?: string
}

function AgentContent({ content, family }: { content: string; family: ModelFamily }) {
  // Try to parse structured JSON output (Claude/GPT emit JSON for round-2 critiques)
  // Models emit JSON in several forms: full {}, fragment starting with "critiques":, or wrapped in ```json
  try {
    let cleaned = content.trim()
    // Strip markdown code fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    // Wrap bare JSON fragment (e.g. GPT emits `"critiques": [...]` without outer braces)
    if (cleaned.startsWith('"')) cleaned = `{${cleaned}}`
    // Extract first JSON object if content has preamble text
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) cleaned = match[0]
    }

    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
      const parsed = JSON.parse(cleaned)
      const critiques: Array<{ target_agent?: string; target_claim?: string; evidence?: string }> =
        Array.isArray(parsed.critiques) ? parsed.critiques :
        Array.isArray(parsed) ? parsed : []

      if (critiques.length > 0) {
        return (
          <div className="space-y-2">
            {critiques.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className={`${MODEL_TEXT[family]} shrink-0`}>→</span>
                <span>
                  <span className="text-fg-0 font-semibold">{c.target_agent ?? 'agent'}</span>
                  {': '}
                  <span className="text-fg-1">{c.target_claim ?? c.evidence ?? ''}</span>
                </span>
              </div>
            ))}
          </div>
        )
      }
    }
  } catch {
    // not JSON — fall through to plain text
  }
  return <p className="whitespace-pre-wrap">{content}</p>
}

export function AgentPane({ family, output, active, queuedLabel }: Props) {
  const profile = AGENT_PROFILES[family]
  const borderCls = active ? MODEL_BORDER[family] : 'border-white/5'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`pane-elevated ${borderCls} transition-all duration-500 flex flex-col min-h-[340px]`}
    >
      {/* Pane header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className={`status-dot ${active ? 'active' : 'idle'} ${active ? MODEL_DOT[family] : ''}`} />
          <div>
            <div className={`font-mono text-[11px] font-semibold tracking-tight ${MODEL_TEXT[family]}`}>
              {profile.label}
            </div>
            <div className="label">{profile.role} · {profile.modelId}</div>
          </div>
        </div>
        <div className="text-right font-mono text-[10px] text-fg-2">
          {output ? (
            <>
              <div>{output.tokens_out} tok · ${output.cost_usd.toFixed(3)}</div>
              <div className="text-ok mt-0.5">phase: {output.phase}</div>
            </>
          ) : active ? (
            <div className={`${MODEL_TEXT[family]} animate-pulse`}>thinking…</div>
          ) : (
            <div>idle</div>
          )}
        </div>
      </div>

      {/* Streaming content */}
      <div className="flex-1 p-4 font-mono text-[12px] leading-relaxed text-fg-1 overflow-y-auto max-h-[240px]">
        {output ? (
          <AgentContent content={output.content} family={family} />
        ) : active ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-fg-1">
              <span className={`status-dot active ${MODEL_DOT[family]}`}></span>
              <span className="font-mono text-[11px]">{queuedLabel ?? 'analyzing Peec data…'}</span>
            </div>
            <div className="space-y-1.5 mt-3">
              <div className="h-2 bg-white/5 rounded animate-pulse" style={{ width: '85%' }}></div>
              <div className="h-2 bg-white/5 rounded animate-pulse" style={{ width: '70%', animationDelay: '120ms' }}></div>
              <div className="h-2 bg-white/5 rounded animate-pulse" style={{ width: '92%', animationDelay: '240ms' }}></div>
              <div className="h-2 bg-white/5 rounded animate-pulse" style={{ width: '60%', animationDelay: '360ms' }}></div>
            </div>
          </div>
        ) : (
          <div className="text-fg-3 italic">awaiting prompt</div>
        )}
      </div>

      {/* Extracted patterns footer */}
      {output?.patterns && output.patterns.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="label mb-2">proposed patterns ({output.patterns.length})</div>
          <ul className="space-y-1.5">
            {output.patterns.map((p, i) => (
              <li key={i} className="font-mono text-[11px] text-fg-0 flex items-start gap-2">
                <span className={`${MODEL_TEXT[family]} mt-0.5`}>▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
