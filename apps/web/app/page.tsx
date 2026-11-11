const metrics = [["Problems tracked", "—"], ["Current streak", "—"], ["This week", "—"], ["Platforms", "0"]];

export default function Home() {
  return <main className="shell">
    <header className="topbar"><div className="brand">DSA<span>HUB</span></div><div className="pill">OPEN SOURCE · APACHE 2.0</div></header>
    <section className="hero"><div className="eyebrow">Your DSA practice workspace</div><h1>Solve. Track.<br/>Sync. Improve.</h1><p className="sub">One workspace for your coding practice. Track problems across platforms, keep your solutions in repositories you control, and understand your progress.</p></section>
    <section className="grid" aria-label="Practice metrics">{metrics.map(([label,value])=><article className="panel" key={label}><div className="metric-label">{label}</div><div className="metric-value">{value}</div></article>)}</section>
    <section className="section panel"><h2>Development preview</h2><div className="notice">This is an early development scaffold. No real submissions have been imported yet. Metrics are intentionally blank instead of displaying fabricated demo progress.</div></section>
    <section className="section panel"><h2>Build roadmap</h2><div className="rows"><div className="rowitem"><strong>01 · Platform integrations</strong><span>In progress</span></div><div className="rowitem"><strong>02 · Real submission storage</strong><span>Planned</span></div><div className="rowitem"><strong>03 · GitHub synchronization</strong><span>Planned</span></div><div className="rowitem"><strong>04 · Practice analytics</strong><span>Planned</span></div></div></section>
    <footer>DSAHub is community-built and open source under Apache-2.0.</footer>
  </main>;
}
