import type { ClientInit, HandleClientError } from '@sveltejs/kit'
import { reportClientError } from '$lib/client/observability'

export const init: ClientInit = () => {
  addEventListener('error', (event) =>
    reportClientError('error', event.error ?? event.message),
  )
  addEventListener('unhandledrejection', (event) =>
    reportClientError('unhandledrejection', event.reason),
  )
}

export const handleError: HandleClientError = ({ error, event, status }) => {
  reportClientError('sveltekit', error, event.url.pathname, status)
}
