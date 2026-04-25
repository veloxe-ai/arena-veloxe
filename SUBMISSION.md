# Peec MCP Challenge — Submission Package

**Submitter:** Jerry Odom · [Veloxe AI](https://veloxe.ai)
**Project:** ARENA — Weekly AEO Brief Generator
**Category (primary):** Content Optimization
**Category (secondary fit):** Competitive Analysis
**Live demo:** https://arena.veloxe.ai
**Repository:** https://github.com/veloxe-ai/arena-veloxe (MIT)
**Sample brief:** [`briefs/2026-04-25-veloxe-ai.md`](briefs/2026-04-25-veloxe-ai.md)
**Hashtag:** `#BuiltWithPeec`

---

## 1 · One-line description

ARENA generates a Weekly AEO Brief by orchestrating an adversarial debate among three frontier models over Peec AI's visibility data, producing consensus-validated recommendations marketers can act on with confidence — at $0.08 per run.

## 2 · The problem it solves

SEO and content teams using Peec are sitting on rich data (visibility scores, top-cited URLs, recommended actions) but still spend hours each week reading the dashboard and translating it into a list of decisions. Some of Peec's recommended actions look reasonable on first read but break down on closer inspection — Wikipedia pages a brand isn't notable enough for, content angles that conflict with positioning, outreach plays that read as spam.

ARENA collapses that hour-long synthesis step into a 95-second pipeline and adds a debate layer that catches the brittle recommendations before anyone acts on them. The output is a markdown brief in the format an SEO consultant would hand a client.

## 3 · Real example from the submission run

When we ran ARENA on Veloxe AI's actual Peec project, one of the actions in `get_actions` was to *establish a Wikipedia page for Veloxe AI*. Peec scored it 2/3.

After debate, all three agents downgraded it to **BLOCKED** with the same reasoning: a brand at zero editorial coverage doesn't meet Wikipedia's notability bar. A page submitted now would be flagged for deletion, and a deletion is a permanent negative signal that's harder to recover from than simply not having a page yet. The agents proposed an alternative: contribute to *existing* Wikipedia articles to build platform familiarity, then return to a standalone page after 4–5 editorial wins establish third-party notability.

That's the kind of judgment a single-model recommendation engine doesn't surface. It's the kind a senior consultant would.

> **Note on the data:** Peec's auto-classification placed Veloxe AI alongside foundation labs (OpenAI, Anthropic, Hugging Face) rather than direct orchestration peers. We left the brief honest about this rather than re-scope the project to flatter the narrative. The agents handled it well — recommending Veloxe own the "alternative to OpenAI" framing rather than try to match foundation-lab visibility spend. The brief's value isn't that the data was clean; it's that the strategic response to imperfect data was sound.

## 4 · How it uses Peec MCP

| Peec MCP tool | Role in ARENA |
|---------------|---------------|
| `list_brands` | Identify own brand + top competitors |
| `get_brand_report` | Visibility, share-of-voice, sentiment baseline |
| `get_domain_report` | Top cited domains with citation rates and types |
| `get_actions` | The recommendation set ARENA debates |
| `list_chats` | Tracked conversations across engines |

5 tools in the cheap-tier pipeline. The architecture cleanly extends to additional Peec tools (`get_url_content`, `get_url_report`, `list_search_queries`) for richer briefs in higher tiers.

## 5 · Architecture

```
Peec AI MCP (api.peec.ai/mcp)
   │  list_brands · get_brand_report · get_domain_report · get_actions · list_chats
   ▼
INGEST  →  peec-data.json
   │
   ▼
ROUND 1 (parallel)
   ├── Claude Haiku 4.5  — pattern analyst
   ├── Grok 4 Fast       — skeptic
   └── GPT-5 Mini        — strategist
   │
   ▼
ROUND 2 — each agent reviews the other two and may revise verdicts
   │
   ▼
SYNTHESIS — Claude Sonnet 4.6 writes the Weekly AEO Brief
   │
   ▼
OUTPUT
   ├── briefs/YYYY-MM-DD-brand.md
   ├── Supabase (arena_runs, arena_agents, arena_verdicts, arena_citations)
   └── Dashboard at arena.veloxe.ai
```

Three agents, not four. Symmetric cross-review (each agent reviews two peers). All routed via OpenRouter — one API key, three model families. Cheap tier ~$0.08/run; premium tier (Opus 4.7 + Grok 4.20 + GPT-5.5 Pro) ~$0.80/run.

## 6 · Repeatability

ARENA is brand-agnostic. Any Peec user can:

1. Clone the repo and configure their OpenRouter key + Peec project ID
2. Run `bash scripts/peec-pull.sh "Your Brand" or_your_project_id` (uses Eoghan Henn's `peec-ai-mcp` skill on Claude Code CLI to fetch data)
3. Run `MODEL_TIER=cheap npx tsx scripts/orchestrate.ts --brand "Your Brand" --peec-data peec-data-YYYY-MM-DD.json`
4. Get a brief in `briefs/` ~95 seconds later

Run weekly per brand on cheap tier and the cost is roughly $4/year. The output (verdicts, agents' reasoning, citation list) is also persisted to Supabase for downstream automation.

## 7 · Community impact

- **Open source MIT** — fork, adapt, ship
- **Public showcase** at arena.veloxe.ai — visitors see the most recent brief without signup
- **Standing on community shoulders** — repo prominently credits and links Eoghan Henn's [peec-ai-mcp skill](https://github.com/rebelytics/peec-ai-mcp) (CC BY 4.0) and Lukas Wipf's [peec-mcp-playbook](https://github.com/lukONINO/peec-mcp-playbook) (MIT) as the foundation
- **#BuiltWithPeec** posts on X + LinkedIn at submission time

## 8 · What makes it novel

The submitted builds in this challenge fall into two camps: data-fusion tools that combine Peec with other sources (GSC, SISTRIX, analytics) and quality dashboards that surface Peec data in new shapes. ARENA adds a different layer: judgment. Three frontier models debate the same Peec data and only the recommendations that survive cross-examination make it into the brief. What gets blocked tells you why and proposes a better alternative.

The output format is also distinct. Most submissions hand back data; ARENA hands back a Monday-morning brief — what an SEO consultant would write after spending three hours with the dashboard, in the structure a content team can act on.

---

## Demo video (2:12)

Screen recording of arena.veloxe.ai with a talking-head presenter in the lower-right corner. Produced with Hedra (Brian voice, auto emotional tags) → WaveSpeed InfiniteTalk (lip-synced avatar render) → ffmpeg composite over the edited screen recording.

**Beat structure:**

**0:00–0:10** — Tab browse to veloxe.ai → sealsd.com → land on ARENA dashboard. Presenter introduces: "Three frontier AI models, debating Peec AI's visibility data — writing a brief your content team acts on Monday morning."

**0:10–0:22** — Mouse around the dashboard, click Run Veloxe AI. Presenter explains the live MCP pull: "Claude makes five live tool calls — list_brands, get_brand_report, get_domain_report, get_actions, list_chats — real data, no caching."

**0:22–1:30** — Fast-motion (4–6×): Peec MCP ticker → agents Round 1 → Round 2 critiques → synthesizer. Presenter voiceover: "Round one: Claude is the pattern analyst, Grok is the skeptic, GPT is the strategist. They don't talk yet." Then: "Round two — cross-examination. Only what survives gets carried forward with a verdict and a better alternative."

**1:30–1:54** — Normal speed: Veloxe AI brief reveals. Presenter: "The Wikipedia action? Three agents blocked it — not notable enough yet, deletion risk. That's the judgment layer Peec alone doesn't surface."

**1:54–2:12** — Type "OpenAI" → Run. Fast-motion agents. OpenAI brief reveals at normal speed (money shot). Presenter closing: "Different brand, completely different story — same engine, 95 seconds, eight cents a run. Veloxe AI. We build what others dream about. #BuiltWithPeec."

**Video:** `[link — to be added on upload]`

---

## Social posts

**X / Twitter:**

> 1/ Submitted to @peecai's MCP Challenge: ARENA — three frontier models debate Peec's visibility data and hand you a Weekly AEO Brief your content team can act on Monday morning. 95 seconds. $0.08 per run.
>
> 2/ The wedge: Peec's `get_actions` is excellent, but single-model recommendations can be confidently wrong. Wikipedia pages a brand isn't notable enough for. Reddit posts that read as spam. ARENA's debate layer catches them before anyone acts.
>
> 3/ Built on the shoulders of giants — @rebelytics's `peec-ai-mcp` skill (16k words of MCP gotchas) + @lukONINO's `peec-mcp-playbook` (call-budgeted recipes). Wouldn't exist in two days without them.
>
> 4/ Live demo: https://arena.veloxe.ai
> Open source MIT: github.com/veloxe-ai/arena-veloxe
> Sample brief in the repo. Fork it, run on your own brand.
>
> Built by @VeloxeAI · #BuiltWithPeec

**LinkedIn:** longer, same substance, framed for SEO/AEO consultants.
