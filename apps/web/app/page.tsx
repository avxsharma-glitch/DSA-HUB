import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">DSA<span>HUB</span></div>
        <div className="pill">OPEN SOURCE · APACHE 2.0</div>
      </header>

      <section className="hero">
        <div className="eyebrow">Your DSA practice workspace</div>
        <h1>Solve. Track.<br />Sync. Improve.</h1>
        <p className="sub">
          One workspace for your coding practice. Track problems across platforms,
          keep your solutions in repositories you control, and understand your progress.
        </p>
        <Link className="action-btn inline-action" href="/login">Continue with GitHub</Link>
      </section>

      <section className="grid" aria-label="Product capabilities">
        <article className="panel"><div className="metric-label">01 · Track</div><div className="feature-title">Every problem</div><p className="sub">Bring accepted submissions into one personal history.</p></article>
        <article className="panel"><div className="metric-label">02 · Understand</div><div className="feature-title">Your progress</div><p className="sub">Build topic and difficulty analytics from real activity.</p></article>
        <article className="panel"><div className="metric-label">03 · Own</div><div className="feature-title">Your solutions</div><p className="sub">Keep future GitHub synchronization under your control.</p></article>
        <article className="panel"><div className="metric-label">04 · Contribute</div><div className="feature-title">Open source</div><p className="sub">Apache-2.0 licensed and designed for community contributions.</p></article>
      </section>

      <section className="section panel">
        <h2>Early development</h2>
        <div className="notice">Authentication and the MongoDB data model are being implemented. Submission capture and GitHub synchronization are the next milestones. No demo activity is presented as real progress.</div>
      </section>

      <footer>DSAHub is community-built and open source under Apache-2.0.</footer>
    </main>
  );
}
