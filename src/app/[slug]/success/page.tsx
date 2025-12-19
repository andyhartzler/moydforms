import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

interface SuccessPageProps {
  params: { slug: string };
}

// Helper to check if string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function generateMetadata({ params }: SuccessPageProps) {
  const supabase = createClient();

  let form;

  if (isUUID(params.slug)) {
    const { data } = await supabase
      .from('form_schemas')
      .select('title')
      .eq('id', params.slug)
      .single();
    form = data;
  } else {
    const { data } = await supabase
      .from('form_schemas')
      .select('title')
      .eq('slug', params.slug)
      .single();
    form = data;
  }

  return {
    title: `Submitted | ${form?.title || 'Form'} | MOYD Forms`,
  };
}

export default async function SuccessPage({ params }: SuccessPageProps) {
  const supabase = createClient();

  let form;
  let error;

  if (isUUID(params.slug)) {
    const result = await supabase
      .from('form_schemas')
      .select('title, schema')
      .eq('id', params.slug)
      .single();
    form = result.data;
    error = result.error;
  } else {
    const result = await supabase
      .from('form_schemas')
      .select('title, schema')
      .eq('slug', params.slug)
      .single();
    form = result.data;
    error = result.error;
  }

  if (error || !form) {
    notFound();
  }

  // Get custom confirmation message from schema
  const confirmationMessage = form.schema?.confirmation?.message ||
    'Thank you for your submission! We have received your response.';
  const redirectUrl = form.schema?.confirmation?.redirectUrl;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success animation */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-12 w-12 text-green-600 animate-checkmark" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2 normal-case" style={{
          fontFamily: 'Montserrat',
          letterSpacing: '-0.04em'
        }}>
          Submitted!
        </h1>

        <p className="text-gray-600 mb-6 normal-case">
          {confirmationMessage}
        </p>

        <div className="space-y-3">
          {redirectUrl ? (
            <a
              href={redirectUrl}
              className="block w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 font-medium transition-colors"
            >
              Continue
            </a>
          ) : (
            <Link
              href="/"
              className="block w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 font-medium transition-colors"
            >
              View Other Forms
            </Link>
          )}
        </div>

        <p className="mt-6 text-sm text-gray-400 normal-case">
          {form.title}
        </p>
      </div>
    </div>
  );
}
