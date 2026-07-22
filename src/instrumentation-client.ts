import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://a2bc9540487fc9f439d2fb2d2bff91ad@o4511748765253632.ingest.us.sentry.io/4511780594057216',
  tracesSampleRate: 0.1,
  // Public-facing forms: keep payloads lean and never capture respondent
  // keystrokes. Errors only, no session replay.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
