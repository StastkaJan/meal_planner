import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dockerfile = readFileSync(
  new URL('./Dockerfile', import.meta.url),
  'utf8',
)
const compose = readFileSync(
  new URL('./docker-compose.yml', import.meta.url),
  'utf8',
)
const qualityWorkflow = readFileSync(
  new URL('./.github/workflows/quality.yml', import.meta.url),
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

  it('seeds smoke-test data without adding seeds to the production image', () => {
    expect(compose).toMatch(
      /test-seed:[\s\S]*?target: build[\s\S]*?command: npm run db:seed/,
    )

    const migrate = qualityWorkflow.indexOf('Apply test database migrations')
    const seed = qualityWorkflow.indexOf('Seed test database')
    const smoke = qualityWorkflow.indexOf('Run E2E smoke tests')
    expect(migrate).toBeLessThan(seed)
    expect(seed).toBeLessThan(smoke)
  })
})
