import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = Boolean(process.env['VERCEL']);

export default defineConfig({
  tanstackStart: {
    // Server entry with a friendly error page.
    server: { entry: "server" },
  },
  // Build output for Vercel when deployed from GitHub.
  ...(isVercel && { nitro: { preset: "vercel" } }),
});
