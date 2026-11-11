# Architecture

The project is a monorepo with a Next.js web application, a Manifest V3 browser extension, and shared TypeScript platform types.

## Current request flow

Browser page → extension content script → extension service worker → browser local storage.

Web dashboard → Next.js route handlers → MongoDB Node.js driver → MongoDB Atlas.

## Planned submission flow

Coding platform → platform adapter → accepted-submission validation → authenticated DSAHub API → MongoDB Atlas → live dashboard → optional GitHub repository sync.

Platform DOM parsing must remain isolated in adapters because website markup can change. The extension should request only required permissions and clearly communicate what data is collected.
