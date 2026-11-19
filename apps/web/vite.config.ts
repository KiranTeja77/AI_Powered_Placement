import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Builds the Content-Security-Policy for the production page. Scripts may only come from the
 * site itself (no inline scripts, no eval). The few relaxations are explained:
 *  - style-src allows inline styles: React, Radix, Recharts and the code editor set style
 *    attributes and inject style elements, and these cannot carry a nonce.
 *  - fonts come from Google Fonts, the only third-party origin.
 *  - worker-src allows blob: for the code editor's worker.
 *  - connect-src allows the API origin when it is not the same site (VITE_API_URL).
 * frame-ancestors cannot be set from a meta tag, so the host must send it as a response header.
 */
function contentSecurityPolicy(apiOrigin: string): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

/** Adds the policy to the built index.html only. The dev server needs inline scripts for HMR. */
function cspPlugin(apiOrigin: string): Plugin {
  return {
    name: 'placewise-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const tag = `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(apiOrigin)}" />`
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${tag}`)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), cspPlugin(env.VITE_API_URL ?? '')],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    server: {
      port: 5173,
      // Same-origin API access in dev: the refresh cookie and CORS need no special handling.
      proxy: { '/api': 'http://localhost:8080' },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      testTimeout: 20_000,
      exclude: ['e2e/**', 'e2e-csp/**', 'node_modules/**'],
    },
  }
})
