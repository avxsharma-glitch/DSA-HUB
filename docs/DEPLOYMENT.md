# Deployment

This guide deploys the Next.js web app to Vercel and keeps MongoDB Atlas as the database. The Chrome extension is distributed separately as an unpacked extension during development; a Chrome Web Store release is a later publishing step.

## Deployment shape

- Web app and API routes: Vercel
- Database: MongoDB Atlas
- Authentication: GitHub OAuth through Auth.js
- Optional repository writes: GitHub App, configured with server-only credentials
- Browser companion: Chrome Manifest V3 extension, configured to use the deployed DSAHub URL

## 1. Prepare MongoDB Atlas

1. Use the existing DSAHub Atlas database or create a production database.
2. Create a database user with a strong, unique password and only the database permissions DSAHub needs.
3. Copy the Atlas connection string and select the `dsahub` database in the URI or use `MONGODB_DB=dsahub`.
4. Configure Atlas Network Access so Vercel's outbound connections can reach the cluster. Prefer a supported static egress IP / private network path for your Vercel plan. Do not leave the cluster open to the entire internet as a permanent production setting.
5. Keep the URI only in Vercel's encrypted environment variables. Never place it in a `NEXT_PUBLIC_*` variable or commit it.

## 2. Import the GitHub repository into Vercel

1. Sign in to [Vercel](https://vercel.com/) and connect the GitHub account that owns `avxsharma-glitch/DSA-HUB`.
2. Choose **Add New → Project** and import `DSA-HUB`.
3. Configure the project as follows:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Include files outside the Root Directory in the Build Step | Enabled |
| Node.js Version | `26.x` |
| Install Command | `cd ../.. && npm install` |
| Build Command | `cd ../.. && npm run build --workspace @dsahub/web` |
| Output Directory | Default / `.next` |
| Development Command | Default |

**Why the root-directory option matters:** `apps/web` depends on the npm workspace package `@dsahub/shared`, which lives in `packages/shared` outside the Next.js app folder. Vercel must include files outside the app root so the workspace dependency is available during install and build. The app's Next.js config sets the monorepo root for Turbopack and output file tracing.

The repository uses npm workspaces: `apps/web` depends on `packages/shared`, while the workspace definition is at the repository root. The commands above deliberately run npm install and the workspace build from the repository root, while Next.js still builds the `apps/web` application. Keep **Include source files outside of the Root Directory in the Build Step** enabled.

The repository and app package both target Node.js 26. Vercel announced Node.js 26 LTS availability for builds and Functions on October 29, 2026. See [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [Vercel monorepos](https://vercel.com/docs/monorepos).

## 3. Configure environment variables

Add these values in **Vercel → Project → Settings → Environment Variables**. Set them for the appropriate Preview and Production environments.

~~~env
MONGODB_URI=your_production_mongodb_atlas_connection_string
MONGODB_DB=dsahub

AUTH_SECRET=your_unique_production_random_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
AUTH_URL=https://your-production-domain
AUTH_TRUST_HOST=true
~~~

Generate a separate production Auth.js secret; do not reuse a local development secret. You can generate one with:

~~~powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
~~~

For GitHub repository sync, add these optional server-only variables:

~~~env
GITHUB_APP_ID=your_numeric_github_app_id
GITHUB_APP_PRIVATE_KEY=your_github_app_private_key_pem
~~~

Paste the complete PEM private key into Vercel's secure environment variable field. It may be entered as a multiline value. Do not prefix it with `NEXT_PUBLIC_`, expose it in client code, or commit it to Git.

If the project uses a custom domain, add that domain in Vercel before finalizing `AUTH_URL`. Use the stable production URL (for example, the project's production `.vercel.app` domain or your custom domain), not a one-off preview deployment URL.

## 4. Configure GitHub OAuth for production

In [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers):

- Set the Homepage URL to the stable production DSAHub URL.
- Set the Authorization callback URL to:

~~~text
https://your-production-domain/api/auth/callback/github
~~~

The callback URL must match the deployed host exactly. Update the OAuth app after selecting the final Vercel production domain, then redeploy so the Production environment uses the matching `AUTH_URL`.

For preview deployments, use a separate GitHub OAuth App if you need sign-in on preview URLs. Do not weaken the production callback configuration to accommodate temporary preview domains.

## 5. Deploy and verify

1. Deploy the imported project to Vercel.
2. Add the final production domain and update the GitHub OAuth callback URL.
3. Set or confirm Production environment variables and redeploy.
4. Open `https://your-production-domain/api/health`. Expected response:

~~~json
{
  "status": "ok",
  "database": "connected"
}
~~~

5. Test GitHub sign-in at `/login`.
6. Open `/dashboard`, `/analytics` and `/github-sync`.
7. Verify the extension against the deployed app:
   - Open `chrome://extensions` and reload DSAHub Companion (Manifest V3 version 0.4.0 or later).
   - Open the extension popup.
   - Set **DSAHub server URL** to the production HTTPS origin, such as `https://your-production-domain`.
   - Paste a key generated from the deployed dashboard and select **Save connection**.
   - Approve Chrome's host permission for that exact DSAHub domain.
   - Submit a new LeetCode problem and confirm the popup reports a successful sync.
8. If GitHub Sync is required, configure the GitHub App variables in Production and verify the installation from `/github-sync`.

## 6. Production smoke-test checklist

- [ ] `/api/health` reports database connected.
- [ ] GitHub OAuth redirects back to the production domain.
- [ ] Dashboard data is scoped to the signed-in user.
- [ ] Analytics loads from production MongoDB records.
- [ ] Extension can request host permission for the production DSAHub domain.
- [ ] A new accepted LeetCode submission syncs to production.
- [ ] Duplicate submission IDs do not create duplicate records.
- [ ] GitHub App installation verifies and only selected repositories are available.
- [ ] Manual solution sync writes to the selected repository and branch.
- [ ] No secrets appear in client bundles, logs, source files or Git history.

## 7. Rollback

Vercel retains previous deployments. To roll back, open **Project → Deployments**, select the last known-good Production deployment and promote it. A rollback changes the deployed application version; it does not reverse database writes or data-model changes. Handle any database changes separately.

## Docker self-hosting

For self-hosting, configure the server environment with the same production variables, expose the application through HTTPS, and run:

~~~powershell
docker compose up --build -d
~~~

The extension can connect to a self-hosted HTTPS origin using the same **DSAHub server URL** field and host-permission prompt.
