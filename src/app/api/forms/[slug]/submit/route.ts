import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { dualWriteSubmission } from '@/lib/sheetsDualWrite';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const supabase = createClient();
  const { slug } = await params;

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
  const headersList = await headers();
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

  // Link endorsement-questionnaire submissions to a specific candidate. The
  // CRM bakes `?candidate_id=<uuid>` into the share link; the client posts it
  // via body.candidate_id OR formData.candidate_id. Only applies to forms
  // whose slug starts with `endorsement-questionnaire`.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawCandidateId =
    (typeof body.candidate_id === 'string' && body.candidate_id) ||
    (typeof (formData as Record<string, unknown>).candidate_id === 'string'
      ? ((formData as Record<string, unknown>).candidate_id as string)
      : null);
  if (slug.startsWith('endorsement-questionnaire')) {
    let linkCandidateId: string | null =
      rawCandidateId && uuidRegex.test(rawCandidateId) ? rawCandidateId : null;

    // Fallback for public-URL submissions with no personalized token: match the
    // applicant to a candidate record by campaign email, then by full name.
    // Only a UNIQUE match links — an ambiguous match is left for manual linking
    // in the CRM so we never attach a submission to the wrong candidate.
    if (!linkCandidateId) {
      if (submitter?.email) {
        const { data: byEmail } = await supabase
          .from('candidates')
          .select('id')
          .ilike('campaign_email', submitter.email)
          .limit(2);
        if (byEmail && byEmail.length === 1) linkCandidateId = byEmail[0].id;
      }
      if (!linkCandidateId && submitter?.name) {
        const { data: byName } = await supabase
          .from('candidates')
          .select('id')
          .ilike('name', submitter.name.trim())
          .limit(2);
        if (byName && byName.length === 1) linkCandidateId = byName[0].id;
      }
    }

    if (linkCandidateId) {
      const { error: linkErr } = await supabase
        .from('form_submissions')
        .update({ candidate_id: linkCandidateId })
        .eq('id', submission.id);
      if (linkErr) {
        console.warn('[endorsement] failed to link candidate_id:', linkErr);
      }
    }
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

  // Continuity dual-write: append to the pre-moydforms Google Sheet for the
  // handful of legacy-critical forms (membership, chapter-chartering). The
  // historical response log predates moydforms and we keep it continuous so
  // nothing gets lost when Google Forms is retired. Fire-and-forget — don't
  // fail the submission if the append errors out.
  const normalizedFileUrls =
    fileUrls && typeof fileUrls === 'object' && !Array.isArray(fileUrls)
      ? (fileUrls as Record<string, string | string[]>)
      : null;
  void dualWriteSubmission(slug, formData, normalizedFileUrls).catch((err) => {
    console.warn('[sheetsDualWrite] fire-and-forget failed:', err);
  });

  return NextResponse.json({
    success: true,
    submission_id: submission.id,
  });
}
