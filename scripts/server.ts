#!/usr/bin/env tsx
// ═══════════════════════════════════════════════════════════
// ARENA SERVER — minimal Express + SSE for the live dashboard
//
// Endpoints:
//   POST /api/run        → spawn orchestrate.ts, return { run_id }
//   GET  /api/stream/:id → SSE: pipes >>EVENT: events from the running orchestrator
//   GET  /api/brief/:id  → serves the generated brief markdown
//   GET  /api/health     → { ok, total_cost_usd, runs_active, runs_total }
//
// Env:
//   PORT=4001
//   COST_CAP_USD=10           hard kill if cumulative spend exceeds this
//   ARENA_HOME=/root/arena-veloxe
//   PEEC_DATA_DIR=/root/arena-veloxe/peec-data    pre-staged json files per brand
//
// Brand → peec-data mapping is by lowercase-slug match against PEEC_DATA_DIR/<slug>.json
// ═══════════════════════════════════════════════════════════

import express, { Request, Response } from 'express'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'

const PORT = Number(process.env.PORT ?? 4001)
const COST_CAP = Number(process.env.COST_CAP_USD ?? 10)
const ARENA_HOME = process.env.ARENA_HOME ?? path.resolve(process.cwd())
const PEEC_DIR = process.env.PEEC_DATA_DIR ?? path.join(ARENA_HOME, 'peec-data')
const BRIEFS_DIR = path.join(ARENA_HOME, 'briefs')

interface ArenaEvent {
  type: string
  ts: number
  [k: string]: unknown
}

interface RunState {
  id: string
  brand: string
  startedAt: number
  endedAt?: number
  status: 'running' | 'done' | 'error'
  events: ArenaEvent[]
  subscribers: Set<Response>
  child: ChildProcessWithoutNullStreams | null
  costUsd: number
  briefPath?: string
}

const runs = new Map<string, RunState>()
let totalCostSpent = 0
let totalRunsCount = 0

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function broadcast(run: RunState, event: ArenaEvent) {
  run.events.push(event)
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const sub of run.subscribers) {
    try { sub.write(payload) } catch { /* subscriber dropped */ }
  }
}

async function findPeecDataFile(brand: string): Promise<string | null> {
  const slug = slugify(brand)
  // Try exact slug match
  const candidates = [
    path.join(PEEC_DIR, `${slug}.json`),
    path.join(PEEC_DIR, `peec-data-${slug}.json`),
  ]
  for (const c of candidates) {
    try { await fs.access(c); return c } catch { /* try next */ }
  }
  // Fallback: list dir, look for files containing slug
  try {
    const files = await fs.readdir(PEEC_DIR)
    const match = files.find(f => f.toLowerCase().includes(slug))
    if (match) return path.join(PEEC_DIR, match)
  } catch { /* no dir */ }
  return null
}

// Wire a child process's stdout/stderr to our SSE broadcaster.
// Returns a promise that resolves when the child exits cleanly (0).
function pipeChildToBroadcast(
  run: RunState,
  child: ChildProcessWithoutNullStreams,
  costTracking = true,
): Promise<number> {
  let buf = ''
  child.stdout.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('>>EVENT:')) {
        try {
          const event: ArenaEvent = JSON.parse(trimmed.slice(8))
          if (typeof event === 'object' && event !== null && typeof event.type === 'string') {
            if (costTracking) {
              if (event.type === 'agent_complete' && typeof event.cost_usd === 'number') {
                run.costUsd += event.cost_usd
                totalCostSpent += event.cost_usd
              }
              if (event.type === 'synthesis_complete' && typeof event.cost_usd === 'number') {
                run.costUsd += event.cost_usd
                totalCostSpent += event.cost_usd
              }
            }
            if (event.type === 'done' && typeof event.brief_path === 'string') {
              run.briefPath = event.brief_path
            }
            broadcast(run, event)
          }
        } catch { /* malformed */ }
      } else if (trimmed) {
        broadcast(run, { type: 'log', ts: Date.now(), line: trimmed })
      }
    }
  })
  child.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString().trim()
    if (text) broadcast(run, { type: 'stderr', ts: Date.now(), line: text })
  })
  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? -1))
  })
}

