import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(appDirectory, "../..");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The web app consumes @dsahub/shared from packages/shared at the monorepo root.
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot
  }
};

export default nextConfig;
