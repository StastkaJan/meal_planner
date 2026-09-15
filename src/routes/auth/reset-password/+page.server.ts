import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ url, setHeaders }) => {
  setHeaders({ 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' })
  return { token: url.searchParams.get('token') ?? '' }
}
