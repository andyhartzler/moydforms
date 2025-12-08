import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { slug } = params;

  // Get request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { event_type, metadata, field_id, field_type } = body;

  const validFormEvents = ['view', 'start', 'submit', 'abandon'];
  const validFieldEvents = ['interaction', 'validation_error', 'skip', 'time_spent'];

  // Validate event type
  const isFormEvent = validFormEvents.includes(event_type);
  const isFieldEvent = validFieldEvents.includes(event_type);

  if (!isFormEvent && !isFieldEvent) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  // Find form by slug or ID
  let form;
  let error;

  ({ data: form, error } = await supabase
    .from('form_schemas')
    .select('id')
    .eq('slug', slug)
    .single());

  if (error || !form) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(slug)) {
      ({ data: form, error } = await supabase
        .from('form_schemas')
        .select('id')
        .eq('id', slug)
        .single());
    }
  }

  if (error || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // Get request headers
  const headersList = headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
                    headersList.get('x-real-ip') ||
                    'unknown';
  const userAgent = headersList.get('user-agent') || '';
  const referrer = headersList.get('referer') || null;

  // Check for authenticated user
  let memberId = null;
  let userId = null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    userId = session.user.id;
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', session.user.id)
      .single();
    if (member) {
      memberId = member.id;
    }
  }

  // Insert analytics record
  if (isFormEvent) {
    // Form-level analytics
    const { error: insertError } = await supabase.from('form_analytics').insert({
      form_id: form.id,
      user_id: userId,
      member_id: memberId,
      event_type,
      timestamp: new Date().toISOString(),
      metadata: metadata || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer,
    });

    if (insertError) {
      console.error('Analytics insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record analytics' }, { status: 500 });
    }
  } else if (isFieldEvent && field_id && field_type) {
    // Field-level analytics
    const { error: insertError } = await supabase.from('form_field_analytics').insert({
      form_id: form.id,
      field_id,
      field_type,
      user_id: userId,
      member_id: memberId,
      event_type,
      timestamp: new Date().toISOString(),
      metadata: metadata || null,
    });

    if (insertError) {
      console.error('Field analytics insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record field analytics' }, { status: 500 });
    }
  } else if (isFieldEvent) {
    return NextResponse.json({ error: 'field_id and field_type are required for field events' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
