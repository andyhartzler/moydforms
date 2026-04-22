import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { FormRecord, checkFormAvailability } from '@/types/forms';
import EndorsementHero from './EndorsementHero';
import EndorsementFormClient from './EndorsementFormClient';

export const metadata = {
  title: 'Run With Us — 2026 Endorsement Questionnaire | MOYD',
  description:
    'The Missouri Young Democrats endorse candidates who share our vision for a Missouri that works for everyone under 40. Apply for MOYD endorsement in under 20 minutes.',
  openGraph: {
    title: 'Run With Us — 2026 Endorsement Questionnaire',
    description:
      'Apply for MOYD endorsement. Young Democrats 35 and under, or partner candidates 36+ who champion our issues.',
    type: 'website',
    siteName: 'Missouri Young Democrats',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Run With Us — 2026 Endorsement Questionnaire',
    description:
      'Apply for MOYD endorsement. Young Democrats 35 and under, or partner candidates 36+ who champion our issues.',
  },
};

interface EndorsementPageProps {
  searchParams: { candidate_id?: string; start?: string };
}

// The landing route. `?start=1` (or any truthy value) deep-links past the hero
// straight into the form — the CRM share link can append this to send candidates
// right to the application without the marketing shell.
export default async function EndorsementPage({ searchParams }: EndorsementPageProps) {
  const supabase = createClient();

  const { data: form, error } = await supabase
    .from('form_schemas')
    .select('*')
    .eq('slug', 'endorsement-questionnaire-2026')
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
  const candidateId = searchParams.candidate_id;

  return (
    <EndorsementFormClient
      form={form as FormRecord}
      candidateId={candidateId}
      skipHero={shouldSkipHero}
      hero={<EndorsementHero candidateId={candidateId} />}
    />
  );
}
