import { sveltekit } from '@sveltejs/kit/vite'
import { sentrySvelteKit } from '@sentry/sveltekit'
import { defineConfig } from 'vitest/config'

const sentryBuildConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT,
)

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      autoUploadSourceMaps: sentryBuildConfigured,
      release: process.env.SENTRY_RELEASE
        ? { name: process.env.SENTRY_RELEASE }
        : undefined,
    }),
    sveltekit(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['src'],
        additionalData: '@use "lib/styles/vars" as *;\n',
      },
    },
  },
  test: {
    environment: 'node',
    exclude: ['tests/**', '**/node_modules/**'],
  },
})
