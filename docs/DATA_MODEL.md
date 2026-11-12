# MongoDB data model

DSAHub uses MongoDB Atlas. Auth.js owns its authentication collections; DSAHub owns the application collections below.

## Auth.js adapter collections

| Collection | Purpose |
|---|---|
| users | Normalized GitHub user profile used by Auth.js |
| accounts | Provider account link and OAuth token metadata |
| sessions | Database-backed user sessions |
| verification_tokens | Auth.js verification tokens |

The application does not expose account documents or provider access tokens through its APIs.

## DSAHub collections

| Collection | Key fields | Purpose |
|---|---|---|
| profiles | userId, preferences, privacy | App-specific profile settings |
| connectedPlatforms | userId, platform, externalUsername | Coding-platform handles and connection state |
| extensionTokens | userId, tokenHash, createdAt, updatedAt | One revocable browser-extension key per user; only the SHA-256 hash is stored |
| submissions | userId, platform, externalSubmissionId, problemId, submittedAt, language, runtimeMs, memoryKb | Accepted problem metadata and optional performance metrics |
| githubInstallations | userId, installationId, accountLogin, accountType | Verified personal-account GitHub App installation |
| githubSyncSettings | userId, repositoryId, repositoryFullName, branch, folderPath, enabled | User-selected GitHub destination for manual solution sync |
| githubSyncRecords | userId, submissionId, repositoryFullName, filePath, status | Attempt and result history for solution file synchronization |
| goals | userId, period, targetSolved, startsAt, endsAt, isActive | Daily and weekly targets |

## Ownership and authorization

- Every application document is owned by the authenticated Auth.js user ID.
- The API never accepts userId from the request body.
- Reads and writes filter by the current session user ID.
- The unique submission index is userId + platform + externalSubmissionId.
- The extension ingestion endpoint resolves user ownership from a hashed bearer token; it never accepts userId from the extension payload.
- Duplicate accepted submissions are idempotently rejected.
- Submission metadata is stored separately from any future source-code storage. This MVP does not store solution source code.

## Indexes

- Auth.js accounts: provider + providerAccountId (unique).
- Auth.js sessions: sessionToken (unique), expires (TTL).
- Auth.js verification tokens: identifier + token (unique), expires (TTL).
- Profiles: userId (unique).
- Connected platforms: userId + platform (unique).
- Extension tokens: userId (unique).
- Submissions: userId + platform + externalSubmissionId (unique), and userId + submittedAt (descending).
- GitHub installations: userId (unique).
- GitHub sync settings: userId (unique).
- GitHub sync records: userId + submissionId (unique), and userId + createdAt (descending).
- Goals: userId + isActive.

Indexes are created idempotently by the application. MongoDB creates the collections when the first document or index is written.
