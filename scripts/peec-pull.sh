#!/usr/bin/env bash
set -eo pipefail
# ═══════════════════════════════════════════════════════════
# peec-pull.sh — Pull Peec AI visibility data via Claude Code MCP
#
# Run this from a machine where Claude Code has peec-ai MCP authenticated.
# Outputs a single JSON file containing the FULL project data — all brands,
# all top URLs, all actions, all chats. orchestrate.ts then pivots in-memory
# to whichever brand was passed via --target-brand.
#
# Usage:
#   ./scripts/peec-pull.sh "Veloxe AI" or_f0a4ddb7-... [--output path/to/output.json]
#   ./scripts/peec-pull.sh "Veloxe AI" or_xxx --output /tmp/live-run-123.json
#
# Emits >>EVENT: lines on stdout for the dashboard SSE pipeline to broadcast.
# ═══════════════════════════════════════════════════════════

BRAND="${1:-Veloxe AI}"
PROJECT_ID="${2:-your-peec-project-id}"
OUTPUT="peec-data-$(date +%Y-%m-%d).json"

# Optional --output <path> override (3rd / 4th arg)
shift 2 2>/dev/null || true
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output) OUTPUT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

emit_event() {
  echo ">>EVENT:{\"type\":\"$1\",\"ts\":$(date +%s%3N),\"phase\":\"peec_pull\",\"detail\":\"$2\"}"
}

emit_event peec_pull_start "Pulling fresh data from Peec MCP (this takes ~25s)…"
echo "[peec-pull] Pulling Peec data for: $BRAND ($PROJECT_ID) → $OUTPUT" >&2

# Pull ALL brands' data so the orchestrator can pivot to any of them via --target-brand.
# Pro/Trial plan = MCP-only (no API keys), so we route through Claude Code's authenticated MCP session.
claude -p "
You have the peec-ai MCP server available. Pull visibility data for the following project and return it as a single JSON object containing ALL tracked brands (so the consumer can pick which one is the subject of analysis).

Project ID: $PROJECT_ID

Call these tools in order:
1. list_brands(project_id) — return ALL brands. For each brand include: id, name, is_own (boolean), visibility (0-1), share_of_voice (0-1), sentiment, position
2. get_brand_report(project_id, brand_id=<is_own brand id>, dimensions=['model_id']) — visibility by engine for the project's own brand
3. get_domain_report(project_id, limit=20) — top cited domains for the project
4. get_actions(project_id, scope='overview') — Peec's recommended actions (project-scoped)
5. list_chats(project_id, limit=30) — recent tracked chats

Return ONLY a JSON object with this exact structure (no explanation, no markdown). MULTIPLY visibility and share_of_voice by 100 (Peec returns 0-1 ratios; we want percentages):

{
  \"project_id\": \"$PROJECT_ID\",
  \"all_brands\": [
    { \"name\": \"...\", \"is_own\": true, \"visibility\": <0-100>, \"share_of_voice\": <0-100>, \"sentiment\": <0-100 or null>, \"position\": <rank or null> }
  ],
  \"top_urls\": [
    { \"url\": \"...\", \"domain\": \"...\", \"citation_rate\": <number>, \"domain_type\": \"Editorial|Reference|UGC|Corporate|Competitor|Other\" }
  ],
  \"actions\": [
    { \"id\": \"...\", \"summary\": \"...\", \"score\": <1-3>, \"slice\": \"editorial|ugc|reference|owned\" }
  ],
  \"chats\": [
    { \"id\": \"...\", \"engine\": \"...\", \"prompt\": \"...\", \"brands_mentioned\": [\"...\"] }
  ],
  \"engines\": [\"...\"]
}

Include EVERY tracked brand in all_brands — don't filter to top 5. The downstream consumer picks the subject via --target-brand and treats the rest as competitors automatically. Be fast — minimal narration, just call the tools and emit the JSON.
" --output-format text --allowedTools 'mcp__peec-ai__*' --model haiku --effort low < /dev/null > "$OUTPUT.raw"

python3 - "$OUTPUT.raw" "$OUTPUT" <<'PYEOF'
import sys, re, json
raw = open(sys.argv[1]).read()
m = re.search(r'\{[\s\S]*\}', raw)
if not m:
    sys.stderr.write("[peec-pull] ERROR: no JSON object found in output\n")
    sys.stderr.write(raw[:500])
    sys.exit(1)
data = json.loads(m.group(0))
open(sys.argv[2], 'w').write(json.dumps(data, indent=2))
n_brands = len(data.get('all_brands', data.get('competitors', [])))
n_urls = len(data.get('top_urls', []))
n_actions = len(data.get('actions', []))
n_chats = len(data.get('chats', []))
print(f"[peec-pull] Extracted JSON: {n_brands} brands · {n_urls} urls · {n_actions} actions · {n_chats} chats", file=sys.stderr)
print(f">>EVENT:{{\"type\":\"peec_pull_complete\",\"phase\":\"peec_pull\",\"brands\":{n_brands},\"top_urls\":{n_urls},\"actions\":{n_actions},\"chats\":{n_chats}}}")
PYEOF
rm -f "$OUTPUT.raw"

echo "[peec-pull] Saved to $OUTPUT" >&2
