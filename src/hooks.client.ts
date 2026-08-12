import * as Sentry from '@sentry/sveltekit'
import { env } from '$env/dynamic/public'

const environment = env.PUBLIC_SENTRY_ENVIRONMENT || 'development'

Sentry.init({
  dsn: env.PUBLIC_SENTRY_DSN,
  enabled: Boolean(env.PUBLIC_SENTRY_DSN),
  environment,
  sendDefaultPii: false,
  tracesSampleRate: environment === 'production' ? 0.1 : 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: environment === 'production' ? 1 : 0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
})

export const handleError = Sentry.handleErrorWithSentry()
