# DSA-HUB

**Solve. Track. Sync. Improve.**

DSAHub is an open-source workspace for tracking Data Structures & Algorithms practice across coding platforms. The project combines a web dashboard, a browser extension, platform adapters, MongoDB Atlas, and user-controlled GitHub synchronization.

> **Status:** early development. GitHub OAuth, database-backed sessions, the initial MongoDB data architecture, protected submission APIs, and a real-data dashboard foundation are being implemented. Automated platform submission capture and GitHub solution sync are still planned.

## Principles

- Fully open source under Apache-2.0.
- Hosted and self-hosted deployment paths.
- MongoDB Atlas for persistent storage.
- Every user's data is scoped to their authenticated account.
- Basic GitHub identity scopes for sign-in; repository permissions are a separate future integration.

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

The API derives user identity from the server-side Auth.js session. It ignores no userId field supplied by clients; userId is not accepted in the submission payload. Submission code is not stored by this MVP.

## MongoDB architecture

Auth.js uses users, accounts, sessions, and verification_tokens. DSAHub uses profiles, connectedPlatforms, submissions, githubSyncRecords, and goals. See [Data model](docs/DATA_MODEL.md).

## Useful commands

- npm run dev — local development server
- npm run build — production build
- npm run typecheck — TypeScript validation
- npm test — shared-package tests
- npm run check — typecheck and tests
- docker compose up --build — self-hosted web app using Atlas

## Browser extension

Load the unpacked extension from apps/extension using Chrome's Extensions page with Developer mode enabled. The current extension is a starter; accepted-submission capture is not implemented yet.

## Documentation

- [Authentication setup](docs/AUTH_SETUP.md)
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
