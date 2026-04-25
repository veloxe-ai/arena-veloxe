// ═══════════════════════════════════════════════════════════
// useArenaRun — drive the dashboard from a live SSE event stream.
// Initializes from sample data; on .start(brand) clears & streams real run.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ArenaRun, AgentOutput, ArenaVerdict, ArenaCitation, TelemetrySnapshot, ModelFamily, VerdictTag,
} from '../types'
import {
  SAMPLE_RUN,
  SAMPLE_AGENT_OUTPUTS,
  SAMPLE_VERDICTS,
  SAMPLE_CITATIONS,
  SAMPLE_TELEMETRY,
} from './sample-data'

export type RunPhase = 'idle' | 'peec_pulling' | 'booting' | 'ingesting' | 'round_1' | 'round_2' | 'synthesizing' | 'done' | 'error'

const API_BASE = (import.meta.env.VITE_ARENA_API as string | undefined) ?? ''

type AgentMap = Record<ModelFamily, AgentOutput | null>

const initialAgents = (): AgentMap => {
  const map: AgentMap = { claude: null, grok: null, gpt: null }
  for (const o of SAMPLE_AGENT_OUTPUTS) map[o.family] = o
  return map
}

export function useArenaRun() {
  const [run, setRun] = useState<ArenaRun>(SAMPLE_RUN)
  const [agents, setAgents] = useState<AgentMap>(initialAgents())
  const [verdicts, setVerdicts] = useState<ArenaVerdict[]>(SAMPLE_VERDICTS)
  const [citations, setCitations] = useState<ArenaCitation[]>(SAMPLE_CITATIONS)
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(SAMPLE_TELEMETRY)
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [thinkingAgents, setThinkingAgents] = useState<Set<ModelFamily>>(new Set())

  const esRef = useRef<EventSource | null>(null)
  const startTimeRef = useRef<number>(0)
  // Timestamp (ms) of last successful peec-pull completion. Drives the live
  // "data age" ticker in TelemetryRail. Null = no live pull happened yet (cold load).
  const [peecPulledAt, setPeecPulledAt] = useState<number | null>(null)
  // Tick every 1s once a fresh pull has happened, so the dashboard's
  // "data age" display moves visibly. Without this, the panel claims
  // "live · 1s refresh" but never refreshes.
  useEffect(() => {
    if (peecPulledAt === null) return
    const id = setInterval(() => {
      const elapsedHours = (Date.now() - peecPulledAt) / 3_600_000
      setTelemetry(t => ({ ...t, peec_data_freshness_hours: elapsedHours }))
    }, 1000)
    return () => clearInterval(id)
  }, [peecPulledAt])

  const cleanup = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
  }

  const start = useCallback(async (brand: string) => {
    if (!brand.trim()) return
    cleanup()
    setError(null)
    setPhase('peec_pulling')
    setLogs([])
    setThinkingAgents(new Set())
    // Reset state to "fresh run" — clear agents, verdicts, citations, brief
    setAgents({ claude: null, grok: null, gpt: null })
    setVerdicts([])
    setCitations([])
    // Reset live telemetry counters for THIS run so cost ticks 0 → $0.13 visibly
    setTelemetry(t => ({
      ...t,
      total_cost_today_usd: 0,
      total_cost_week_usd: 0,
      model_leaderboard: t.model_leaderboard.map(m => ({ ...m, consensus_wins: 0 })),
    }))
    setRun(prev => ({
      ...prev,
      brand,
      created_at: new Date().toISOString(),
      total_cost_usd: 0,
      total_tokens: 0,
      duration_ms: 0,
      summary: null,
      status: 'ingesting',
    }))
    startTimeRef.current = Date.now()

    try {
      const res = await fetch(`${API_BASE}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const { run_id } = await res.json() as { run_id: string }

      const es = new EventSource(`${API_BASE}/api/stream/${run_id}`)
      esRef.current = es

      es.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data)
          applyEvent(event)
        } catch { /* malformed */ }
      }
      es.onerror = () => { cleanup() }
    } catch (err: any) {
      setError(err?.message ?? 'unknown error')
      setPhase('error')
    }
  }, [])

  const applyEvent = (event: any) => {
    switch (event.type) {
      case 'peec_pull_start':
        setPhase('peec_pulling')
        setLogs(prev => [...prev, `[PEEC-PULL] ${event.detail ?? 'pulling fresh data via Peec MCP…'}`])
        break

      case 'peec_pull_complete':
        setLogs(prev => [...prev, `[PEEC-PULL] ${event.brands ?? '?'} brands · ${event.top_urls ?? '?'} urls · ${event.actions ?? '?'} actions · ${event.chats ?? '?'} chats`])
        // Live data just landed — reset the freshness timer
        setPeecPulledAt(Date.now())
        setTelemetry(t => ({ ...t, peec_data_freshness_hours: 0 }))
        break

      case 'boot':
        setPhase('booting')
        setLogs(prev => [...prev, `[BOOT] tier=${event.tier} brand="${event.brand}"${event.target_brand && event.target_brand !== event.brand ? ` target="${event.target_brand}"` : ''}`])
        // New run starts — bump the run counters live
        setTelemetry(t => ({
          ...t,
          runs_today: t.runs_today + 1,
          runs_week: t.runs_week + 1,
        }))
        break

      case 'ingest':
        setPhase('ingesting')
        setRun(prev => ({
          ...prev,
          peec_chats_analyzed: event.chats ?? 0,
          peec_urls_scraped: event.top_urls ?? 0,
        }))
        setLogs(prev => [...prev, `[INGEST] visibility ${(event.visibility ?? 0).toFixed(1)}% · ${event.competitors} competitors · ${event.actions} actions · ${event.chats} chats`])
        break

      case 'round_1_start':
        setPhase('round_1')
        setThinkingAgents(new Set(['claude', 'grok', 'gpt']))
        setLogs(prev => [...prev, `[ROUND-1] three agents analyzing in parallel…`])
        break

      case 'agent_thinking':
        setThinkingAgents(prev => new Set([...prev, event.family]))
        break

      case 'agent_complete':
        setThinkingAgents(prev => {
          const next = new Set(prev); next.delete(event.family); return next
        })
        // Build/merge an AgentOutput for the pane
        setAgents(prev => {
          const family = event.family as ModelFamily
          const existing = prev[family]
          const phaseLabel = event.round === 2 ? 'round-2' : 'round-1'
          const merged: AgentOutput = {
            run_id: run.id,
            family,
            model_id: event.model_id,
            phase: phaseLabel,
            started_at: existing?.started_at ?? new Date().toISOString(),
            ended_at: new Date().toISOString(),
            tokens_in: (existing?.tokens_in ?? 0) + (event.tokens_in ?? 0),
            tokens_out: (existing?.tokens_out ?? 0) + (event.tokens_out ?? 0),
            cost_usd: (existing?.cost_usd ?? 0) + (event.cost_usd ?? 0),
            reasoning_depth: existing?.reasoning_depth ?? null,
            confidence: existing?.confidence ?? null,
            content: stringifyAgentOutput(event.parsed),
            patterns: extractPatterns(event.parsed),
          }
          return { ...prev, [family]: merged }
        })
        setRun(prev => ({
          ...prev,
          total_cost_usd: prev.total_cost_usd + (event.cost_usd ?? 0),
          total_tokens: prev.total_tokens + (event.tokens_out ?? 0),
        }))
        // Live cost ticks up + leaderboard increments by substantive contribution
        // (recommended_actions count + critiques count, fallback +1 per round)
        {
          const family = event.family as ModelFamily
          const parsed = event.parsed ?? {}
          const contribution =
            (Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions.length : 0) +
            (Array.isArray(parsed.critiques) ? parsed.critiques.length : 0) +
            1
          setTelemetry(t => ({
            ...t,
            total_cost_today_usd: t.total_cost_today_usd + (event.cost_usd ?? 0),
            total_cost_week_usd:  t.total_cost_week_usd  + (event.cost_usd ?? 0),
            model_leaderboard: t.model_leaderboard.map(m =>
              m.family === family ? { ...m, consensus_wins: m.consensus_wins + contribution } : m
            ),
          }))
        }
        setLogs(prev => [...prev, `[ROUND-${event.round}] ${event.family}: ${event.tokens_out} tok · $${(event.cost_usd ?? 0).toFixed(4)}`])
        break

      case 'agent_error':
        setLogs(prev => [...prev, `[WARN] ${event.family} R${event.round}: ${event.error}`])
        break

      case 'round_1_complete':
        setLogs(prev => [...prev, `[ROUND-1] complete · $${(event.total_cost ?? 0).toFixed(4)}`])
        break

      case 'round_2_start':
        setPhase('round_2')
        setThinkingAgents(new Set(['claude', 'grok', 'gpt']))
        setLogs(prev => [...prev, `[ROUND-2] cross-agent critique…`])
        break

      case 'round_2_complete':
        setLogs(prev => [...prev, `[ROUND-2] complete · $${(event.total_cost ?? 0).toFixed(4)}`])
        break

      case 'synthesis_start':
        setPhase('synthesizing')
        setLogs(prev => [...prev, `[SYNTHESIS] ${event.model_id}…`])
        break

      case 'synthesis_complete':
        setRun(prev => ({
          ...prev,
          total_cost_usd: prev.total_cost_usd + (event.cost_usd ?? 0),
          total_tokens: prev.total_tokens + (event.tokens_out ?? 0),
        }))
        // Synthesizer cost into the live telemetry too
        setTelemetry(t => ({
          ...t,
          total_cost_today_usd: t.total_cost_today_usd + (event.cost_usd ?? 0),
          total_cost_week_usd:  t.total_cost_week_usd  + (event.cost_usd ?? 0),
        }))
        setLogs(prev => [...prev, `[SYNTHESIS] complete · $${(event.cost_usd ?? 0).toFixed(4)}`])
        break

      case 'done':
        setPhase('done')
        setRun(prev => ({
          ...prev,
          summary: event.brief_md ?? prev.summary,
          total_cost_usd: event.cost_total_usd ?? prev.total_cost_usd,
          total_tokens: event.tokens_total ?? prev.total_tokens,
          duration_ms: event.duration_ms ?? (Date.now() - startTimeRef.current),
          status: 'done',
        }))
        if (Array.isArray(event.verdicts)) {
          setVerdicts(event.verdicts.map((v: any, i: number) => ({
            run_id: run.id,
            peec_action_id: `live-${i}`,
            peec_action_summary: v.peec_action_summary ?? '',
            peec_score: 2,
            arena_verdict: (v.arena_verdict ?? 'PARTIAL') as VerdictTag,
            consensus_count: v.consensus_count ?? 0,
            reasoning: '',
            refinements: [],
          })))
        }
        if (Array.isArray(event.citations)) {
          setCitations(event.citations.map((c: any) => ({
            run_id: run.id,
            url: c.url,
            domain: c.domain,
            peec_citation_count: Math.round((c.citation_rate ?? 0) * 10),
            peec_citation_rate: c.citation_rate ?? 0,
            domain_type: (c.domain_type ?? 'Other') as ArenaCitation['domain_type'],
            extracted_patterns: [],
            content_snippet: '',
          })))
        }
        cleanup()
        break

      case 'log':
      case 'stderr':
        // Optional: capture in logs for debugging — keep buffer small
        setLogs(prev => prev.length > 500 ? prev : [...prev, event.line])
        break

      case 'exit':
        if (event.code !== 0) {
          setPhase('error')
          setError(`orchestrator exited with code ${event.code}`)
        }
        cleanup()
        break
    }
  }

  return {
    run, agents, verdicts, citations, telemetry,
    phase, error, logs, thinkingAgents,
    isRunning: phase !== 'idle' && phase !== 'done' && phase !== 'error',
    start,
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function stringifyAgentOutput(parsed: any): string {
  if (!parsed || typeof parsed !== 'object') return '…'

  // Truncated-JSON fallback — try to surface readable text from inside the partial JSON
  if (parsed._parse_error && typeof parsed._raw === 'string') {
    const cleaned = parsed._raw
      .replace(/```(json)?/g, '')
      .replace(/^\s*\{\s*/, '')
      .replace(/^"[a-z_]+":\s*"/i, '')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
    return cleaned.slice(0, 700)
  }

  // Round-1 shape: { visibility_assessment, top_patterns, recommended_actions, key_insight }
  if (typeof parsed.visibility_assessment === 'string') {
    let out = parsed.visibility_assessment
    if (typeof parsed.key_insight === 'string') out += '\n\n→ ' + parsed.key_insight
    return out.slice(0, 700)
  }
  if (typeof parsed.key_insight === 'string') return parsed.key_insight.slice(0, 700)

  // Round-2 shape: { critiques: [{target_agent, target_claim, stance, reasoning}], defended_positions, updated_verdict_overrides }
  if (Array.isArray(parsed.critiques)) {
    const lines: string[] = []
    for (const c of parsed.critiques.slice(0, 2)) {
      const target = c?.target_agent ? `→ ${c.target_agent}` : '→'
      const stance = c?.stance ? ` (${c.stance})` : ''
      const claim = c?.target_claim ?? ''
      const reasoning = c?.reasoning ?? ''
      lines.push(`${target}${stance}: ${claim}\n${reasoning}`)
    }
    return lines.join('\n\n').slice(0, 700)
  }

  // Generic recommended_actions shape
  if (Array.isArray(parsed.recommended_actions)) {
    return parsed.recommended_actions.slice(0, 3).map((a: any) =>
      `[${a.verdict ?? '?'}] ${a.action_id ?? ''}\n${a.reasoning ?? ''}`
    ).join('\n\n').slice(0, 700)
  }

  return JSON.stringify(parsed, null, 2).slice(0, 700)
}

function extractPatterns(parsed: any): string[] {
  if (!parsed || typeof parsed !== 'object') return []
  const patterns = parsed.top_patterns
  if (Array.isArray(patterns)) {
    return patterns.map((p: any) => String(p?.pattern ?? p ?? '')).filter(Boolean).slice(0, 4)
  }
  // Round-2: pull from defended_positions if available
  if (Array.isArray(parsed.defended_positions)) {
    return parsed.defended_positions.slice(0, 3).map((d: any) => String(d?.position ?? d ?? '')).filter(Boolean)
  }
  return []
}
