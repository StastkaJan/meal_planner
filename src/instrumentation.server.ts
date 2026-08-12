import * as Sentry from '@sentry/sveltekit'

const dsn = process.env.SENTRY_DSN ?? process.env.PUBLIC_SENTRY_DSN
const environment =
  process.env.SENTRY_ENVIRONMENT ??
  process.env.PUBLIC_SENTRY_ENVIRONMENT ??
  'development'

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  sendDefaultPii: false,
  tracesSampleRate: environment === 'production' ? 0.1 : 0,
})
