# Initial data model

Planned MongoDB collections:

- `users`: provider identity, profile preferences, creation timestamp.
- `connectedPlatforms`: user, platform identifier, handle and connection status.
- `submissions`: user, platform, external problem ID, title, URL, language, difficulty, topics, status and submitted timestamp.
- `githubSyncRecords`: user, submission, repository, branch, path, sync status and timestamps.
- `goals`: user, cadence, target count and date range.

The current foundation connects to Atlas and exposes a ping health endpoint. Authentication and persistence APIs are not implemented yet.
