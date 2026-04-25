// ═══════════════════════════════════════════════════════════
// Sample data from the ACTUAL Peec MCP recon on 2026-04-24.
// Used for initial dashboard render before Saturday's full pipeline.
// ═══════════════════════════════════════════════════════════

import type { ArenaRun, AgentOutput, ArenaVerdict, ArenaCitation, TelemetrySnapshot } from '../types'
// Vite raw import — the actual generated brief from a real ARENA run
import latestBriefMd from '../../briefs/latest.md?raw'

export const SAMPLE_RUN: ArenaRun = {
  id: 'run_local_18',
  created_at: '2026-04-25T12:54:47Z',
  brand: 'Veloxe AI',
  project_id: 'your-peec-project-id',
  prompt_focus: null,
  status: 'done',
  total_cost_usd: 0.1147,
  total_tokens: 38839,
  duration_ms: 147500,
  peec_chats_analyzed: 30,
  peec_urls_scraped: 20,
  consensus_patterns: 5,
  dissent_flags: 2,
  summary: latestBriefMd,
}

export const SAMPLE_AGENT_OUTPUTS: AgentOutput[] = [
  {
    run_id: SAMPLE_RUN.id,
    family: 'gpt',
    model_id: 'openai/gpt-5.5-pro',
    phase: 'round-1',
    started_at: '2026-04-24T20:00:05Z',
    ended_at: '2026-04-24T20:00:42Z',
    tokens_in: 4820,
    tokens_out: 1104,
    cost_usd: 0.247,
    reasoning_depth: 8,
    confidence: 0.82,
    content:
      'Analysis of 10 retrieved URLs for "AI workflow automation under $500/mo": 8 of 10 sources are round-up/listicle format. Winning structural signals: (1) explicit pricing columns, (2) 5-10 competitor comparison, (3) H2 sections named "Best X for Y" match common user intent patterns. Veloxe AI absence consistent across Perplexity + ChatGPT retrievals.',
    patterns: [
      'Round-up listicles dominate retrieval (80% of sources)',
      'Explicit pricing tables increase citation rate',
      'H2 sections matching user-intent phrasing ("best X for Y")',
    ],
  },
  {
    run_id: SAMPLE_RUN.id,
    family: 'claude',
    model_id: 'anthropic/claude-opus-4.7',
    phase: 'round-1',
    started_at: '2026-04-24T20:00:05Z',
    ended_at: '2026-04-24T20:00:48Z',
    tokens_in: 4820,
    tokens_out: 1342,
    cost_usd: 0.302,
    reasoning_depth: 9,
    confidence: 0.88,
    content:
      'Nuanced read: while round-ups dominate, there is a distinction between retrieval-visibility and training-visibility. Perplexity retrieves 10 URLs but cites 0 inline — the named brands (Zapier, Make, n8n, Lindy) come from the model\'s training data, not retrieval. Implication: short-term path = get retrieved (listicle outreach); long-term path = get into training data (age, canonical authority, backlinks).',
    patterns: [
      'Distinction between retrieval-visibility (short-term) and training-visibility (long-term)',
      'Round-ups drive retrieval; training data drives brand-name recall',
      'Competitor trysight.ai at 10.1% suggests training-data presence, not retrieval alone',
    ],
  },
  {
    run_id: SAMPLE_RUN.id,
    family: 'grok',
    model_id: 'x-ai/grok-4.20',
    phase: 'round-1',
    started_at: '2026-04-24T20:00:05Z',
    ended_at: '2026-04-24T20:00:36Z',
    tokens_in: 4820,
    tokens_out: 892,
    cost_usd: 0.111,
    reasoning_depth: 7,
    confidence: 0.76,
    content:
      'Contrarian take: roundup saturation is a trap. The top round-up authors (superframeworks, thedigitalprojectmanager, whalesync) already list 10-15 tools each. Breaking into #11 on a list ≠ becoming a cited brand. Higher-leverage: own a specific technical niche where no incumbent exists. Veloxe\'s "adversarial debate engine" framing is such a niche — literally zero current retrievals match it.',
    patterns: [
      'Listicle saturation means #11 placement has diminishing returns',
      'Unoccupied technical niche ("adversarial debate engine") is ownable',
      'Niche ownership > crowded list inclusion',
    ],
  },
]

