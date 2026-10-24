import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [],
    server: { deps: { inline: ["next-auth"] } },
    coverage: { provider: "v8", reporter: ["text", "html"] }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js")
    }
  }
})