// Synchronously create + register the run state, then kick off the two phases
// in the background. Returns immediately so /api/run can hand back the run_id
// before the long-running work completes.
function spawnLiveRun(brand: string): RunState {
  const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: RunState = {
    id, brand,
    startedAt: Date.now(),
    status: 'running',
    events: [],
    subscribers: new Set(),
    child: null,
    costUsd: 0,
  }
  runs.set(id, run)
  // Fire and forget — phases broadcast events as they progress.
  void executeLiveRun(run).catch((err) => {
    broadcast(run, { type: 'stderr', ts: Date.now(), line: `[arena-server] fatal: ${err?.message ?? String(err)}` })
    run.endedAt = Date.now()
    run.status = 'error'
    broadcast(run, { type: 'exit', ts: Date.now(), code: -1 })
    for (const sub of run.subscribers) { try { sub.end() } catch {} }
    run.subscribers.clear()
    setTimeout(() => runs.delete(run.id), 10 * 60 * 1000)
  })
  return run
}

async function executeLiveRun(run: RunState): Promise<void> {
  const projectId = process.env.PEEC_PROJECT_ID ?? ''
  const peecOutPath = path.join(PEEC_DIR, `live-${run.id}.json`)

  // ─── PHASE 1: peec-pull.sh (fresh MCP pull every click) ─────────
  broadcast(run, { type: 'log', ts: Date.now(), line: `[arena-server] phase 1 — peec-pull live MCP for "${run.brand}"` })

  const pullChild = spawn('bash', [
    path.join(ARENA_HOME, 'scripts/peec-pull.sh'),
    run.brand,
    projectId,
    '--output', peecOutPath,
  ], {
    cwd: ARENA_HOME,
    env: { ...process.env },
  })
  run.child = pullChild
  const pullExit = await pipeChildToBroadcast(run, pullChild, false)
  if (pullExit !== 0) {
    run.endedAt = Date.now()
    run.status = 'error'
    broadcast(run, { type: 'exit', ts: Date.now(), code: pullExit, phase: 'peec_pull' })
    for (const sub of run.subscribers) { try { sub.end() } catch {} }
    run.subscribers.clear()
    setTimeout(() => runs.delete(run.id), 10 * 60 * 1000)
    return
  }

  // ─── PHASE 2: orchestrate.ts with the freshly-pulled data + target-brand pivot ───
  broadcast(run, { type: 'log', ts: Date.now(), line: `[arena-server] phase 2 — orchestrating debate, target="${run.brand}"` })

  const orchChild = spawn('npx', [
    'tsx',
    path.join(ARENA_HOME, 'scripts/orchestrate.ts'),
    '--brand', run.brand,
    '--target-brand', run.brand,
    '--peec-data', peecOutPath,
  ], {
    cwd: ARENA_HOME,
    env: { ...process.env, MODEL_TIER: process.env.MODEL_TIER ?? 'demo' },
  })
  run.child = orchChild
  const orchExit = await pipeChildToBroadcast(run, orchChild, true)

  // ─── DONE / cleanup ─────────────────────────────────────────────
  run.endedAt = Date.now()
  run.status = orchExit === 0 ? 'done' : 'error'
  broadcast(run, { type: 'exit', ts: Date.now(), code: orchExit })
  setTimeout(() => fs.unlink(peecOutPath).catch(() => {}), 60 * 60 * 1000)
  for (const sub of run.subscribers) { try { sub.end() } catch {} }
  run.subscribers.clear()
  setTimeout(() => runs.delete(run.id), 10 * 60 * 1000)
}

