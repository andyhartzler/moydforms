import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import FormRenderer from './FormRenderer';
import { checkFormAvailability, FormRecord } from '@/types/forms';

interface FormPageProps {
  params: { formId: string };
}

export async function generateMetadata({ params }: FormPageProps) {
  const supabase = createClient();

  // Try to find form by ID
  const { data: form } = await supabase
    .from('form_schemas')
    .select('title, preview_text')
    .eq('id', params.formId)
    .single();

  if (!form) {
    return {
      title: 'Form Not Found | MOYD Forms',
    };
  }

  const description = form.preview_text || 'Submit your response to this MOYD form';

  return {
    title: `${form.title} | MOYD Forms`,
    description,
    openGraph: {
      title: form.title,
      description,
      type: 'website',
      siteName: 'MOYD Forms',
    },
    twitter: {
      card: 'summary',
      title: form.title,
      description,
    },
  };
}

export default async function FormPage({ params }: FormPageProps) {
  const supabase = createClient();

  // Get form by ID
  const { data: form, error } = await supabase
    .from('form_schemas')
    .select('*')
    .eq('id', params.formId)
    .single();

  if (error || !form) {
    notFound();
  }

  // If form has a slug, redirect to the slug-based URL
  if (form.slug) {
    redirect(`/f/${form.slug}`);
  }

  // Check form availability
  const availability = checkFormAvailability(form as FormRecord);

  // Voting forms should not be accessible here (only in member portal)
  if (form.form_type === 'vote') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 normal-case">
            Members Only
          </h2>
          <p className="text-gray-600 mb-6 normal-case">
            This vote is only accessible to MOYD members through the member portal.
          </p>
          <a
            href="https://members.moyoungdemocrats.org"
            className="block w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            Go to Member Portal
          </a>
        </div>
      </div>
    );
  }

  // Show unavailable message if form is not accepting submissions
  if (!availability.available) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 normal-case">
            {form.title}
          </h2>
          <p className="text-gray-600 mb-6 normal-case">
            {availability.reason}
          </p>
          <a
            href="/"
            className="block w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            View Other Forms
          </a>
        </div>
      </div>
    );
  }

  return <FormRenderer form={form} />;
}
