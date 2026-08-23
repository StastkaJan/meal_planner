const releasePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/

export function normalizeRelease(value: string | undefined) {
  const candidate = value?.trim()
  return candidate && releasePattern.test(candidate) ? candidate : 'unknown'
}

export const release = normalizeRelease(process.env.DEPLOYMENT_VERSION)
