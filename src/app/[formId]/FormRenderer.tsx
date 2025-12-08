'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import DynamicFormRenderer from '@/components/DynamicFormRenderer';

interface FormRendererProps {
  form: any;
}

export default function FormRenderer({ form }: FormRendererProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(formData: Record<string, any>) {
    setSubmitting(true);
    setError(null);

    try {
      // Check if user is authenticated (optional for public forms)
      const { data: { session } } = await supabase.auth.getSession();

      let memberId = null;
      if (session) {
        // Try to match to member
        const { data: member } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (member) {
          memberId = member.id;
        }
      } else if (formData.email) {
        // Try to match by email for non-authenticated submissions
        const { data: member } = await supabase
          .from('members')
          .select('id')
          .ilike('email', formData.email)
          .single();

        if (member) {
          memberId = member.id;
        }
      }

      // Insert submission
      const { error: submitError } = await supabase
        .from('form_submissions')
        .insert({
          form_id: form.id,
          member_id: memberId,
          data: formData,
        });

      if (submitError) throw submitError;

      // Redirect to success page
      router.push(`/${form.id}/success`);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to submit form');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen py-8 relative z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Form Header */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 normal-case" style={{
            fontFamily: 'Montserrat',
            letterSpacing: '-0.04em'
          }}>
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 normal-case">
              {form.description}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Dynamic Form */}
        <DynamicFormRenderer
          schema={form.schema}
          onSubmit={handleSubmit}
          submitLabel="Submit"
          submitting={submitting}
        />

        {/* Footer Note */}
        <p className="mt-6 text-sm text-blue-100 text-center normal-case">
          This form is provided by Missouri Young Democrats
        </p>
      </div>
    </div>
  );
}
