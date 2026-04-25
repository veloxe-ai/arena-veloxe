#!/usr/bin/env tsx
// ═══════════════════════════════════════════════════════════
// ARENA ORCHESTRATOR
// Full adversarial debate pipeline over Peec AI visibility data.
//
// Usage:
//   npx tsx scripts/orchestrate.ts --brand "Veloxe AI"
//   npx tsx scripts/orchestrate.ts --brand "Veloxe AI" --peec-data ./peec-data.json
//   MODEL_TIER=premium npx tsx scripts/orchestrate.ts --brand "Veloxe AI"
//
// Peec data source (pick one):
//   1. --peec-data <path>    pre-pulled JSON from peec-pull.sh
//   2. PEEC_ACCESS_TOKEN     direct MCP HTTP calls
//   3. (fallback)            sample data for dev/demo
//
// Environment:
//   OPENROUTER_API_KEY       (required)
//   SUPABASE_URL             (default: https://api.viralstrike.ai)
//   SUPABASE_SERVICE_ROLE_KEY
//   PEEC_PROJECT_ID          (default: Veloxe AI project)
//   PEEC_ACCESS_TOKEN        (optional — for direct MCP calls)
//   MODEL_TIER               cheap | premium (default: cheap)
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import * as path from 'path'

// ─── Config ─────────────────────────────────────────────────
const TIER = (process.env.MODEL_TIER ?? 'cheap') as 'cheap' | 'demo' | 'premium'
const BRAND = getArg('brand', 'Veloxe AI')
const BRAND_SLUG = BRAND.toLowerCase().replace(/\s+/g, '-')
const PEEC_DATA_PATH = getArg('peec-data', '')
// --target-brand defaults to BRAND. When set to a different name (e.g. "OpenAI"),
// the loader pivots the dataset so that brand becomes the analysis subject and
// the project's own brand is moved into the competitors set.
const TARGET_BRAND = getArg('target-brand', BRAND)
const PEEC_PROJECT_ID = process.env.PEEC_PROJECT_ID ?? ''
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY ?? ''
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const PEEC_TOKEN = process.env.PEEC_ACCESS_TOKEN ?? ''

if (!OPENROUTER_KEY) {
  console.error('❌ OPENROUTER_API_KEY env var required')
  process.exit(1)
}

// ─── Model tiers (verified on OpenRouter 2026-04-26) ────────
const MODELS_CHEAP = {
  claude: 'anthropic/claude-haiku-4.5',
  grok:   'x-ai/grok-4-fast',
  gpt:    'openai/gpt-5-mini',
  synth:  'anthropic/claude-sonnet-4.6',
}
// demo = submission-quality run: Sonnet debate agents + Opus synth
const MODELS_DEMO = {
  claude: 'anthropic/claude-sonnet-4.6',
  grok:   'x-ai/grok-4.20',
  gpt:    'openai/gpt-5.4',
  synth:  'anthropic/claude-opus-4.7',
}
const MODELS_PREMIUM = {
  claude: 'anthropic/claude-opus-4.7',
  grok:   'x-ai/grok-4.20',
  gpt:    'openai/gpt-5.5-pro',
  synth:  'anthropic/claude-opus-4.7',
}
const MODELS = TIER === 'premium' ? MODELS_PREMIUM : TIER === 'demo' ? MODELS_DEMO : MODELS_CHEAP

