import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import FormRenderer from '@/app/[formId]/FormRenderer';

// Minimal layout for embedding in iframes
export default async function EmbedFormPage({ params }: { params: { formId: string } }) {
  const supabase = createClient();

  const { data: form, error } = await supabase
    .from('form_schemas')
    .select('*')
    .eq('id', params.formId)
    .eq('status', 'active')
    .single();

  if (error || !form) {
    notFound();
  }

  return (
    <div className="min-h-screen p-4">
      <FormRenderer form={form} />
    </div>
  );
}
