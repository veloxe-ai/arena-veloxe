import type { ArenaCitation } from '../types'

const TYPE_COLOR: Record<string, string> = {
  Reference:     'bg-info/15 text-info border-info/30',
  Competitor:    'bg-err/15 text-err border-err/30',
  Editorial:     'bg-accent/15 text-accent border-accent/30',
  Corporate:     'bg-warn/15 text-warn border-warn/30',
  UGC:           'bg-ok/15 text-ok border-ok/30',
  Institutional: 'bg-fg-1/15 text-fg-0 border-fg-1/30',
  Other:         'bg-fg-3/15 text-fg-1 border-fg-3/30',
}

export function CitationsStrip({ citations }: { citations: ArenaCitation[] }) {
  return (
    <div className="pane-elevated">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <div className="font-mono text-xs font-semibold text-fg-0 tracking-tight">
            WINNING CITATIONS · SCRAPED CONTENT
          </div>
          <div className="label mt-0.5">via peec-ai · get_url_content</div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {citations.map(c => (
          <div key={c.url} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[12px] text-ok hover:underline break-all"
                >
                  {c.url}
                </a>
                <div className="label mt-1">
                  {c.peec_citation_count} citations · rate {c.peec_citation_rate.toFixed(2)}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded border font-mono text-[9px] tracking-[0.18em] uppercase ${TYPE_COLOR[c.domain_type] ?? TYPE_COLOR.Other}`}>
                {c.domain_type}
              </span>
            </div>

            <p className="font-mono text-[11px] text-fg-1 leading-relaxed italic line-clamp-3">
              {c.content_snippet}
            </p>

            {c.extracted_patterns.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.extracted_patterns.map((p, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-bg-3 border border-white/5 font-mono text-[10px] text-fg-1"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