// ─── Helpers ────────────────────────────────────────────────
function getArg(name: string, fallback = ''): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function log(stage: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] [${stage}] ${msg}`)
}

// Structured event stream for the live dashboard backend.
// Lines prefixed with >>EVENT: are picked up by server.ts SSE.
function event(type: string, payload: Record<string, unknown> = {}) {
  console.log(`>>EVENT:${JSON.stringify({ type, ts: Date.now(), ...payload })}`)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Cost estimator (rough — per 1M tokens) ─────────────────
function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates: Record<string, [number, number]> = {
    'anthropic/claude-haiku-4.5':  [0.80,  4.00],
    'x-ai/grok-4-fast':            [0.60,  2.40],
    'openai/gpt-5-mini':           [0.40,  1.60],
    'anthropic/claude-sonnet-4.6': [3.00, 15.00],
    'anthropic/claude-opus-4.7':   [15.0, 75.00],
    'x-ai/grok-4.20':              [2.00,  6.00],
    'openai/gpt-5.4':              [10.0, 40.00],
    'openai/gpt-5.5-pro':          [5.00, 20.00],
  }
  const [rIn, rOut] = rates[model] ?? [3.00, 15.00]
  return (tokensIn * rIn + tokensOut * rOut) / 1_000_000
}

// ─── OpenRouter agent call ───────────────────────────────────
async function callAgent(
  model: string,
  systemPrompt: string,
  userMsg: string,
  maxTokens = 1500
): Promise<{ content: string; tokens_in: number; tokens_out: number; cost_usd: number }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': 'https://arena.veloxe.ai',
      'X-Title': 'ARENA by Veloxe AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMsg },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter [${model}] ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as any
  const content    = data.choices?.[0]?.message?.content ?? ''
  const tokens_in  = data.usage?.prompt_tokens ?? 0
  const tokens_out = data.usage?.completion_tokens ?? 0
  return { content, tokens_in, tokens_out, cost_usd: estimateCost(model, tokens_in, tokens_out) }
}

// ─── Peec MCP direct HTTP client ────────────────────────────
let peecSessionId: string | null = null

async function peecInit(): Promise<void> {
  const res = await fetch('https://api.peec.ai/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PEEC_TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id: '1', method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'arena-veloxe', version: '1.0.0' },
      },
    }),
  })
  const sid = res.headers.get('Mcp-Session-Id')
  if (sid) peecSessionId = sid
}

async function peecCall(toolName: string, args: Record<string, unknown>): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PEEC_TOKEN}`,
  }
  if (peecSessionId) headers['Mcp-Session-Id'] = peecSessionId

  const res = await fetch('https://api.peec.ai/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  })
  if (!res.ok) throw new Error(`Peec MCP ${toolName} error: ${res.status}`)
  const data = await res.json() as any
  if (data.error) throw new Error(`Peec MCP ${toolName}: ${data.error.message}`)
  const result = data.result?.content?.[0]?.text
  if (result) {
    try { return JSON.parse(result) } catch { return result }
  }
  return data.result
}

function zipRows(resp: { columns: string[]; rows: any[][] }): Record<string, any>[] {
  if (!resp?.columns || !resp?.rows) return []
  return resp.rows.map(row =>
    Object.fromEntries(resp.columns.map((col, i) => [col, row[i]]))
  )
}

// ─── Peec ingest types ───────────────────────────────────────
interface PeecData {
  brand: string
  project_id: string
  own_brand: { name: string; visibility: number; share_of_voice: number; sentiment: number; position: number }
  competitors: Array<{ name: string; visibility: number; share_of_voice: number }>
  top_urls: Array<{ url: string; domain: string; citation_rate: number; domain_type: string }>
  actions: Array<{ id: string; summary: string; score: number; slice: string }>
  chats: Array<{ id: string; engine: string; prompt: string; brands_mentioned: string[] }>
  engines: string[]
}

