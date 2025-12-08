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

  const { data: formData, submitter, fileUrls } = body;

  if (!formData || typeof formData !== 'object') {
    return NextResponse.json({ error: 'Form data is required' }, { status: 400 });
  }

  // Find form by slug or ID
  let form;
  let error;

  ({ data: form, error } = await supabase
    .from('form_schemas')
    .select('id, status, opens_at, closes_at, max_submissions, submission_count')
    .eq('slug', slug)
    .single());

  if (error || !form) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(slug)) {
      ({ data: form, error } = await supabase
        .from('form_schemas')
        .select('id, status, opens_at, closes_at, max_submissions, submission_count')
        .eq('id', slug)
        .single());
    }
  }

  if (error || !form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // Check if form is accepting submissions
  if (form.status !== 'active') {
    return NextResponse.json({ error: 'This form is not currently active' }, { status: 400 });
  }

  const now = new Date();
  if (form.opens_at && new Date(form.opens_at) > now) {
    return NextResponse.json({ error: 'This form is not yet open' }, { status: 400 });
  }
  if (form.closes_at && new Date(form.closes_at) < now) {
    return NextResponse.json({ error: 'This form is closed' }, { status: 400 });
  }
  if (form.max_submissions && form.submission_count >= form.max_submissions) {
    return NextResponse.json({ error: 'This form has reached its submission limit' }, { status: 400 });
  }

  // Get request headers for metadata
  const headersList = headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
                    headersList.get('x-real-ip') ||
                    'unknown';
  const userAgent = headersList.get('user-agent') || '';

  // Check if user is authenticated and try to match member
  let memberId = null;
  let subscriberId = null;

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (member) {
      memberId = member.id;
    }
  } else if (submitter?.email) {
    // Try to match by email
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .ilike('email', submitter.email)
      .single();

    if (member) {
      memberId = member.id;
    }
  }

  // Create submission
  const { data: submission, error: submitError } = await supabase
    .from('form_submissions')
    .insert({
      form_id: form.id,
      member_id: memberId,
      subscriber_id: subscriberId,
      data: formData,
      submitter_name: submitter?.name || null,
      submitter_email: submitter?.email || null,
      submitter_phone: submitter?.phone || null,
      file_urls: fileUrls || null,
      status: 'submitted',
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (submitError) {
    console.error('Submission error:', submitError);
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }

  // Create subscriber if email provided and not already a member
  if (submitter?.email && !memberId) {
    // Check if subscriber exists
    const { data: existingSubscriber } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', submitter.email)
      .single();

    if (existingSubscriber) {
      subscriberId = existingSubscriber.id;
      // Update submission with subscriber ID
      await supabase
        .from('form_submissions')
        .update({ subscriber_id: subscriberId })
        .eq('id', submission.id);
    } else {
      // Create new subscriber
      const { data: newSubscriber } = await supabase
        .from('subscribers')
        .insert({
          email: submitter.email,
          name: submitter.name || null,
          phone: submitter.phone || null,
          source: 'Form Submission',
          subscribed: true,
          subscription_status: 'subscribed',
          optin_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (newSubscriber) {
        await supabase
          .from('form_submissions')
          .update({ subscriber_id: newSubscriber.id })
          .eq('id', submission.id);
      }
    }
  }

  // Track submission analytics
  await supabase.from('form_analytics').insert({
    form_id: form.id,
    member_id: memberId,
    event_type: 'submit',
    timestamp: new Date().toISOString(),
    metadata: {
      submission_id: submission.id,
      field_count: Object.keys(formData).length,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return NextResponse.json({
    success: true,
    submission_id: submission.id,
  });
}
