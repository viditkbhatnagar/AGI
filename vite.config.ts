import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

// Fix ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    // Remove or comment out Replit-specific plugins for local development
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          // These dynamic imports will only run on Replit
          (await import("@replit/vite-plugin-runtime-error-modal").then((m): PluginOption =>
            (m.default ? m.default() : m) as PluginOption
          ).catch(() => null)) as PluginOption,
          (await import("@replit/vite-plugin-cartographer").then((m): PluginOption =>
            (m.cartographer ? m.cartographer() : m) as PluginOption
          ).catch(() => null)) as PluginOption,
        ].filter(Boolean)
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@components': path.resolve(__dirname, 'client/src/components'),
      '@lib': path.resolve(__dirname, 'client/src/lib'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets')
    }
  },
  // Use path.resolve with __dirname instead of import.meta.dirname
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  // Add proxy for API calls during local development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true
      }
    }
  }
});