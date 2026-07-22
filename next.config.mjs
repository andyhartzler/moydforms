import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
};

export default withSentryConfig(nextConfig, {
  org: 'missouri-young-democrats',
  project: 'moydforms',
  // Source maps upload only when SENTRY_AUTH_TOKEN is present in the build
  // env; without it the build still succeeds and errors still report.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
