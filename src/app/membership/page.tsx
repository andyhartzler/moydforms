import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { FormRecord, checkFormAvailability } from '@/types/forms';
import MembershipHero from './MembershipHero';
import MembershipFormClient from './MembershipFormClient';

export const metadata = {
  title: 'Join MOYD — Missouri Young Democrats',
  description:
    'Become a member of the Missouri Young Democrats. Organize, vote, and win with the biggest generation in Missouri politics. Takes under 3 minutes.',
  openGraph: {
    title: 'Join the Missouri Young Democrats',
    description:
      'Membership is free, ages 14–36. Connect with your local chapter and get invited to the events, organizing calls, and elections that shape Missouri.',
    type: 'website',
    siteName: 'Missouri Young Democrats',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join the Missouri Young Democrats',
    description:
      'Membership is free, ages 14–36. Join the biggest generation in Missouri politics.',
  },
};

interface MembershipPageProps {
  searchParams: { start?: string; chapter?: string };
}

/**
 * The `/membership` landing route. Prior to 2026-04-23 this slug was served
 * by the generic `/app/[slug]/page.tsx` dispatcher — which dropped a
 * first-time visitor directly into the phone-entry screen with no brand
 * moment. This page wraps a marketing-grade hero around the same form
 * renderer, with `?start=1` as an escape hatch that deep-links past the
 * hero (for SMS/social shares that want to skip the splash).
 *
 * Note: because of the way Next.js App Router matches routes, this
 * explicit `/app/membership/page.tsx` takes precedence over the
 * `/app/[slug]/page.tsx` catchall — verified locally before rollout.
 */
export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const supabase = createClient();

  const { data: form, error } = await supabase
    .from('form_schemas')
    .select('*')
    .eq('slug', 'membership')
    .single();

  if (error || !form) {
    notFound();
  }

  const availability = checkFormAvailability(form as FormRecord);
  if (!availability.available) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="max-w-lg w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 text-center border border-white/40">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{form.title}</h2>
          <p className="text-gray-600 mb-6">{availability.reason}</p>
          <a
            href="https://moyoungdemocrats.org"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition"
          >
            Back to MOYD
          </a>
        </div>
      </div>
    );
  }

  const shouldSkipHero = !!searchParams.start;

  return (
    <MembershipFormClient
      form={form as FormRecord}
      skipHero={shouldSkipHero}
      hero={<MembershipHero chapter={searchParams.chapter} />}
    />
  );
}
