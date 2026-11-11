import { signInWithGitHub } from "./actions";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const configured = Boolean(
    process.env.MONGODB_URI &&
    process.env.AUTH_SECRET &&
    process.env.AUTH_GITHUB_ID &&
    process.env.AUTH_GITHUB_SECRET
  );

  return (
    <main className="shell auth-shell">
      <section className="panel auth-panel">
        <div className="brand">DSA<span>HUB</span></div>
        <div className="eyebrow auth-eyebrow">Your DSA practice workspace</div>
        <h1 className="auth-title">Welcome back.</h1>
        <p className="sub">Sign in with GitHub to create your personal DSAHub account. Your submissions and analytics will be isolated to your account.</p>

        {configured ? (
          <form action={signInWithGitHub}>
            <button className="action-btn" type="submit">Continue with GitHub</button>
          </form>
        ) : (
          <div className="notice">
            GitHub sign-in is not configured yet. Add MONGODB_URI, AUTH_SECRET, AUTH_GITHUB_ID, and AUTH_GITHUB_SECRET to apps/web/.env.local, then restart the development server. See docs/AUTH_SETUP.md.
          </div>
        )}

        <p className="fine-print">DSAHub requests basic GitHub profile and email access for sign-in. It does not request repository access.</p>
      </section>
    </main>
  );
}
