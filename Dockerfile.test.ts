import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dockerfile = readFileSync(
  new URL('./Dockerfile', import.meta.url),
  'utf8',
)

describe('production image startup', () => {
  it('starts only the app without bundling development seed data', () => {
    expect(dockerfile).toContain('CMD ["node", "index.js"]')
    expect(dockerfile).not.toMatch(/seed|entrypoint/)
  })

  it('bundles the migration runner for the explicit release step', () => {
    expect(dockerfile).toContain(
      'npx esbuild src/lib/database/migrate.ts --bundle',
    )
    expect(dockerfile).toContain(
      'COPY --from=build /app/scripts-dist ./scripts-dist',
    )
  })
})
