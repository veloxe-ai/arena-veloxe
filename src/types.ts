// ═══════════════════════════════════════════════════════════
// ARENA — Shared types between dashboard + orchestrator
// ═══════════════════════════════════════════════════════════

export type ModelId =
  | 'openai/gpt-5.5-pro'   | 'openai/gpt-5-mini'   | 'openai/gpt-5.4'
  | 'anthropic/claude-opus-4.7' | 'anthropic/claude-sonnet-4.6' | 'anthropic/claude-haiku-4.5'
  | 'x-ai/grok-4.20'       | 'x-ai/grok-4-fast'

export type ModelFamily = 'gpt' | 'claude' | 'grok'

export interface AgentProfile {
  id: ModelFamily
  label: string                   // 'GPT-5.5 Pro' etc.
  modelId: ModelId
  role: string                    // 'The Strategist' / 'The Philosopher' / ...
  color: string                   // tailwind class
}

export type RunStatus = 'idle' | 'ingesting' | 'round-1' | 'round-2' | 'synthesizing' | 'done' | 'error'

export interface ArenaRun {
  id: string                      // uuid
  created_at: string              // ISO
  brand: string                   // 'Veloxe AI'
  project_id: string              // Peec project id (or_...)
  prompt_focus: string | null     // optional: narrow to one Peec prompt
  status: RunStatus
  total_cost_usd: number
  total_tokens: number
  duration_ms: number
  peec_chats_analyzed: number
  peec_urls_scraped: number
  consensus_patterns: number
  dissent_flags: number
  summary: string | null
}

export interface AgentOutput {
  run_id: string
  family: ModelFamily
  model_id: ModelId
  phase: 'round-1' | 'round-2' | 'synthesis'
  started_at: string
  ended_at: string | null
  tokens_in: number
  tokens_out: number
  cost_usd: number
  reasoning_depth: number | null  // scored 1-10 by synthesizer
  confidence: number | null       // 0-1
  content: string                 // raw output
  patterns: string[]              // extracted patterns this agent proposed
}

export type VerdictTag = 'HIGH' | 'PARTIAL' | 'LOW' | 'BLOCKED'

export interface ArenaVerdict {
  run_id: string
  peec_action_id: string          // from Peec get_actions
  peec_action_summary: string
  peec_score: number              // Peec's 1-3 score
  arena_verdict: VerdictTag
  consensus_count: number         // how many of 4 agents agreed
  reasoning: string
  refinements: string[]           // Arena-proposed improvements
}

export interface ArenaCitation {
  run_id: string
  url: string
  domain: string
  peec_citation_count: number
  peec_citation_rate: number
  domain_type: 'Corporate' | 'Reference' | 'UGC' | 'Editorial' | 'Other' | 'Institutional' | 'Competitor'
  extracted_patterns: string[]
  content_snippet: string         // first ~300 words
}

export interface TelemetrySnapshot {
  runs_today: number
  runs_week: number
  total_cost_today_usd: number
  total_cost_week_usd: number
  model_leaderboard: Array<{ family: ModelFamily; consensus_wins: number }>
  peec_data_freshness_hours: number
}
