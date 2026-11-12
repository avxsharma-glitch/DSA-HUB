# DSAHub

**Solve. Track. Sync. Improve.**

DSAHub is an open-source Data Structures & Algorithms practice workspace. It brings accepted-submission metadata from coding platforms into one account, provides practice analytics, and lets learners back up their solutions to a GitHub repository they control.

The product is designed around one workflow:

**Practice → Detect → Track → Understand → Back up**

> **Development status:** DSAHub is in active MVP development. GitHub sign-in, MongoDB-backed user accounts, a Chrome extension, initial LeetCode accepted-submission tracking, an interactive analytics workspace, and a GitHub App-based manual solution sync flow are implemented. The LeetCode adapter is still being hardened against frontend/network changes. GeeksforGeeks accepted-submission capture and automatic source-code sync are not implemented yet.

## Contents

- [Why DSAHub](#why-dsahub)
- [Feature status](#feature-status)
- [Product workspaces](#product-workspaces)
- [Supported platforms](#supported-platforms)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Run locally](#run-locally)
- [Browser extension setup](#browser-extension-setup)
- [GitHub repository sync setup](#github-repository-sync-setup)
- [Data model](#data-model)
- [API routes](#api-routes)
- [Privacy and security](#privacy-and-security)
- [Development and verification](#development-and-verification)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why DSAHub

DSA practice is spread across multiple websites. Learners often have to maintain separate histories, manually back up accepted solutions, and piece together their consistency and topic coverage.

DSAHub aims to provide:

- One searchable record of accepted problems across coding platforms.
- A browser companion that detects accepted submissions.
- A central view of practice activity, streaks, difficulty and language distribution.
- A user-controlled GitHub destination for solution backups.
- Daily and weekly targets to make practice more consistent.

A solved count alone is not enough. The longer-term goal is to help learners understand what they practise, where they are improving, and which topics need more attention.

## Feature status

| Feature | Current status |
|---|---|
| GitHub OAuth sign-in | Implemented |
| MongoDB Atlas persistence and user-scoped records | Implemented |
| Chrome Manifest V3 extension | Implemented |
| LeetCode accepted-submission metadata capture | Initial flow works; multi-problem compatibility is under active validation |
| Duplicate submission prevention | Implemented using platform + external submission ID |
| Interactive analytics | Implemented using saved submission metadata |
| Activity heatmap and streak calculations | Implemented |
| Difficulty, platform and language breakdowns | Implemented where metadata exists |
| Topic breakdown | UI/API available; LeetCode topic tags are not populated by the current capture adapter |
| GitHub App installation and repository selection | Implemented; requires server-side GitHub App configuration |
| Manual solution-file sync | Implemented; user pastes code and explicitly confirms the transfer |
| Sync history | Implemented |
| Dedicated retry action from sync history | Not implemented yet; a failed sync can be submitted again manually with the code |
| Automatic source-code extraction and GitHub sync | Planned, not implemented |
| GeeksforGeeks accepted-submission capture | Planned; page detection only at present |
| HackerRank, Codeforces, CodeChef and AtCoder | Planned |
| Editable goals and public profiles | Planned |

Features that depend on optional external setup are shown in the product UI. A working GitHub sign-in does not automatically grant repository write access.

## Product workspaces

### Overview — `/dashboard`

The personal workspace shows accepted-submission totals, platforms with recorded activity, successful GitHub sync counts, and recent submissions. Data is scoped to the signed-in user.

### Analytics — `/analytics`

The analytics workspace includes:

- 7-day, 30-day, 90-day and 1-year date ranges.
- Platform filtering.
- Unique-problem and accepted-submission counts.
- Current and longest streaks.
- Active-day count and average submissions per active day.
- Daily activity trend.
- 365-day activity heatmap.
- Difficulty, platform, language and topic breakdowns.
- Daily and weekly target progress using the profile defaults.

Analytics are calculated from records in MongoDB. Missing metadata is not invented. Topic breakdowns remain empty until an adapter supplies topic labels.

### GitHub Sync — `/github-sync`

The GitHub Sync workspace supports:

- Verification of a GitHub App installation.
- Repository selection from that installation.
- Branch and folder configuration.
- Manual solution-file creation or update.
- Explicit confirmation before source code is sent to GitHub.
- Protection against overwriting a file that DSAHub cannot associate with the exact previous sync record.
- Per-user sync history.

The current sync form asks the user to paste the source code. DSAHub stores the submission metadata and sync record, not the pasted source code.

### Problems and Goals

The broader product blueprint includes a searchable Problems workspace with platform, topic, difficulty, language and date filters, plus editable daily and weekly goals. Those dedicated management pages are still planned.

## Supported platforms

| Platform | Current support |
|---|---|
| LeetCode | Accepted-submission metadata capture and DSAHub sync; adapter compatibility is still being validated across multiple problems |
| GeeksforGeeks | Page detection only; accepted-submission capture is not yet implemented |
| HackerRank | Planned |
| Codeforces | Planned |
| CodeChef | Planned |
| AtCoder | Planned |

Platform-specific request and page parsing is isolated in the browser extension so that a site change can be handled in its adapter without redesigning the whole application.

## Architecture

The repository is a monorepo:

~~~text
DSA-HUB/
├── apps/
│   ├── web/
│   │   ├── app/                 # Next.js pages and API route handlers
│   │   ├── lib/                 # Auth, MongoDB, validation and GitHub App client
│   │   └── ...
│   └── extension/
│       ├── manifest.json        # Chrome Manifest V3
│       ├── content.js           # Isolated-world page context and bridge
│       ├── interceptor-utils.js  # Pure request/response matching helpers
│       ├── interceptor.js        # MAIN-world LeetCode network observer
│       └── background.js         # Authenticated metadata sync
├── packages/
│   └── shared/                  # Shared types and utilities
├── docs/
└── .github/workflows/ci.yml
~~~

### Submission tracking flow

~~~text
LeetCode problem page
        ↓
Chrome content script
        ↓
MAIN-world request/response observer
        ↓
Accepted verdict + selected metadata
        ↓
Extension service worker
        ↓
Bearer-authenticated DSAHub API
        ↓
MongoDB Atlas
        ↓
Dashboard and analytics
~~~

The observer recognises LeetCode's usual submit/check routes and also uses request/response-shape matching as a fallback. It forwards metadata only. It does not forward the submission editor contents or test-case data.

### GitHub sync flow

~~~text
Signed-in DSAHub user
        ↓
GitHub App installation
        ↓
Selected repository + branch + folder
        ↓
User selects saved submission and pastes code
        ↓
Explicit code-transfer confirmation
        ↓
Short-lived installation token
        ↓
GitHub Contents API
        ↓
Sync record in MongoDB
~~~

GitHub repository write access is separate from GitHub OAuth sign-in. DSAHub uses a GitHub App installation token for repository operations and requests Contents write permission for the selected repository.

## Technology stack

| Area | Technology |
|---|---|
| Web application | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS v4 and project CSS |
| Authentication | Auth.js / NextAuth.js v5, GitHub OAuth |
| Database | MongoDB Atlas, official MongoDB Node.js driver |
| Browser extension | Chrome Manifest V3, JavaScript |
| GitHub integration | GitHub App JWT and installation access tokens |
| Testing | Node.js built-in test runner |
| CI | GitHub Actions |

The current backend uses Next.js route handlers. The original product blueprint mentioned Express as an option; an Express service is not part of the current implementation.

## Run locally

### Requirements

- Node.js 26.x or newer.
- npm 11.x or newer.
- Git.
- A MongoDB Atlas database.
- A GitHub OAuth App for sign-in.
- Chrome or another Chromium browser for the extension.

### 1. Clone and install

~~~powershell
git clone https://github.com/avxsharma-glitch/DSA-HUB.git
cd DSA-HUB
npm install
~~~

### 2. Configure environment

Create `apps/web/.env.local` from `.env.example`, or create the file manually:

~~~powershell
Copy-Item .env.example apps/web/.env.local
~~~

Preserve your actual MongoDB connection string and existing OAuth credentials if the file already exists. Do not overwrite a working local environment file.

Required variables:

~~~env
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB=dsahub

AUTH_SECRET=your_random_auth_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
AUTH_URL=http://localhost:3000
~~~

Generate an Auth.js secret in PowerShell:

~~~powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
~~~

### 3. Create the GitHub OAuth App

In [GitHub Developer Settings](https://github.com/settings/developers), create an OAuth App with:

| Setting | Value |
|---|---|
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

Copy the Client ID and Client Secret into `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. The sign-in flow requests identity scopes only; repository write access is configured separately through a GitHub App.

### 4. Start the application

~~~powershell
npm run dev
~~~

Open:

- Home: http://localhost:3000
- Sign in: http://localhost:3000/login
- Overview: http://localhost:3000/dashboard
- Analytics: http://localhost:3000/analytics
- GitHub Sync: http://localhost:3000/github-sync

Health endpoint: http://localhost:3000/api/health

## Browser extension setup

1. Keep DSAHub running locally and sign in.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the repository's `apps/extension` directory.
5. Open DSAHub's `/dashboard` page and generate an extension key.
6. Copy the key immediately. Only its SHA-256 hash is stored in MongoDB.
7. Open the DSAHub Companion popup, paste the key and choose **Save connection**.
8. Open or reload a LeetCode problem page.
9. Submit a new solution and wait for the Accepted verdict.
10. Check the extension popup's observer/sync status, then refresh the DSAHub dashboard.

After pulling extension changes, click **Reload** on the DSAHub Companion card at `chrome://extensions`, then refresh the LeetCode tab. The extension does not backfill submissions that were accepted before the observer was installed.

For detailed troubleshooting and the data boundary, see [Extension Setup](docs/EXTENSION_SETUP.md).

### LeetCode compatibility notes

LeetCode does not provide a stable, documented public submission API for extensions. DSAHub observes the request/response patterns used by the LeetCode web application. Those patterns can change. The current adapter:

- Recognises the normal `/problems/{slug}/submit/` and `/submissions/detail/{id}/check/` routes.
- Uses a JSON request-body fallback for the common `typed_code` + `lang` submit payload.
- Uses a judge-response fallback for payloads containing `state` + `status_code`.
- Associates a submission ID with the problem slug so delayed results are not attributed to a different problem page.
- Uses a DOM result fallback when the network observer cannot identify a result.

The extension does not read or send the source-code field from a submit request. It only checks that the field exists to recognise a submission event.

## GitHub repository sync setup

GitHub repository writes require a separately configured GitHub App.

1. Create a GitHub App in [GitHub Developer Settings](https://github.com/settings/apps/new).
2. Set Repository permissions → **Contents: Read and write**. Keep other repository permissions disabled unless a later feature needs them.
3. Install the app on the same personal GitHub account used for DSAHub sign-in. Select only the repositories DSAHub should access.
4. Generate the app's private key and note the App ID and installation ID.
5. Add the following server-only values to `apps/web/.env.local`:

~~~env
GITHUB_APP_ID=your_numeric_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----"
~~~

The private key may also be entered as a normal multiline PEM value. Never expose it through a `NEXT_PUBLIC_*` variable, browser code, or Git commit.

6. Restart DSAHub.
7. Open `/github-sync`, enter the installation ID and verify it.
8. Select an installed repository, branch and folder, then save the destination.
9. Select an accepted submission, paste its source code, confirm the transfer and sync it.

Current limitations: manual code paste only, personal-account installations only, first 100 installed repositories, and no automatic extraction or sync. See [GitHub App Setup](docs/GITHUB_APP_SETUP.md).

## Data model

Auth.js owns its authentication collections:

- `users`
- `accounts`
- `sessions`
- `verification_tokens`

DSAHub application collections:

- `profiles`
- `connectedPlatforms`
- `extensionTokens`
- `submissions`
- `githubInstallations`
- `githubSyncSettings`
- `githubSyncRecords`
- `goals`

Every application document is scoped to the authenticated DSAHub user. Extension ingestion resolves the owner through a hashed extension key; clients do not send a user ID to claim ownership. See [Data Model](docs/DATA_MODEL.md).

## API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Health and database connectivity |
| `GET /api/me` | Current authenticated user |
| `GET /api/submissions` | List the signed-in user's submissions |
| `POST /api/submissions` | Save metadata using the signed-in session |
| `POST /api/extension-submissions` | Save metadata using a per-user extension key |
| `GET /api/stats` | Summary statistics |
| `GET /api/analytics` | Filtered analytics payload |
| `POST/DELETE /api/extension-token` | Generate or revoke the browser extension key |
| `GET/POST/DELETE /api/github-sync/installation` | Verify or disconnect a GitHub App installation |
| `GET /api/github-sync/repositories` | List repositories available to the installation |
| `GET/POST /api/github-sync/settings` | Read or save repository destination settings |
| `GET /api/github-sync/history` | Recent GitHub sync records |
| `POST /api/github-sync/sync` | Manually write a confirmed solution file to GitHub |

All account-specific reads and writes are user-scoped. API details and schemas may evolve while the project is in active development.

## Privacy and security

- The extension key is generated server-side; MongoDB stores its SHA-256 hash.
- Replacing or revoking an extension key invalidates the previous key.
- GitHub sign-in does not request repository write permission.
- GitHub App private keys and installation tokens stay server-side.
- Installation access tokens are short-lived and are requested with Contents write permission for the selected repository.
- Submission metadata and GitHub sync history are stored in MongoDB.
- The current LeetCode tracker does not store solution source code, editor contents, custom test input, expected output or actual output.
- Manual GitHub sync sends pasted source code to GitHub after explicit user confirmation; the code is not saved in MongoDB.
- Never commit `.env.local`, OAuth secrets, MongoDB credentials, GitHub App private keys or tokens.

See [Security Policy](SECURITY.md).

## Development and verification

Useful commands from the repository root:

~~~powershell
npm install
npm run check
npm run build
npm run dev
~~~

- `npm run check` runs TypeScript validation and the Node.js test suite.
- The extension tests cover LeetCode URL/body/response matching and safe XHR response parsing.
- `npm run build` creates the production Next.js build.
- GitHub Actions runs install, checks and production build on pushes to `main` and pull requests.

## Roadmap

### MVP reliability
- [x] GitHub sign-in and MongoDB-backed user accounts.
- [x] Per-user extension key and authenticated metadata ingestion.
- [x] Initial LeetCode accepted-submission capture.
- [ ] Complete multi-problem LeetCode live validation and continue adapting to site changes.
- [ ] GeeksforGeeks accepted-submission adapter.
- [ ] Historical submission import/backfill where supported and permitted.

### Solution backup
- [x] GitHub App installation verification.
- [x] Repository, branch and folder settings.
- [x] Manual solution-file write with explicit confirmation.
- [x] Duplicate/path-collision protection and sync history.
- [ ] Automatic code extraction and user-configurable automatic sync.
- [ ] Dedicated retry action for failed sync records.
- [ ] More complete repository/branch browsing and sync settings.

### Analytics and practice management
- [x] Activity trend and yearly heatmap.
- [x] Current/longest streak calculations.
- [x] Difficulty, platform and language breakdowns where metadata exists.
- [ ] Topic-tag enrichment.
- [ ] Editable daily/weekly goals and goal history.
- [ ] Searchable Problems page with filters and sorting.
- [ ] Richer weekly/monthly comparisons and revision planner.

### Platform expansion and community
- [ ] HackerRank adapter.
- [ ] Codeforces adapter.
- [ ] CodeChef adapter.
- [ ] AtCoder adapter.
- [ ] Public profiles and shareable progress portfolio.
- [ ] Community features after the core tracking and sync flows are reliable.

## Contributing

Contributions are welcome. Please open an issue before larger changes, use a focused branch, include tests for behavior changes and update documentation when a workflow changes.

See [CONTRIBUTING.md](CONTRIBUTING.md). Never commit secrets or personal data.

## License

DSAHub is licensed under the [Apache License 2.0](LICENSE).