// ─── Load Peec data (3 modes) ────────────────────────────────
async function loadPeecData(): Promise<PeecData> {
  // Mode 1: pre-pulled file (live or cached)
  if (PEEC_DATA_PATH) {
    log('INGEST', `Reading from ${PEEC_DATA_PATH}`)
    const raw = await fs.readFile(PEEC_DATA_PATH, 'utf-8')
    const json = JSON.parse(raw) as any

    // Newer pull format: { all_brands: [...] } with all 9 brands
    // Pivot: pick TARGET_BRAND (case-insensitive substring match) as own; rest = competitors
    if (Array.isArray(json.all_brands) && json.all_brands.length > 0) {
      const target = TARGET_BRAND.toLowerCase().trim()
      const isOwn  = json.all_brands.find((b: any) => b.is_own)
      const subject = json.all_brands.find((b: any) =>
        (b.name ?? '').toLowerCase().trim() === target
      ) ?? json.all_brands.find((b: any) =>
        (b.name ?? '').toLowerCase().includes(target)
      ) ?? isOwn ?? json.all_brands[0]

      log('INGEST', `Subject: ${subject.name} (${subject.is_own ? 'own brand' : 'pivoted via --target-brand'})`)

      const competitors = json.all_brands
        .filter((b: any) => b !== subject)
        .map((b: any) => ({
          name: b.name,
          visibility: Number(b.visibility ?? 0),
          share_of_voice: Number(b.share_of_voice ?? 0),
        }))

      return {
        brand: subject.name,
        project_id: json.project_id ?? PEEC_PROJECT_ID,
        own_brand: {
          name:           subject.name,
          visibility:     Number(subject.visibility ?? 0),
          share_of_voice: Number(subject.share_of_voice ?? 0),
          sentiment:      Number(subject.sentiment ?? 50),
          position:       Number(subject.position ?? 0),
        },
        competitors,
        top_urls: json.top_urls ?? [],
        actions:  json.actions  ?? [],
        chats:    json.chats    ?? [],
        engines:  json.engines  ?? [],
      } as PeecData
    }

    // Legacy / hand-crafted format: assume already shaped with own_brand + competitors
    return json as PeecData
  }

  // Mode 2: direct MCP HTTP (needs PEEC_ACCESS_TOKEN)
  if (PEEC_TOKEN) {
    log('INGEST', 'Pulling live data from Peec MCP...')
    await peecInit()

    const [brandsRaw, actionsRaw, chatsRaw, urlsRaw] = await Promise.all([
      peecCall('list_brands',       { project_id: PEEC_PROJECT_ID }),
      peecCall('get_actions',       { project_id: PEEC_PROJECT_ID, scope: 'overview' }),
      peecCall('list_chats',        { project_id: PEEC_PROJECT_ID, limit: 30 }),
      peecCall('get_domain_report', { project_id: PEEC_PROJECT_ID, limit: 20 }),
    ])

    const brands     = zipRows(brandsRaw)
    const ownBrand   = brands.find((b: any) => b.is_own) ?? brands[0] ?? {}
    const competitors = brands.filter((b: any) => !b.is_own).slice(0, 5)

    const reportRaw = await peecCall('get_brand_report', {
      project_id: PEEC_PROJECT_ID,
      brand_id: ownBrand.id,
      dimensions: ['model_id'],
    })
    const reportRows = zipRows(reportRaw)
    const engines = [...new Set(reportRows.map((r: any) => r.model_id).filter(Boolean))] as string[]

    const chats = zipRows(chatsRaw).map((c: any) => ({
      id: c.id, engine: c.model_id ?? '', prompt: c.prompt_text ?? '',
      brands_mentioned: c.brands_mentioned ?? [],
    }))
    const actions = zipRows(actionsRaw).map((a: any) => ({
      id: a.id, summary: a.summary ?? a.title ?? '', score: a.score ?? 2, slice: a.slice ?? 'editorial',
    }))
    const topUrls = zipRows(urlsRaw).map((u: any) => ({
      url: u.url, domain: u.domain, citation_rate: u.citation_rate ?? 0,
      domain_type: u.classification ?? 'Other',
    }))

    return {
      brand: BRAND, project_id: PEEC_PROJECT_ID,
      own_brand: {
        name:           ownBrand.name ?? BRAND,
        visibility:     (ownBrand.visibility     ?? 0) * 100,
        share_of_voice: (ownBrand.share_of_voice ?? 0) * 100,
        sentiment:       ownBrand.sentiment ?? 50,
        position:        ownBrand.position  ?? 0,
      },
      competitors: competitors.map((c: any) => ({
        name: c.name, visibility: (c.visibility ?? 0) * 100, share_of_voice: (c.share_of_voice ?? 0) * 100,
      })),
      top_urls: topUrls, actions, chats, engines,
    }
  }

  // Mode 3: sample data (dev / demo without Peec creds)
  log('INGEST', 'No Peec token or data file — using built-in sample data')
  return {
    brand: BRAND, project_id: PEEC_PROJECT_ID,
    own_brand: { name: BRAND, visibility: 0, share_of_voice: 0, sentiment: 51, position: 4.2 },
    competitors: [
      { name: 'trysight.ai', visibility: 10.1, share_of_voice: 31.4 },
      { name: 'AthenaHQ',    visibility: 6.3,  share_of_voice: 19.7 },
      { name: 'Profound',    visibility: 8.8,  share_of_voice: 27.2 },
    ],
    top_urls: [
      { url: 'https://superframeworks.com/blog/best-ai-workflow-automation-tools', domain: 'superframeworks.com', citation_rate: 5.2, domain_type: 'Editorial' },
      { url: 'https://arxiv.org/pdf/2401.05998.pdf',                               domain: 'arxiv.org',          citation_rate: 2.71, domain_type: 'Reference' },
      { url: 'https://trysight.ai',                                                 domain: 'trysight.ai',        citation_rate: 10.1, domain_type: 'Competitor' },
      { url: 'https://inventiva.co.in/ai-infrastructure-providers',                domain: 'inventiva.co.in',    citation_rate: 3.8,  domain_type: 'Editorial' },
    ],
    actions: [
      { id: 'act_inventiva',  summary: 'Get listed on inventiva.co.in "Top 10 AI Infrastructure Providers In 2026"',        score: 3, slice: 'editorial' },
      { id: 'act_medium',     summary: 'Get mentioned in or comment on Medium article by richardhightower',                  score: 3, slice: 'editorial' },
      { id: 'act_youtube',    summary: 'Collab with YouTube channel on "Best AI Workflow Platform 2026"',                   score: 3, slice: 'ugc' },
      { id: 'act_reddit',     summary: 'Participate in r/csMajors "AI visibility trackers mathematically useless" thread',  score: 2, slice: 'ugc' },
      { id: 'act_indiatimes', summary: 'Get featured on indiatimes.com Adobe CX Enterprise article',                        score: 1, slice: 'editorial' },
    ],
    chats: [
      { id: 'ch_1', engine: 'chatgpt-scraper', prompt: 'Best AI workflow automation tools under $500/mo',        brands_mentioned: ['Zapier','Make','n8n','Lindy'] },
      { id: 'ch_2', engine: 'perplexity-0',    prompt: 'What tools track AI visibility for brands?',            brands_mentioned: ['Profound','AthenaHQ','trysight.ai'] },
      { id: 'ch_3', engine: 'gemini-0',        prompt: 'AI agentic workflow orchestration comparison 2026',     brands_mentioned: ['LangChain','AutoGPT','n8n'] },
    ],
    engines: ['chatgpt-scraper','perplexity-0','gemini-0','claude-0'],
  }
}