export const SAMPLE_VERDICTS: ArenaVerdict[] = [
  {
    run_id: SAMPLE_RUN.id,
    peec_action_id: 'act_indiatimes_adobe',
    peec_action_summary: 'Get featured on indiatimes.com Adobe CX Enterprise article',
    peec_score: 3,
    arena_verdict: 'LOW',
    consensus_count: 3,
    reasoning:
      'Topic mismatch — the article is about Adobe\'s CX Enterprise product, not agentic AI broadly. Authors rarely retrofit published pieces for unrelated brands. Peec\'s signal (URL is being retrieved) is valid, but the action is practically not executable.',
    refinements: [
      'Target NEW indiatimes articles specifically about AI agents / orchestration',
      'Pitch a guest column on agentic AI market trends instead',
    ],
  },
  {
    run_id: SAMPLE_RUN.id,
    peec_action_id: 'act_medium_hightower',
    peec_action_summary: 'Get mentioned in or comment on Medium article by richardhightower',
    peec_score: 3,
    arena_verdict: 'PARTIAL',
    consensus_count: 3,
    reasoning:
      'Comment path = low ROI (Medium comments have weak signal). Self-publishing angle is stronger but needs to be BEST-of-category, not just present. Claude flagged: marketing engineers judge Medium by author authority + article depth, not brand mention presence.',
    refinements: [
      'Publish THE definitive Medium article on multi-agent orchestration comparison (skip commenting)',
      'Target long-form (>2500 words) with code examples + benchmarks',
    ],
  },
  {
    run_id: SAMPLE_RUN.id,
    peec_action_id: 'act_inventiva_listicle',
    peec_action_summary: 'Get listed on inventiva.co.in "Top 10 AI Infrastructure Providers In 2026"',
    peec_score: 3,
    arena_verdict: 'HIGH',
    consensus_count: 3,
    reasoning:
      'Solid. Listicle outreach is a proven AEO play. All 4 agents agree on directional value. Arena adds: verify inventiva.co.in authority signal vs alternative listicle venues before committing outreach time.',
    refinements: [
      'Cross-reference inventiva.co.in Ahrefs DR vs other retrieved listicle domains',
      'Prepare pre-written blurb + positioning angle before outreach',
    ],
  },
  {
    run_id: SAMPLE_RUN.id,
    peec_action_id: 'act_reddit_csmajors',
    peec_action_summary: 'Participate in r/csMajors + "AI visibility trackers mathematically useless" posts',
    peec_score: 3,
    arena_verdict: 'BLOCKED',
    consensus_count: 3,
    reasoning:
      'UNANIMOUS REJECTION across all 3 agents. Peec is recommending we publish content that trashes its own product category ("AI visibility trackers mathematically useless"). Executing this would (a) damage partner relationship with Peec, (b) conflict with Veloxe\'s use of visibility data, (c) be off-brand negative marketing. Arena flags this as a Peec algorithm hiccup — action should not execute.',
    refinements: [
      'Ignore this specific Reddit angle',
      'Alternative: participate in r/csMajors on agentic AI career trajectory topics (on-brand for Veloxe hiring)',
    ],
  },
  {
    run_id: SAMPLE_RUN.id,
    peec_action_id: 'act_youtube_collab',
    peec_action_summary: 'Collab with YouTube channel on "Best AI Workflow Platform 2026"',
    peec_score: 3,
    arena_verdict: 'PARTIAL',
    consensus_count: 3,
    reasoning:
      'Directionally correct — video content retrieves well on Perplexity. But Peec doesn\'t surface channel authority metrics. Grok flagged: a 500-sub channel collab has far weaker signal than a 50k+ sub channel. Action is not prioritizable without that metric.',
    refinements: [
      'Pull subscriber count + avg view count before committing outreach',
      'Prioritize channels with >25k subs and >5k avg views',
      'Produce OWN YouTube short on topic if external collab unavailable',
    ],
  },
]

export const SAMPLE_CITATIONS: ArenaCitation[] = [
  {
    run_id: SAMPLE_RUN.id,
    url: 'https://arxiv.org/pdf/2401.05998.pdf',
    domain: 'arxiv.org',
    peec_citation_count: 26,
    peec_citation_rate: 2.71,
    domain_type: 'Reference',
    extracted_patterns: [
      'Academic multi-agent debate research',
      'CMU affiliation (Chern, Fan, Liu 2024)',
      'Peer-reviewed credibility signal',
    ],
    content_snippet:
      'Combating Adversarial Attacks with Multi-Agent Debate — Steffi Chern, Zhen Fan, Andy Liu, Carnegie Mellon University. While state-of-the-art language models have achieved impressive results, they remain susceptible to inference-time adversarial attacks... Multi-agent debate is a technique where multiple instances of a language model critique each others\' responses...',
  },
  {
    run_id: SAMPLE_RUN.id,
    url: 'https://trysight.ai',
    domain: 'trysight.ai',
    peec_citation_count: 18,
    peec_citation_rate: 10.1,
    domain_type: 'Competitor',
    extracted_patterns: [
      'Direct competitor in AI visibility space',
      'Corporate domain type — high AI trust signal',
      'Likely has training-data presence (brand-name recall)',
    ],
    content_snippet: '(trysight.ai content — winning competitor in the AI visibility category)',
  },
  {
    run_id: SAMPLE_RUN.id,
    url: 'https://superframeworks.com/blog/best-ai-workflow-automation-tools',
    domain: 'superframeworks.com',
    peec_citation_count: 12,
    peec_citation_rate: 5.2,
    domain_type: 'Editorial',
    extracted_patterns: [
      'Round-up listicle format',
      'Pricing table with specific tier comparisons',
      'H2 matching user-intent phrasing',
    ],
    content_snippet:
      'Best AI Workflow Automation Tools for 2026 — compared side-by-side across pricing, features, integration count, and ease of setup. Zapier, Make, n8n, Lindy, Relay, and more...',
  },
]

export const SAMPLE_TELEMETRY: TelemetrySnapshot = {
  runs_today: 1,
  runs_week: 1,
  total_cost_today_usd: 0.834,
  total_cost_week_usd: 0.834,
  model_leaderboard: [
    { family: 'claude', consensus_wins: 3 },
    { family: 'gpt',    consensus_wins: 2 },
    { family: 'grok',   consensus_wins: 1 },
  ],
  peec_data_freshness_hours: 0.7,
}
