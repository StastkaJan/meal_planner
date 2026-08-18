import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import packageJson from './package.json'

const dockerfile = readFileSync(
  new URL('./Dockerfile', import.meta.url),
  'utf8',
)

describe('production image startup', () => {
  it('starts only the app without bundling development seed data', () => {
    expect(dockerfile).toContain('CMD ["node", "index.js"]')
    expect(dockerfile).not.toMatch(/seed|entrypoint/)
  })

  it('keeps migration tooling available for the explicit release step', () => {
    expect(packageJson.dependencies['drizzle-kit']).toBeDefined()
  })
})