// ─── Agent system prompts ────────────────────────────────────
function r1System(role: string): string {
  const personas: Record<string, string> = {
    claude: `You are the Pattern Analyst. Find the structural signals — WHY certain content wins AI retrieval in this category. Be precise, cite specific numbers from the data.`,
    grok:   `You are the Skeptic. Challenge obvious assumptions. Find the contrarian angle. What's the highest-leverage move most SEOs would miss? What is the conventional wisdom that is actually wrong here?`,
    gpt:    `You are the Strategist. Translate every pattern into a concrete 30-day play: who to contact, what to write, what to pitch. Prioritize by ROI, not complexity.`,
  }
  return `${personas[role]}

Analyze the Peec AI visibility data below. Return ONLY valid JSON — no markdown fences, no preamble:
{
  "visibility_assessment": "2-3 sentence summary of the brand's current AI search standing",
  "top_patterns": [
    { "pattern": "...", "evidence": "specific data point from Peec", "confidence": 0.0 }
  ],
  "recommended_actions": [
    { "action_id": "...", "verdict": "HIGH|PARTIAL|LOW|BLOCKED", "reasoning": "...", "refinement": "specific improvement to Peec's suggestion" }
  ],
  "key_insight": "the one thing most analysts would miss"
}`
}

function r2System(role: string): string {
  const label = { claude: 'Pattern Analyst', grok: 'Skeptic', gpt: 'Strategist' }[role] ?? role
  return `You are the ${label} in Round 2 of the ARENA debate.
You have your own Round 1 analysis and the other two agents' analyses.
Critique each other agent — agree, disagree, or refine. Be adversarial where warranted.

Return ONLY valid JSON:
{
  "critiques": [
    { "target_agent": "claude|grok|gpt", "target_claim": "...", "stance": "agree|disagree|refine", "reasoning": "..." }
  ],
  "defended_positions": ["claims from my R1 I still stand by"],
  "updated_verdict_overrides": [
    { "action_id": "...", "new_verdict": "HIGH|PARTIAL|LOW|BLOCKED", "reason": "..." }
  ]
}`
}

// ─── JSON parser (fault-tolerant) ───────────────────────────
function parseJSON(raw: string): any {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch { /* fall through */ } }
  return { _raw: raw.slice(0, 200), _parse_error: true }
}

// ─── Consensus verdict ───────────────────────────────────────
function consensus(votes: string[]): string {
  if (!votes.length) return 'PARTIAL'
  const tally: Record<string, number> = {}
  votes.forEach(v => { tally[v] = (tally[v] ?? 0) + 1 })
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
}

