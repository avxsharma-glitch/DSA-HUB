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
        <article className="panel"><div className="metric-label">02 · Understand</div><div className="feature-title">Your progress</div><p className="sub">Explore streaks, activity, difficulty, language and topic analytics.</p><Link className="fine-print" href="/analytics">Open analytics →</Link></article>
        <article className="panel"><div className="metric-label">03 · Own</div><div className="feature-title">Your solutions</div><p className="sub">Select a repository and manually back up accepted solutions through a GitHub App.</p><Link className="fine-print" href="/github-sync">Configure GitHub Sync →</Link></article>
        <article className="panel"><div className="metric-label">04 · Contribute</div><div className="feature-title">Open source</div><p className="sub">Apache-2.0 licensed and designed for community contributions.</p></article>
      </section>

      <section className="section panel">
        <h2>Connect your workflow</h2>
        <div className="notice">Sign in to record your accepted submissions, explore analytics from your own activity, and configure manual GitHub solution backups. Features that require additional setup are labelled in their workspace.</div>
      </section>

      <footer>DSAHub is community-built and open source under Apache-2.0.</footer>
    </main>
  );
}
