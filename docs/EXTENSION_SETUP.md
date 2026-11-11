# Browser Extension Setup

## Scope

The current extension detects accepted LeetCode submissions and syncs metadata to the signed-in DSAHub account. It does not collect submitted source code, custom test cases, standard input, or standard output. GeeksforGeeks is currently page-detection only.

## Requirements

- DSAHub running locally at http://localhost:3000
- GitHub OAuth sign-in configured
- MongoDB Atlas connected
- Chrome with Developer mode enabled

## Install or update the extension

1. Pull the latest main branch and keep the DSAHub web app running with npm run dev.
2. Open chrome://extensions.
3. Enable Developer mode.
4. Click Load unpacked and select the repository's apps/extension folder.
5. After future code updates, click Reload on the DSAHub Companion card.

## Connect your account

1. Sign in to DSAHub and open http://localhost:3000/dashboard.
2. In the Browser extension panel, click Generate extension key.
3. Copy the key immediately. The server stores only its SHA-256 hash and does not show the raw key again.
4. Open the DSAHub Companion popup.
5. Paste the key into Extension key and click Save connection.

Generating a replacement key invalidates the previous key. Use Revoke key in the dashboard to invalidate it. Disconnect this browser only removes the local copy; it does not revoke the server-side key.

## Test a new accepted submission

1. Open a LeetCode problem page after the extension is reloaded.
2. Submit a solution.
3. When LeetCode returns an Accepted result, the extension observes the submission-check response.
4. Open the extension popup and look for the sync status.
5. Refresh the DSAHub dashboard. The accepted submission should appear under Recent submissions.

The extension does not backfill historical submissions. A submission that was already accepted before the observer was installed will not automatically be captured.

## Data collected

The extension sends:

- Platform identifier and LeetCode submission ID
- Problem slug, title, and canonical problem URL
- Accepted status and submission timestamp
- Programming language, when returned by LeetCode
- Runtime and memory, when returned by LeetCode
- Passed and total test-case counts, when returned by LeetCode

It does not send source code, input, expected output, actual output, or the contents of the submission editor.

## Troubleshooting

- **No detection:** Reload the extension and the LeetCode tab. Submit a new solution after the observer has been installed.
- **No sync:** Confirm the DSAHub server is running at http://localhost:3000, the extension key is saved, and the dashboard key has not been revoked.
- **Invalid key:** Generate a new key in the dashboard and replace the key stored in the extension popup.
- **No metrics:** LeetCode may omit runtime, memory, or test-case counts from a particular response. These fields are optional.
- **LeetCode changed its API/UI:** The adapter depends on LeetCode's submission-check response and the problem-page DOM. Site changes can require an adapter update.

## Current limitations

- Local development endpoint only: http://localhost:3000.
- LeetCode accepted-submission capture only.
- GeeksforGeeks accepted-submission capture is not implemented.
- The extension does not sync solution files to GitHub.