// ─── Main pipeline ───────────────────────────────────────────
async function main() {
  log('BOOT', `ARENA starting · tier=${TIER} · brand="${BRAND}" · target="${TARGET_BRAND}"`)
  log('BOOT', `Models: claude=${MODELS.claude} | grok=${MODELS.grok} | gpt=${MODELS.gpt} | synth=${MODELS.synth}`)
  event('boot', { tier: TIER, brand: BRAND, target_brand: TARGET_BRAND, models: MODELS })

  const supabase = SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    : null

  const startTime = Date.now()
  let runId = `local_${startTime}`

  if (supabase) {
    const { data: run, error } = await supabase
      .from('arena_runs')
      .insert({ brand: BRAND, project_id: PEEC_PROJECT_ID, status: 'ingesting' })
      .select().single()
    if (!error && run) { runId = run.id; log('INIT', `Supabase run: ${runId}`) }
    else if (error) log('WARN', `Supabase run create failed: ${error.message}`)
  }

  try {
    // ─── INGEST ──────────────────────────────────────────────
    const peecData = await loadPeecData()
    log('INGEST', `Visibility: ${peecData.own_brand.visibility.toFixed(1)}% | Competitors: ${peecData.competitors.length} | Actions: ${peecData.actions.length} | Chats: ${peecData.chats.length}`)
    event('ingest', {
      visibility: peecData.own_brand.visibility,
      share_of_voice: peecData.own_brand.share_of_voice,
      competitors: peecData.competitors.length,
      actions: peecData.actions.length,
      chats: peecData.chats.length,
      top_urls: peecData.top_urls.length,
    })
    if (supabase) await supabase.from('arena_runs').update({ status: 'round-1', peec_chats_analyzed: peecData.chats.length, peec_urls_scraped: peecData.top_urls.length }).eq('id', runId)

    const dataPayload = JSON.stringify(peecData, null, 2)
    const families = ['claude', 'grok', 'gpt'] as const

    // ─── ROUND 1 — independent analysis ─────────────────────
    log('ROUND-1', 'Three agents analyzing in parallel...')
    event('round_1_start', { agents: families })
    const r1Raw = await Promise.all(
      families.map(family => {
        const t0 = Date.now()
        event('agent_thinking', { round: 1, family })
        return callAgent(MODELS[family], r1System(family), dataPayload, 2000)
          .then(res => {
            const parsed = parseJSON(res.content)
            event('agent_complete', {
              round: 1, family,
              model_id: MODELS[family],
              tokens_in: res.tokens_in,
              tokens_out: res.tokens_out,
              cost_usd: res.cost_usd,
              duration_ms: Date.now() - t0,
              parsed,
            })
            return { family, ...res, t0, parsed }
          })
          .catch(err => {
            log('WARN', `${family} R1 failed: ${err.message}`)
            event('agent_error', { round: 1, family, error: err.message })
            return { family, content: '{}', tokens_in: 0, tokens_out: 0, cost_usd: 0, t0, parsed: {} }
          })
      })
    )
    r1Raw.forEach(r => log('ROUND-1', `  ${r.family}: ${r.tokens_out} tok · $${r.cost_usd.toFixed(4)}`))
    event('round_1_complete', {
      total_tokens: r1Raw.reduce((s, r) => s + r.tokens_out, 0),
      total_cost: r1Raw.reduce((s, r) => s + r.cost_usd, 0),
    })

    if (supabase) {
      await supabase.from('arena_agents').insert(
        r1Raw.map(r => ({
          run_id: runId, family: r.family,
          model_id: MODELS[r.family as keyof typeof MODELS],
          phase: 'round-1',
          started_at: new Date(r.t0).toISOString(),
          ended_at: new Date().toISOString(),
          tokens_in: r.tokens_in, tokens_out: r.tokens_out, cost_usd: r.cost_usd,
          content: r.content,
          patterns: (r.parsed?.top_patterns ?? []).map((p: any) => p.pattern ?? ''),
        }))
      )
    }

    // ─── ROUND 2 — adversarial critique ─────────────────────
    log('ROUND-2', 'Cross-agent critique...')
    event('round_2_start', { agents: families })
    if (supabase) await supabase.from('arena_runs').update({ status: 'round-2' }).eq('id', runId)

    const r2Raw = await Promise.all(
      families.map((family, i) => {
        const others = r1Raw.filter((_, j) => j !== i)
        const userMsg = JSON.stringify({
          my_round1_analysis:    r1Raw[i].parsed,
          other_agents_analyses: others.map(o => ({ agent: o.family, analysis: o.parsed })),
          peec_actions:          peecData.actions,
        }, null, 2)
        const t0 = Date.now()
        event('agent_thinking', { round: 2, family })
        return callAgent(MODELS[family], r2System(family), userMsg, 1800)
          .then(res => {
            const parsed = parseJSON(res.content)
            event('agent_complete', {
              round: 2, family,
              model_id: MODELS[family],
              tokens_in: res.tokens_in,
              tokens_out: res.tokens_out,
              cost_usd: res.cost_usd,
              duration_ms: Date.now() - t0,
              parsed,
            })
            return { family, ...res, t0, parsed }
          })
          .catch(err => {
            log('WARN', `${family} R2 failed: ${err.message}`)
            event('agent_error', { round: 2, family, error: err.message })
            return { family, content: '{}', tokens_in: 0, tokens_out: 0, cost_usd: 0, t0, parsed: {} }
          })
      })
    )
    r2Raw.forEach(r => log('ROUND-2', `  ${r.family}: ${r.tokens_out} tok · $${r.cost_usd.toFixed(4)}`))
    event('round_2_complete', {
      total_tokens: r2Raw.reduce((s, r) => s + r.tokens_out, 0),
      total_cost: r2Raw.reduce((s, r) => s + r.cost_usd, 0),
    })

    if (supabase) {
      await supabase.from('arena_agents').insert(
        r2Raw.map(r => ({
          run_id: runId, family: r.family,
          model_id: MODELS[r.family as keyof typeof MODELS],
          phase: 'round-2',
          started_at: new Date(r.t0).toISOString(),
          ended_at: new Date().toISOString(),
          tokens_in: r.tokens_in, tokens_out: r.tokens_out, cost_usd: r.cost_usd,
          content: r.content, patterns: [],
        }))
      )
    }

    // ─── SYNTHESIS ────────────────────────────────────────────
    log('SYNTHESIS', `Synthesizer: ${MODELS.synth}`)
    event('synthesis_start', { model_id: MODELS.synth })
    if (supabase) await supabase.from('arena_runs').update({ status: 'synthesizing' }).eq('id', runId)

    const synthSystem = `You are the ARENA synthesizer. Three frontier AI models have independently analyzed Peec AI visibility data for "${BRAND}" and then critiqued each other in an adversarial debate.

Your job: resolve their debate into a Weekly AEO Brief that a senior SEO consultant would share with a client. Plain English. Actionable. Specific. No jargon about "multi-agent frameworks".

The brief should feel like it came from a consultant who spent 3 hours digging through data — because three AI models did exactly that.`

    const synthUser = `Here is the full debate data. Write the Weekly AEO Brief now.

== PEEC DATA ==
${JSON.stringify({ own_brand: peecData.own_brand, competitors: peecData.competitors, actions: peecData.actions, top_urls: peecData.top_urls }, null, 2)}

== ROUND 1: PATTERN ANALYST (Claude) ==
${r1Raw[0].content}

== ROUND 1: SKEPTIC (Grok) ==
${r1Raw[1].content}

== ROUND 1: STRATEGIST (GPT) ==
${r1Raw[2].content}

== ROUND 2: PATTERN ANALYST CRITIQUE ==
${r2Raw[0].content}

== ROUND 2: SKEPTIC CRITIQUE ==
${r2Raw[1].content}

== ROUND 2: STRATEGIST CRITIQUE ==
${r2Raw[2].content}

---

Write the brief using EXACTLY this format:

# Weekly AEO Brief — ${BRAND}
*${today()} · Generated by ARENA · Powered by Peec MCP*

## Executive Summary
[2-3 sentences: current visibility vs top competitor, biggest opportunity this week, one insight from the debate that Peec alone wouldn't surface]

## This Week's Recommended Actions

### ✅ HIGH — [action summary]
**Consensus:** [N/3 agents] | **Why it wins:** [1 sentence] | **Do this week:** [specific next step]

### 🟡 PARTIAL — [action summary]
**Consensus:** [N/3 agents] | **Condition:** [what needs to be true first] | **Modified play:** [refined approach]

### 🔴 BLOCKED — [action summary]
**Why blocked:** [1 sentence reason from the debate] | **Better alternative:** [what to do instead]

(Use HIGH/PARTIAL/BLOCKED/LOW for each action from the Peec data)

## Content Patterns That Win AI Retrieval
| Pattern | Evidence from Peec | Engines |
|---------|-------------------|---------|
[3-5 rows of actual patterns the agents found]

## Competitor Watch
[Top 2-3 competitors. One sentence each: what they're doing right and how to counter it]

## Content Briefs Ready for Your Writers
### Brief 1: [Title]
**Target prompt:** "[exact query]" | **Format:** [listicle/comparison/guide] | **Length:** [words]
[3-4 sentences on what to include, why this wins retrieval, and what angle to take]

### Brief 2: [Title]
[same format]

## Sources Analyzed
${peecData.top_urls.map(u => {
  const href = u.url.startsWith('http') ? u.url : `https://${u.url}`
  return `- [${u.domain}](${href}) — citation rate: ${u.citation_rate}x · ${u.domain_type}`
}).join('\n')}`

    const t0Synth = Date.now()
    const synthResult = await callAgent(MODELS.synth, synthSystem, synthUser, 4500)
    log('SYNTHESIS', `Done: ${synthResult.tokens_out} tok · $${synthResult.cost_usd.toFixed(4)}`)
    // Note: brief_md emitted in 'done' event below (after briefPath assembly)
    event('synthesis_complete', {
      tokens_out: synthResult.tokens_out,
      cost_usd: synthResult.cost_usd,
    })

    if (supabase) {
      await supabase.from('arena_agents').insert({
        run_id: runId, family: 'claude', model_id: MODELS.synth, phase: 'synthesis',
        started_at: new Date(t0Synth).toISOString(), ended_at: new Date().toISOString(),
        tokens_in: synthResult.tokens_in, tokens_out: synthResult.tokens_out, cost_usd: synthResult.cost_usd,
        content: synthResult.content, patterns: [],
      })
    }

    // ─── WRITE BRIEF ─────────────────────────────────────────
    // Compute runtime now so the brief footer can include it as proof
    const briefDurationMs = Date.now() - startTime
    const briefRuntimeStr = `${(briefDurationMs / 1000).toFixed(1)}s`
    const finishedAt = new Date()
    const finishedAtIso = finishedAt.toISOString()
    const finishedAtClock = finishedAtIso.slice(0, 19).replace('T', ' ') + ' UTC'

    // Sum agent costs so far (R1 + R2 + synthesis)
    const briefCostUsd =
      r1Raw.reduce((s, r) => s + r.cost_usd, 0) +
      r2Raw.reduce((s, r) => s + r.cost_usd, 0) +
      synthResult.cost_usd

    // If subject was pivoted (e.g. brief about OpenAI generated from a Veloxe-AI Peec project),
    // append a one-line transparency disclaimer so judges/readers know the framing.
    const isPivoted = TARGET_BRAND.toLowerCase() !== BRAND.toLowerCase() ||
                       peecData.own_brand.name.toLowerCase() !== TARGET_BRAND.toLowerCase()
    const pivotNote = isPivoted
      ? `\n*Subject pivot: this brief is framed around ${peecData.own_brand.name}; the underlying Peec project's tracked own-brand is different. Visibility / share-of-voice / domain patterns reflect ${peecData.own_brand.name} accurately; recommended-actions surface what the project's own-brand would do against the same competitive landscape.*`
      : ''

    const totalTokensSoFar =
      r1Raw.reduce((s, r) => s + r.tokens_out, 0) +
      r2Raw.reduce((s, r) => s + r.tokens_out, 0) +
      synthResult.tokens_out

    // Strip whatever date-subtitle line the synth model may have written
    // and replace with our enriched run-stats line right under the H1.
    const synthClean = synthResult.content.replace(
      /(^# Weekly AEO Brief[^\n]*\n)\*[^\n]*\*\n?/m,
      '$1',
    )

    const briefMd = `${synthClean.replace(
      /(^# Weekly AEO Brief[^\n]*\n)/m,
      `$1**\`${finishedAtClock}\`** · Runtime **${briefRuntimeStr}** · Cost **$${briefCostUsd.toFixed(2)}** · ${totalTokensSoFar.toLocaleString()} tokens · 3 frontier models · 2 rounds of debate · powered by [Peec AI MCP](https://peec.ai)\n\n`,
    )}

---
*Generated by ARENA · Run \`${runId.slice(0, 8)}\` · ${finishedAtClock} · Runtime ${briefRuntimeStr} · Cost $${briefCostUsd.toFixed(4)} · Powered by [Peec AI MCP](https://peec.ai) · Built by [Veloxe AI](https://veloxe.ai)*
*3 frontier models · ${peecData.chats.length} tracked chats · ${peecData.top_urls.length} cited sources · ${peecData.actions.length} Peec actions debated*${pivotNote}`

    const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
    const briefDir  = path.resolve(scriptDir, '..', 'briefs')
    await fs.mkdir(briefDir, { recursive: true })
    const briefPath = path.join(briefDir, `${today()}-${BRAND_SLUG}.md`)
    const latestPath = path.join(briefDir, `latest.md`)
    await fs.writeFile(briefPath, briefMd, 'utf-8')
    await fs.writeFile(latestPath, briefMd, 'utf-8')
    log('BRIEF', `Saved → ${briefPath}`)
    log('BRIEF', `Saved → ${latestPath} (showcase mirror — dashboard reads from here)`)

    // ─── VERDICTS from debate consensus ──────────────────────
    const verdictMap = new Map<string, { votes: string[]; reasonings: string[]; refinements: string[] }>(
      peecData.actions.map(a => [a.id, { votes: [], reasonings: [], refinements: [] }])
    )
    for (const r of r1Raw) {
      for (const rec of (r.parsed?.recommended_actions ?? [])) {
        const v = verdictMap.get(rec.action_id)
        if (v) { v.votes.push(rec.verdict); v.reasonings.push(rec.reasoning ?? ''); if (rec.refinement) v.refinements.push(rec.refinement) }
      }
    }
    for (const r of r2Raw) {
      for (const ov of (r.parsed?.updated_verdict_overrides ?? [])) {
        verdictMap.get(ov.action_id)?.votes.push(ov.new_verdict)
      }
    }

    const verdicts = peecData.actions.map(action => {
      const v = verdictMap.get(action.id)!
      return {
        run_id: runId,
        peec_action_id: action.id,
        peec_action_summary: action.summary,
        peec_score: action.score,
        arena_verdict: consensus(v.votes),
        consensus_count: v.votes.length,
        reasoning: v.reasonings.slice(0, 2).join(' | ') || 'Consensus via adversarial debate.',
        refinements: v.refinements.slice(0, 3),
      }
    })

    const citations = peecData.top_urls.map(u => ({
      run_id: runId, url: u.url, domain: u.domain,
      peec_citation_count: Math.round(u.citation_rate * 10),
      peec_citation_rate: u.citation_rate,
      domain_type: u.domain_type as any,
      extracted_patterns: [],
      content_snippet: '',
    }))

    if (supabase && verdicts.length) {
      const { error } = await supabase.from('arena_verdicts').insert(verdicts)
      if (error) log('WARN', `Verdicts insert: ${error.message}`)
    }
    if (supabase && citations.length) {
      const { error } = await supabase.from('arena_citations').insert(citations)
      if (error) log('WARN', `Citations insert: ${error.message}`)
    }

    // ─── FINALIZE ─────────────────────────────────────────────
    const allResults = [...r1Raw, ...r2Raw, synthResult]
    const totalCost   = allResults.reduce((s, r) => s + r.cost_usd, 0)
    const totalTokens = allResults.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0)
    const durationMs  = Date.now() - startTime

    if (supabase) {
      await supabase.from('arena_runs').update({
        status: 'done',
        total_cost_usd:    totalCost,
        total_tokens:      totalTokens,
        duration_ms:       durationMs,
        consensus_patterns: r1Raw.reduce((s, r) => s + (r.parsed?.top_patterns?.length ?? 0), 0),
        summary:           synthResult.content.slice(0, 500),
      }).eq('id', runId)
    }

    console.log('\n' + '═'.repeat(60))
    console.log(briefMd.slice(0, 1000))
    console.log('... [see full brief at ' + briefPath + ']')
    console.log('═'.repeat(60))
    log('DONE', `$${totalCost.toFixed(4)} · ${totalTokens.toLocaleString()} tokens · ${(durationMs / 1000).toFixed(1)}s`)
    log('DONE', `Brief: ${briefPath}`)
    event('done', {
      run_id: runId,
      brand: BRAND,
      cost_total_usd: totalCost,
      tokens_total: totalTokens,
      duration_ms: durationMs,
      brief_path: briefPath,
      brief_md: briefMd,
      verdicts: verdicts.map(v => ({
        peec_action_summary: v.peec_action_summary,
        arena_verdict: v.arena_verdict,
        consensus_count: v.consensus_count,
      })),
      citations: peecData.top_urls,
    })

  } catch (err: any) {
    log('ERROR', err?.message ?? String(err))
    if (supabase) await supabase.from('arena_runs').update({ status: 'error', error_message: err?.message ?? String(err) }).eq('id', runId)
    process.exit(1)
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
