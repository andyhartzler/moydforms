import { createClient } from '@/lib/supabase/server';
import FormCard from '@/components/FormCard';
import { checkFormAvailability, FormRecord } from '@/types/forms';

export default async function HomePage() {
  const supabase = createClient();

  // Get active public forms (not voting forms, only those marked as public_form)
  const { data: allForms } = await supabase
    .from('form_schemas')
    .select('*')
    .eq('status', 'active')
    .eq('public_form', true)
    .in('form_type', ['survey', 'registration', 'feedback'])
    .order('created_at', { ascending: false });

  // Filter out forms that have closed (by closes_at date or max_submissions)
  const forms = allForms?.filter((form) => {
    const availability = checkFormAvailability(form as FormRecord);
    return availability.available;
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section - Match moyd-events style */}
      <div className="relative z-10 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white" style={{
              fontFamily: 'Montserrat',
              letterSpacing: '-0.06em',
              textTransform: 'uppercase'
            }}>
              MOYD FORMS
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 normal-case" style={{
              fontFamily: 'Montserrat',
              fontWeight: 500
            }}>
              Surveys, registrations, and feedback forms
            </p>
          </div>

          {forms && forms.length > 0 ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-2 normal-case" style={{
                  fontFamily: 'Montserrat',
                  letterSpacing: '-0.04em'
                }}>
                  Available Forms
                </h2>
                <p className="text-blue-100 normal-case" style={{
                  fontFamily: 'Montserrat',
                  fontWeight: 400
                }}>
                  Select a form below to get started
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <FormCard key={form.id} form={form} />
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 normal-case">No forms available</h3>
              <p className="mt-1 text-gray-500 normal-case">Check back later for new forms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
