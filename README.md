# DSA-HUB

**Solve. Track. Sync. Improve.**

DSAHub is an open-source workspace for tracking Data Structures & Algorithms practice across coding platforms. The project combines a web dashboard, a browser extension, platform adapters, MongoDB Atlas, and user-controlled GitHub synchronization.

> **Status:** early development. GitHub OAuth, MongoDB-backed accounts, LeetCode accepted-submission metadata capture, an interactive analytics dashboard, and a GitHub App-based manual solution sync workspace are implemented. Automatic source-code capture and syncing, GeeksforGeeks accepted-submission capture, and organization GitHub App installations remain future work.

## Principles

- Fully open source under Apache-2.0.
- Hosted and self-hosted deployment paths.
- MongoDB Atlas for persistent storage.
- Every user's data is scoped to their authenticated account.
- Basic GitHub identity scopes for sign-in; repository permissions are a separate future integration.
- Submission source code is not collected or stored by this MVP.

## Stack

- Next.js + React + TypeScript
- Auth.js (NextAuth.js v5) with GitHub OAuth
- Auth.js MongoDB adapter and database sessions
- MongoDB Atlas (official Node.js driver)
- Chrome Extension Manifest V3
- Docker Compose for self-hosting

## Local setup

Requirements: Node.js 26.x, npm 11+, Git, and a MongoDB Atlas cluster.

~~~powershell
git clone https://github.com/avxsharma-glitch/DSA-HUB.git
cd DSA-HUB
npm install
Copy-Item .env.example apps/web/.env.local
~~~

Create a GitHub OAuth App and configure the required secrets in apps/web/.env.local. Follow [GitHub authentication setup](docs/AUTH_SETUP.md). Preserve your existing MongoDB Atlas connection string.

Start the app:

~~~powershell
npm run dev
~~~

Open http://localhost:3000. Health check: http://localhost:3000/api/health.

## Authentication and dashboard

- Sign-in page: /login
- Protected dashboard: /dashboard
- Current user API: /api/me
- User-scoped submissions API: /api/submissions
- User-scoped stats API: /api/stats
- Interactive analytics page: /analytics
- GitHub repository sync workspace: /github-sync
- Extension key API: /api/extension-token
- Extension ingestion API: /api/extension-submissions

The normal submissions API derives user identity from the server-side Auth.js session. The extension endpoint derives user identity from a per-account bearer key whose SHA-256 hash is stored in MongoDB. Neither API accepts a client-supplied userId. Only accepted-submission metadata is stored; submitted source code and test-case contents are not collected by this extension flow.

## Analytics

The authenticated /analytics workspace supports 7-day, 30-day, 90-day and 1-year views, platform filtering, daily activity trends, a 365-day consistency heatmap, current/longest streaks, and difficulty/platform/language/topic breakdowns. Metrics are computed from the signed-in user's recorded submissions; missing metadata is not fabricated.

## GitHub solution sync

The /github-sync workspace supports GitHub App installation verification, repository selection, branch/folder configuration, manual solution-file writes, duplicate/path-collision protection, and sync history. Configure the server-side GitHub App using [GitHub App setup](docs/GITHUB_APP_SETUP.md).

Manual sync requires the user to paste the source code and explicitly authorize the transfer. Source code is sent to GitHub for that request and is not saved in MongoDB. Automatic source-code capture and syncing are not enabled yet.

## MongoDB architecture

Auth.js uses users, accounts, sessions, and verification_tokens. DSAHub uses profiles, connectedPlatforms, extensionTokens, submissions, githubInstallations, githubSyncSettings, githubSyncRecords, and goals. See [Data model](docs/DATA_MODEL.md).

## Useful commands

- npm run dev — local development server
- npm run build — production build
- npm run typecheck — TypeScript validation
- npm test — shared-package tests
- npm run check — typecheck and tests
- docker compose up --build — self-hosted web app using Atlas

## Browser extension

1. Load the unpacked extension from apps/extension in Chrome at chrome://extensions with Developer mode enabled.
2. Sign in to DSAHub and open /dashboard.
3. In the Browser extension panel, generate an extension key and copy it immediately.
4. Open the DSAHub Companion popup, paste the key, and save the connection.
5. Open or reload a LeetCode problem page. Submit a solution. On an Accepted result, the extension sends metadata to the local DSAHub server.

For the current local-development build, the extension targets http://localhost:3000. Reload the extension after pulling updates. Existing accepted submissions are not backfilled; detection starts after the observer is installed. DOM/API changes on LeetCode may require adapter updates.

Captured fields include problem slug/title/URL, accepted status, LeetCode submission ID, language, submission timestamp, runtime and memory when present, and test-case counts when present. Solution code, input data, and output data are not stored. GeeksforGeeks page detection is present, but accepted-submission syncing for that platform is not implemented yet.

## Documentation

- [Authentication setup](docs/AUTH_SETUP.md)
- [Extension setup and data collected](docs/EXTENSION_SETUP.md)
- [GitHub App setup](docs/GITHUB_APP_SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Atlas setup](docs/MONGODB_ATLAS_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Contributing

Issues and pull requests are welcome. Read CONTRIBUTING.md before contributing. Report security vulnerabilities privately as explained in SECURITY.md.

## License

Apache License 2.0. See LICENSE.
