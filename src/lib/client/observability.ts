export type ClientErrorKind = 'sveltekit' | 'error' | 'unhandledrejection'

export function reportClientError(
  kind: ClientErrorKind,
  error: unknown,
  path = location.pathname,
  status?: number,
) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  void fetch('/client-errors', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, message, stack, path, status }),
    keepalive: true,
  }).catch(() => {})
}
