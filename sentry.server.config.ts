import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://a2bc9540487fc9f439d2fb2d2bff91ad@o4511748765253632.ingest.us.sentry.io/4511780594057216',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
