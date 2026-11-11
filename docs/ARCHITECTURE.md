# Architecture

The project is a monorepo with a Next.js web application, a Manifest V3 browser extension, and shared TypeScript platform types.

## Current request flow

LeetCode page → extension content script → service worker injects a MAIN-world observer → accepted submission metadata → extension service worker → bearer-authenticated DSAHub API → MongoDB Atlas → user-scoped dashboard.

Web dashboard → Next.js route handlers → MongoDB Node.js driver → MongoDB Atlas.

## Extension authentication

A signed-in dashboard user can generate one browser-extension key. The raw key is returned once, while the server stores only its SHA-256 hash in the extensionTokens collection. The browser extension stores the raw key in chrome.storage.local and sends it using the Authorization: Bearer header. Revoking or replacing the key invalidates the previous key.

The extension ingestion endpoint identifies the user from the stored token record. It never trusts a client-supplied userId. The regular /api/submissions endpoint continues to use the Auth.js session.

## Submission data boundary

The LeetCode observer watches submission-check responses and emits accepted status plus selected metadata. The extension does not capture or send solution source code, editor contents, custom test-case input, expected output, or actual output.

## Platform adapters

Platform-specific parsing remains isolated in extension adapters because website APIs and DOM markup can change. LeetCode accepted capture is the first implementation. GeeksforGeeks page detection exists, but its submission adapter is still pending.

## Planned work

Coding platform → platform adapter → accepted-submission validation → authenticated DSAHub API → MongoDB Atlas → live dashboard → optional user-controlled GitHub repository sync.
