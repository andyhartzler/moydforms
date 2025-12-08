import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function SuccessPage({ params }: { params: { formId: string } }) {
  const supabase = createClient();

  // Get form to show custom confirmation message
  const { data: form } = await supabase
    .from('form_schemas')
    .select('title, schema')
    .eq('id', params.formId)
    .single();

  const confirmationMessage = form?.schema?.confirmation?.message || 'Thank you for your submission!';
  const redirectUrl = form?.schema?.confirmation?.redirectUrl;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg className="h-8 w-8 text-green-600 success-checkmark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2 normal-case" style={{
          fontFamily: 'Montserrat',
          letterSpacing: '-0.04em'
        }}>
          Submission Received!
        </h2>

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
              View More Forms
            </Link>
          )}

          <a
            href="https://moyoungdemocrats.org"
            className="block w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 font-medium transition-colors"
          >
            Back to Main Site
          </a>
        </div>
      </div>
    </div>
  );
}
