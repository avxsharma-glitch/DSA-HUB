import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signOutFromDashboard } from "./actions";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { SubmissionDocument, UserProfileDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";
import { ExtensionTokenPanel } from "./extension-token-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const db = await getDatabase();
  await ensureDataIndexes(db);

  const submissions = db.collection<SubmissionDocument>("submissions");
  const profiles = db.collection<UserProfileDocument>("profiles");

  const [totalSolved, recentSubmissions, profile] = await Promise.all([
    submissions.countDocuments({ userId }),
    submissions.find({ userId }).sort({ submittedAt: -1 }).limit(8).toArray(),
    profiles.findOne({ userId })
  ]);

  const displayName = profile?.displayName ?? session.user.name ?? "DSAHub member";

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">DSA<span>HUB</span></Link>
        <nav className="product-nav">
          <Link className="active" href="/dashboard">Overview</Link>
          <Link href="/analytics">Analytics</Link>
          <Link href="/github-sync">GitHub Sync</Link>
        </nav>
        <form action={signOutFromDashboard}>
          <button className="secondary-btn" type="submit">Sign out</button>
        </form>
      </header>

      <section className="hero dashboard-hero">
        <div className="eyebrow">Personal workspace</div>
        <h1>Welcome, {displayName}.</h1>
        <p className="sub">Your DSA progress belongs to your account. Only submissions attached to your authenticated user ID are shown here.</p>
      </section>

      <section className="grid" aria-label="Account statistics">
        <article className="panel">
          <div className="metric-label">Accepted submissions</div>
          <div className="metric-value">{totalSolved}</div>
        </article>
        <article className="panel">
          <div className="metric-label">Connected platforms</div>
          <div className="metric-value">0</div>
        </article>
        <article className="panel">
          <div className="metric-label">GitHub syncs</div>
          <div className="metric-value">0</div>
        </article>
        <article className="panel">
          <div className="metric-label">Account</div>
          <div className="metric-value">Active</div>
        </article>
      </section>

      <ExtensionTokenPanel />

      <section className="section panel">
        <h2>Recent submissions</h2>
        {recentSubmissions.length === 0 ? (
          <div className="notice">No submissions yet. Once the browser extension and submission capture flow are connected, accepted problems will appear here.</div>
        ) : (
          <div className="rows">
            {recentSubmissions.map((submission) => (
              <div className="rowitem" key={submission._id?.toString()}>
                <div>
                  <strong>{submission.title}</strong>
                  <div className="fine-print">
                    {submission.platform} · {submission.language ?? "Language unavailable"}
                    {typeof submission.runtimeMs === "number" && Number.isFinite(submission.runtimeMs) && submission.runtimeMs > 0 ? ` · ${submission.runtimeMs} ms` : ""}
                    {typeof submission.memoryKb === "number" && Number.isFinite(submission.memoryKb) && submission.memoryKb > 0 ? ` · ${(submission.memoryKb / 1024).toFixed(2)} MB` : ""}
                    {typeof submission.totalCorrect === "number" && typeof submission.totalTestcases === "number" ? ` · ${submission.totalCorrect}/${submission.totalTestcases} tests` : ""}
                  </div>
                </div>
                <span>{submission.difficulty ?? "Unspecified"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <p className="fine-print">Signed in as {session.user.email ?? "GitHub user"}. Auth.js stores your account and database-backed session in MongoDB Atlas.</p>
      </section>
    </main>
  );
}
