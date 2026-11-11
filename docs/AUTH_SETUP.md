# GitHub authentication setup

DSAHub uses Auth.js (NextAuth.js v5) with the official MongoDB adapter and database-backed sessions.

## 1. Create a GitHub OAuth App for local development

1. Open https://github.com/settings/developers.
2. Select OAuth Apps, then New OAuth App.
3. Application name: DSAHub Local.
4. Homepage URL: http://localhost:3000.
5. Authorization callback URL: http://localhost:3000/api/auth/callback/github.
6. Register the application.
7. Copy the Client ID and generate a Client Secret.

Use a separate OAuth App for production. Set its callback URL to https://YOUR_DOMAIN/api/auth/callback/github. Do not use wildcard callback matching unless there is a specific need.

## 2. Generate an Auth.js secret

From PowerShell, run:

~~~powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
~~~

Copy the generated value. Do not reuse the GitHub client secret as AUTH_SECRET.

## 3. Configure apps/web/.env.local

Keep the existing MongoDB Atlas values and add the following variables. Do not replace your actual Atlas URI with an example value.

~~~env
MONGODB_URI=your_existing_mongodb_atlas_connection_string
MONGODB_DB=dsahub

AUTH_SECRET=your_generated_random_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
AUTH_URL=http://localhost:3000
~~~

Never commit .env.local. The repository .gitignore excludes environment files.

## 4. Minimum GitHub scopes

The sign-in provider requests read:user and user:email only. DSAHub does not request repo, public_repo, workflow, or delete_repo permissions for login.

Later, repository synchronization should use a separate GitHub App installation with narrowly scoped repository permissions. Signing in must not grant repository write access.

## 5. Start and test

~~~powershell
npm install
npm run dev
~~~

Open http://localhost:3000/login and select Continue with GitHub. After approval, you should land at /dashboard.

## MongoDB collections

The Auth.js MongoDB adapter manages users, accounts, sessions, and verification_tokens. DSAHub creates profiles, connectedPlatforms, submissions, githubSyncRecords, and goals indexes when the first user signs in or uses a protected data endpoint.

Sessions are stored in MongoDB and expire after 30 days. The browser cookie contains the session token, not the full user record.

## Production

Set MONGODB_URI, MONGODB_DB, AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, and AUTH_URL as server-side encrypted environment variables in your hosting platform. Register the production callback URL with the production OAuth App. Never prefix these secrets with NEXT_PUBLIC_.
