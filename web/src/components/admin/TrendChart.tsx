interface Point { date: string; views: number; clicks: number }

/** Dependency-free SVG bar chart (views) with a clicks line, plus an accessible data table. */
export function TrendChart({ data }: { data: Point[] }) {
  const w = 640, h = 200, pad = { l: 36, r: 8, t: 8, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.views));
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const bw = innerW / Math.max(1, data.length);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const totalViews = data.reduce((s, d) => s + d.views, 0);
  const totalClicks = data.reduce((s, d) => s + d.clicks, 0);
  const line = data.map((d, i) => `${pad.l + i * bw + bw / 2},${y(d.clicks)}`).join(" ");

  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" className="h-auto w-full"
        aria-label={`Daily views and clicks for the last ${data.length} days: ${totalViews} views and ${totalClicks} clicks in total.`}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(max * t)} y2={y(max * t)} stroke="#dfdfdf" />
            <text x={pad.l - 6} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="#5a5a5a">{Math.round(max * t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <rect key={d.date} x={pad.l + i * bw + 2} y={y(d.views)} width={Math.max(1, bw - 4)} height={pad.t + innerH - y(d.views)} fill="#1a4f8b" opacity=".85">
            <title>{`${d.date}: ${d.views} views, ${d.clicks} clicks`}</title>
          </rect>
        ))}
        <polyline points={line} fill="none" stroke="#b3261e" strokeWidth="2" />
        {data.map((d, i) => (i % Math.ceil(data.length / 7) === 0 ? (
          <text key={d.date} x={pad.l + i * bw + bw / 2} y={h - 6} textAnchor="middle" fontSize="10" fill="#5a5a5a">{d.date.slice(5)}</text>
        ) : null))}
      </svg>
      <figcaption className="mt-2 flex gap-4 font-sans text-meta text-muted">
        <span><span aria-hidden className="mr-1 inline-block h-2 w-3 bg-accent" />Views</span>
        <span><span aria-hidden className="mr-1 inline-block h-0.5 w-3 bg-danger align-middle" />Clicks</span>
      </figcaption>
      <table className="sr-only">
        <caption>Daily views and clicks</caption>
        <thead><tr><th>Date</th><th>Views</th><th>Clicks</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.views}</td><td>{d.clicks}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
