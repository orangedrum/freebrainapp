import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { componentTagger } from "@leadconnector/vibe-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [".modal.host"],
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger({ tailwindConfig: true }),
    // ── PWA: installability + background updates + push ──
    // - Custom SW (injectManifest): precache + skipWaiting/clientsClaim +
    //   push/click/badge handlers live in src/sw.ts. generateSW cannot
    //   carry custom push code, hence the strategy.
    // - skipWaiting here mirrors registerType autoUpdate: new builds
    //   activate immediately; the PAGE reload stays owned by usePWAUpdate
    //   (silent, deferred during check-in video playback and post
    //   creation). Neither the plugin nor the SW may reload clients.
    // - injectRegister "script": plain registration only, same reason.
    // - manifest:false: we ship our own static public/pwa-manifest.json.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: "script",
      manifest: false,
      // App shell bundle is ~2.2 MB (pre-code-split); allow precaching it.
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));