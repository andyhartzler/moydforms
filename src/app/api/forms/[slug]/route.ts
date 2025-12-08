import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { slug } = params;

  // Try to fetch by slug first, then by ID
  let form;
  let error;

  // First try as slug
  ({ data: form, error } = await supabase
    .from('form_schemas')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single());

  // If not found by slug, try as ID (UUID)
  if (error || !form) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(slug)) {
      ({ data: form, error } = await supabase
        .from('form_schemas')
        .select('*')
        .eq('id', slug)
        .eq('status', 'active')
        .single());
    }
  }

  if (error || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // Check if form is accepting submissions
  let acceptingSubmissions = true;
  const now = new Date();

  if (form.opens_at && new Date(form.opens_at) > now) {
    acceptingSubmissions = false;
  }
  if (form.closes_at && new Date(form.closes_at) < now) {
    acceptingSubmissions = false;
  }
  if (form.max_submissions && form.submission_count >= form.max_submissions) {
    acceptingSubmissions = false;
  }

  return NextResponse.json({
    ...form,
    accepting_submissions: acceptingSubmissions,
  });
}
