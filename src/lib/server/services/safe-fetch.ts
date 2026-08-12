import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'

const FETCH_TIMEOUT_MS = 8000
const MAX_BODY_BYTES = 2_000_000
const MAX_REDIRECTS = 3

export class SafeFetchError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function isPublicIp(address: string): boolean {
  const embeddedV4 = address.includes(':')
    ? address.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1]
    : undefined
  if (embeddedV4) return isPublicIp(embeddedV4)

  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    )
  }

  if (isIP(address) === 6) {
    const value = address.toLowerCase()
    return !(
      value === '::' ||
      value === '::1' ||
      /^f[cd]/.test(value) ||
      /^fe[89ab]/.test(value) ||
      /^fe[cd]/.test(value) ||
      value.startsWith('ff') ||
      value.startsWith('2001:db8:')
    )
  }
  return false
}

async function resolvePublicAddress(hostname: string) {
  if (hostname === 'localhost' || hostname.endsWith('.localhost'))
    throw new SafeFetchError(400, 'URL must be a public http(s) address')

  const literalFamily = isIP(hostname)
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => [])
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicIp(address))
  )
    throw new SafeFetchError(400, 'URL must resolve only to public addresses')
  return addresses[0]
}

function readResponse(
  url: URL,
  pinned: { address: string; family: number },
): Promise<{ status: number; location?: string; body: string }> {
  const send = url.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = send(
      url,
      {
        headers: { 'user-agent': 'meal-plan recipe import' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        lookup: (_hostname, _options, callback) =>
          callback(null, pinned.address, pinned.family),
      },
      (res) => {
        const status = res.statusCode ?? 502
        const location = res.headers.location
        if (status >= 300 && status < 400) {
          res.resume()
          resolve({ status, location, body: '' })
          return
        }
        if (status < 200 || status >= 300) {
          res.resume()
          reject(new SafeFetchError(502, `Fetch failed (${status})`))
          return
        }
        const declared = Number(res.headers['content-length'])
        if (declared > MAX_BODY_BYTES) {
          res.destroy()
          reject(new SafeFetchError(413, 'Recipe page is too large'))
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BODY_BYTES) {
            res.destroy(new SafeFetchError(413, 'Recipe page is too large'))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () =>
          resolve({ status, location, body: Buffer.concat(chunks).toString() }),
        )
        res.on('error', reject)
      },
    )
    req.on('error', (cause) =>
      reject(
        cause instanceof SafeFetchError
          ? cause
          : new SafeFetchError(502, 'Could not fetch that URL'),
      ),
    )
    req.end()
  })
}

export async function fetchPublicHtml(startUrl: string): Promise<string> {
  let target: URL
  try {
    target = new URL(startUrl)
  } catch {
    throw new SafeFetchError(400, 'URL must be a public http(s) address')
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (target.protocol !== 'http:' && target.protocol !== 'https:')
      throw new SafeFetchError(400, 'URL must be a public http(s) address')
    if (target.username || target.password)
      throw new SafeFetchError(400, 'URL credentials are not allowed')

    const response = await readResponse(
      target,
      await resolvePublicAddress(target.hostname),
    )
    if (response.status < 300 || response.status >= 400) return response.body
    if (!response.location)
      throw new SafeFetchError(502, 'Fetch failed (bad redirect)')
    target = new URL(response.location, target)
  }
  throw new SafeFetchError(502, 'Too many redirects')
}
