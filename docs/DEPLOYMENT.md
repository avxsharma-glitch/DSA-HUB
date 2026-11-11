# Deployment

## Local

Configure `.env` with your MongoDB Atlas connection string, install dependencies, and run `npm run dev`.

## Docker self-hosting

Configure `.env` and run `docker compose up --build -d`.

The container runs the web app and connects to the Atlas cluster specified by `MONGODB_URI`. Keep secrets outside the image and repository.

## Hosted deployment

Deploy the Next.js application to a Node-compatible host. Configure `MONGODB_URI`, `MONGODB_DB`, and the public app URL as encrypted environment variables in the hosting provider.
