# DSA-HUB

**Solve. Track. Sync. Improve.**

DSAHub is an open-source workspace for tracking Data Structures & Algorithms practice across coding platforms. The long-term product combines a web dashboard, a privacy-first browser extension, platform adapters, and user-controlled GitHub synchronization.

> **Foundation status:** early development. The dashboard is a UI preview, and the extension is a starter that detects supported coding sites. Real submission parsing, user accounts, persistent analytics, and GitHub synchronization are not implemented yet. Preview metrics are illustrative and are not real user activity.

## Principles

- Fully open source under Apache-2.0.
- Both hosted and self-hosted deployment paths.
- MongoDB Atlas for persistent storage.
- User-controlled solution synchronization.
- Least-privilege access to coding platforms and GitHub.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS
- MongoDB Atlas (official Node.js driver)
- Chrome Extension Manifest V3
- Docker Compose for self-hosting

## Repository layout

- `apps/web` — Next.js dashboard and API.
- `apps/extension` — Chrome extension starter.
- `packages/shared` — shared platform types.
- `docs` — architecture, Atlas setup, deployment and roadmap.

## Requirements

- Node.js 26.x and npm 11+
- MongoDB Atlas cluster and database user
- Git
- Docker Desktop (optional)

## Local setup

```powershell
git clone https://github.com/avxsharma-glitch/DSA-HUB.git
cd DSA-HUB
npm install
Copy-Item .env.example .env
```

Set `MONGODB_URI` in `.env` to your MongoDB Atlas connection string and `MONGODB_DB=dsahub`, then run:

```powershell
npm run dev
```

Open http://localhost:3000. The health endpoint is at http://localhost:3000/api/health. See [MongoDB Atlas setup](docs/MONGODB_ATLAS_SETUP.md).

## Self-host with Docker

Configure `.env` with your Atlas URI, then run `docker compose up --build -d`. Docker Compose runs the web application; database storage remains in Atlas. It does not start a local MongoDB container.

## Browser extension

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `apps/extension`. Current functionality is limited to detecting supported pages and storing page context locally; it does not capture source code or sync submissions yet.

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript validation
- `npm test` — shared package tests
- `npm run check` — typecheck and tests

## Project status

| Area | Status |
|---|---|
| Monorepo foundation | Scaffolded |
| Dashboard UI | Preview only |
| MongoDB Atlas connection | Implemented |
| Health endpoint | Implemented |
| Chrome extension starter | Implemented |
| Accepted-submission detection | Planned |
| Real submission persistence | Planned |
| GitHub App authorization and sync | Planned |
| Multi-platform analytics | Planned |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Atlas setup](docs/MONGODB_ATLAS_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing. Report security vulnerabilities privately as explained in [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).
