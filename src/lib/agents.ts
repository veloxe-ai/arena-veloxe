import type { AgentProfile, ModelFamily } from '../types'

// ═══════════════════════════════════════════════════════════
// The 3 Agents of the Arena (v3 pattern, ported from D:\sealsd-app + AI Arena v3)
//   Cheap tier (dev) — Haiku · Grok-fast · GPT-5-mini
//   Demo tier (submission) — Sonnet · Grok-4.20 · GPT-5.4 + Opus synth
//   Premium tier — Opus · Grok-4.20 · GPT-5.5-pro
// ═══════════════════════════════════════════════════════════

export const AGENT_PROFILES: Record<ModelFamily, AgentProfile> = {
  claude: {
    id: 'claude',
    label: 'Claude',
    modelId: 'anthropic/claude-sonnet-4.6',
    role: 'Pattern Analyst',
    color: 'claude',
  },
  grok: {
    id: 'grok',
    label: 'Grok',
    modelId: 'x-ai/grok-4.20',
    role: 'Skeptic',
    color: 'grok',
  },
  gpt: {
    id: 'gpt',
    label: 'GPT',
    modelId: 'openai/gpt-5.4',
    role: 'Strategist',
    color: 'gpt',
  },
}

// Display order — Claude / Grok / GPT (matches v3 workflow lanes)
export const AGENT_ORDER: ModelFamily[] = ['claude', 'grok', 'gpt']

export const MODEL_BORDER: Record<ModelFamily, string> = {
  gpt:    'border-gpt/30',
  claude: 'border-claude/30',
  grok:   'border-grok/30',
}

export const MODEL_DOT: Record<ModelFamily, string> = {
  gpt:    'bg-gpt',
  claude: 'bg-claude',
  grok:   'bg-grok',
}

export const MODEL_TEXT: Record<ModelFamily, string> = {
  gpt:    'text-gpt',
  claude: 'text-claude',
  grok:   'text-grok',
}
