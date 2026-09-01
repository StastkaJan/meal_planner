export function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('content-type'))
    headers.set('content-type', 'application/json')
  return fetch(path, { ...init, headers })
}

export async function requestOk(path: string, init: RequestInit = {}) {
  const response = await request(path, init)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message ?? body.error ?? 'Request failed')
  }
  return response
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await requestOk(path, init)
  return response.json()
}

export const jsonBody = (value: unknown) => JSON.stringify(value)