// ─── Express app ─────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '512kb' }))

// CORS — allow the dashboard origin (set ARENA_ORIGIN to lock down in prod)
app.use((req, res, next) => {
  const origin = process.env.ARENA_ORIGIN ?? '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    total_cost_usd: totalCostSpent.toFixed(4),
    cost_cap_usd: COST_CAP,
    runs_active: [...runs.values()].filter(r => r.status === 'running').length,
    runs_total: totalRunsCount,
  })
})

app.post('/api/run', async (req, res) => {
  const brand = String(req.body?.brand ?? '').trim()
  if (!brand) return res.status(400).json({ error: 'brand required' })
  if (brand.length > 100) return res.status(400).json({ error: 'brand too long' })

  // Cost-cap kill switch
  if (totalCostSpent >= COST_CAP) {
    return res.status(429).json({
      error: 'demo cost cap reached',
      total_cost_usd: totalCostSpent.toFixed(2),
      cost_cap_usd: COST_CAP,
      hint: 'fork the repo and run on your own OpenRouter key',
    })
  }
  // Concurrent-run limit (live mode = peec-pull running in parallel could collide)
  const active = [...runs.values()].filter(r => r.status === 'running').length
  if (active >= 1) {
    return res.status(429).json({ error: 'another run is already in progress — please wait ~2 min' })
  }

  // Kick off live run (peec-pull → orchestrate) in the background.
  // spawnLiveRun returns sync with the run id; phase work continues async.
  const run = spawnLiveRun(brand)
  totalRunsCount++
  res.json({ run_id: run.id, brand, mode: 'live' })
})

// In live mode, /api/brands returns the configured demo set rather than scanning
// pre-staged files (there are none — every run pulls fresh). Configurable via
// ARENA_DEMO_BRANDS=Veloxe AI,OpenAI,Anthropic in the environment.
app.get('/api/brands', (_req, res) => {
  const fromEnv = process.env.ARENA_DEMO_BRANDS
  const brands = fromEnv
    ? fromEnv.split(',').map(s => s.trim()).filter(Boolean)
    : ['Veloxe AI', 'OpenAI', 'Anthropic']
  res.json({ brands })
})

app.get('/api/stream/:id', (req, res) => {
  const run = runs.get(req.params.id)
  if (!run) return res.status(404).end()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering for SSE
  res.flushHeaders()

  // Replay all events captured so far
  for (const e of run.events) {
    res.write(`data: ${JSON.stringify(e)}\n\n`)
  }

  if (run.status === 'running') {
    run.subscribers.add(res)
    req.on('close', () => { run.subscribers.delete(res) })
  } else {
    // Run already finished — close stream
    res.end()
  }
})

app.get('/api/brief/:id', async (req, res) => {
  const run = runs.get(req.params.id)
  if (!run || !run.briefPath) {
    // Fallback: serve briefs/latest.md
    try {
      const md = await fs.readFile(path.join(BRIEFS_DIR, 'latest.md'), 'utf-8')
      return res.type('text/markdown').send(md)
    } catch {
      return res.status(404).send('brief not available')
    }
  }
  try {
    const md = await fs.readFile(run.briefPath, 'utf-8')
    res.type('text/markdown').send(md)
  } catch {
    res.status(404).send('brief file missing')
  }
})

app.get('/api/brief/latest', async (_req, res) => {
  try {
    const md = await fs.readFile(path.join(BRIEFS_DIR, 'latest.md'), 'utf-8')
    res.type('text/markdown').send(md)
  } catch {
    res.status(404).send('no latest brief')
  }
})

app.listen(PORT, () => {
  console.log(`[arena-server] listening on :${PORT}`)
  console.log(`[arena-server] arena home: ${ARENA_HOME}`)
  console.log(`[arena-server] peec data dir: ${PEEC_DIR}`)
  console.log(`[arena-server] cost cap: $${COST_CAP}`)
})
