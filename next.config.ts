import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config for resolving Node.js modules in browser context
  turbopack: {
    resolveAlias: {
      // @arcium-hq/client imports these Node.js modules — stub them out in browser
      fs: { browser: "./src/lib/empty-module.js" },
      path: { browser: "./src/lib/empty-module.js" },
      os: { browser: "./src/lib/empty-module.js" },
    },
  },
  // Keep @arcium-hq/client as a server-side external package
  serverExternalPackages: ["@arcium-hq/client"],
};

export default nextConfig;
