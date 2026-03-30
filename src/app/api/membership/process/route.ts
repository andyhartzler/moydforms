import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Field ID to members table column mapping
const FIELD_TO_MEMBER_MAP: Record<string, string> = {
  // Page 1: Basics
  '7ef3d9a0': '_first_name', // special: combine with last name
  '7221a225': '_last_name',  // special: combine with first name
  '562e6d09': 'date_of_birth',
  'email_field': 'email',
  '458e9ec2': 'phone',

  // Page 2: Location
  '73400ed5': '_city', // stored in address
  '207879c2': 'address',
  '41db9d9c': '_state',
  '23cca2cb': '_zip_code',
  '3a456eeb': 'preferred_pronouns',
  '559c0f96': '_registered_voter',

  // Page 3: Social
  '596e8a46': 'instagram',
  '6428fdf1': 'tiktok',
  '417477cd': 'x',
  '011b2200': '_bluesky',

  // Page 4: Education
  '69d07773': 'in_school',
  '4a9c0213': 'school_name',
  '706b4e0b': 'graduation_year',
  'major_field': '_major',
  '51cff5db': 'education_level',
  '6fa4f34c': 'employed',
  '2585235b': 'industry',

  // Page 5: Involvement
  '17d3907b': 'desire_to_lead',
  'committee_choices': 'committee',
  '226743e3': 'hours_per_week',
  '51e12843': 'passionate_issues',
  '016ae30f': 'current_chapter_member',
  '3b88c54f': 'chapter_name',
  '3f84c11f': 'current_involvement',

  // Page 6: Demographics
  '60686161': 'gender_identity',
  '3c7a8a3d': 'sexual_orientation',
  '2238ba58': '_hispanic_latino',
  '4a6d1b7f': 'race',
  '66a5f51e': 'disability',
  '331915b2': 'accommodations',
  '32bfab74': 'community_type',
  '442d6c18': 'religion',
  '40602e67': 'languages',

  // Page 7: Final
  '280f5f06': 'why_join',
  '6cf26feb': '_additional_info',
  '6c6d967c': 'referral_source',
  '7e3d564c': 'areas_of_interest',
  '1de09937': '_meeting_days',
  '1af21ffa': '_meeting_times',

  // Page 8: Leadership
  'committee_1st_choice': '_committee_1st',
  'committee_2nd_choice': '_committee_2nd',
  'committee_3rd_choice': '_committee_3rd',
  '11648ea3': '_leadership_hours',
  '54016ebb': 'goals_and_ambitions',
  '67b2a620': 'qualified_experience',
  '13f36d81': 'leadership_experience',
  '5780de4a': '_available_meetings',
  '7949931e': '_comfortable_teamwork',
  '75a2099d': '_leader_meeting_days',
  '3f6c5cff': '_leader_meeting_times',
  'leader_street_address': '_leader_address',
};

function arrayToString(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'string') return val;
  return String(val ?? '');
}

function arrayToPostgresArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val];
  return [];
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { submission_id, form_data } = body;

  if (!submission_id || !form_data) {
    return NextResponse.json({ error: 'submission_id and form_data are required' }, { status: 400 });
  }

  try {
    // Build the member record from form data
    const firstName = String(form_data['7ef3d9a0'] || '').trim();
    const lastName = String(form_data['7221a225'] || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const email = String(form_data['email_field'] || form_data['email'] || '').trim().toLowerCase();
    const phone = String(form_data['458e9ec2'] || form_data['phone'] || '').trim();

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Build address string
    const street = String(form_data['207879c2'] || '').trim();
    const city = String(form_data['73400ed5'] || '').trim();
    const state = String(form_data['41db9d9c'] || 'Missouri').trim();
    const zip = String(form_data['23cca2cb'] || '').trim();
    const fullAddress = [street, city, state, zip].filter(Boolean).join(', ');

    // Determine registered voter boolean
    const registeredVoterRaw = form_data['559c0f96'];
    let registeredVoter: boolean | null = null;
    if (registeredVoterRaw === 'Yes') registeredVoter = true;
    else if (registeredVoterRaw === 'No') registeredVoter = false;

    // Hispanic/Latino boolean
    const hispanicRaw = form_data['2238ba58'];
    let hispanicLatino: boolean | null = null;
    if (hispanicRaw === 'Yes') hispanicLatino = true;
    else if (hispanicRaw === 'No') hispanicLatino = false;

    // Build committee array from checkbox group
    const committeeChoices = arrayToPostgresArray(form_data['committee_choices']);

    // Build comprehensive notes from fields that don't have direct columns
    const notesParts: string[] = [];
    if (form_data['major_field']) notesParts.push(`Major: ${form_data['major_field']}`);
    if (form_data['011b2200']) notesParts.push(`Bluesky: ${form_data['011b2200']}`);
    if (form_data['6cf26feb']) notesParts.push(`Additional info: ${form_data['6cf26feb']}`);
    if (form_data['1de09937']) notesParts.push(`Meeting days: ${arrayToString(form_data['1de09937'])}`);
    if (form_data['1af21ffa']) notesParts.push(`Meeting times: ${arrayToString(form_data['1af21ffa'])}`);

    // Leadership application notes
    if (form_data['17d3907b'] === 'Yes') {
      notesParts.push('--- LEADERSHIP APPLICATION ---');
      if (form_data['committee_1st_choice']) notesParts.push(`1st choice: ${form_data['committee_1st_choice']}`);
      if (form_data['committee_2nd_choice']) notesParts.push(`2nd choice: ${form_data['committee_2nd_choice']}`);
      if (form_data['committee_3rd_choice']) notesParts.push(`3rd choice: ${form_data['committee_3rd_choice']}`);
      if (form_data['11648ea3']) notesParts.push(`Leadership hours/week: ${form_data['11648ea3']}`);
      if (form_data['5780de4a']) notesParts.push(`Available for meetings: ${form_data['5780de4a']}`);
      if (form_data['7949931e']) notesParts.push(`Comfortable with teamwork: ${form_data['7949931e']}`);
      if (form_data['75a2099d']) notesParts.push(`Leader meeting days: ${arrayToString(form_data['75a2099d'])}`);
      if (form_data['3f6c5cff']) notesParts.push(`Leader meeting times: ${arrayToString(form_data['3f6c5cff'])}`);
      if (form_data['leader_street_address']) notesParts.push(`Leadership address: ${form_data['leader_street_address']}`);
    }

    const memberRecord: Record<string, unknown> = {
      name: fullName,
      email: email,
      phone: phone || null,
      date_of_birth: form_data['562e6d09'] || null,
      preferred_pronouns: arrayToString(form_data['3a456eeb']) || null,
      registered_voter: registeredVoter,
      address: fullAddress || null,
      instagram: form_data['596e8a46'] || null,
      tiktok: form_data['6428fdf1'] || null,
      x: form_data['417477cd'] || null,
      in_school: form_data['69d07773'] || null,
      school_name: form_data['4a9c0213'] || null,
      graduation_year: form_data['706b4e0b'] || null,
      education_level: form_data['51cff5db'] || null,
      employed: form_data['6fa4f34c'] || null,
      industry: form_data['2585235b'] || null,
      desire_to_lead: form_data['17d3907b'] || null,
      committee: committeeChoices.length > 0 ? committeeChoices : null,
      hours_per_week: form_data['226743e3'] || null,
      passionate_issues: arrayToString(form_data['51e12843']) || null,
      current_chapter_member: form_data['016ae30f'] || null,
      chapter_name: form_data['3b88c54f'] || null,
      current_involvement: form_data['3f84c11f'] || null,
      gender_identity: arrayToString(form_data['60686161']) || null,
      sexual_orientation: arrayToString(form_data['3c7a8a3d']) || null,
      hispanic_latino: hispanicLatino,
      race: arrayToString(form_data['4a6d1b7f']) || null,
      disability: form_data['66a5f51e'] || null,
      accommodations: form_data['331915b2'] || null,
      community_type: form_data['32bfab74'] || null,
      religion: arrayToString(form_data['442d6c18']) || null,
      languages: form_data['40602e67'] || null,
      why_join: form_data['280f5f06'] || null,
      referral_source: arrayToString(form_data['6c6d967c']) || null,
      areas_of_interest: arrayToString(form_data['7e3d564c']) || null,
      goals_and_ambitions: form_data['54016ebb'] || null,
      qualified_experience: form_data['67b2a620'] || null,
      leadership_experience: form_data['13f36d81'] || null,
      notes: notesParts.length > 0 ? notesParts.join('\n') : null,
      date_joined: new Date().toISOString().split('T')[0],
    };

    // Check if member already exists by email
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .ilike('email', email)
      .single();

    let memberId: string;
    let wasExisting = false;

    if (existingMember) {
      // Update existing member (don't overwrite nulls)
      wasExisting = true;
      memberId = existingMember.id;

      // Only update fields that have values (don't null out existing data)
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(memberRecord)) {
        if (value !== null && value !== undefined && value !== '') {
          updateData[key] = value;
        }
      }

      const { error: updateError } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (updateError) {
        console.error('Member update error:', updateError);
        return NextResponse.json({ error: 'Failed to update member record' }, { status: 500 });
      }
    } else {
      // Create new member
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert(memberRecord)
        .select('id')
        .single();

      if (insertError) {
        console.error('Member insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create member record' }, { status: 500 });
      }

      memberId = newMember.id;
    }

    // Update the form submission with the member ID
    if (submission_id) {
      await supabase
        .from('form_submissions')
        .update({ member_id: memberId, status: 'processed' })
        .eq('id', submission_id);
    }

    // Trigger n8n welcome email webhook (fire and forget)
    try {
      await fetch('https://n8n.moydchat.org/webhook/membership-form-submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          name: fullName,
          email: email,
          phone: phone,
          was_existing: wasExisting,
          desire_to_lead: form_data['17d3907b'] || 'No',
          committees: committeeChoices,
          form_data: form_data,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (webhookErr) {
      // Don't fail the submission if webhook fails
      console.error('n8n webhook error (non-fatal):', webhookErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        member_id: memberId,
        was_existing: wasExisting,
        message: wasExisting
          ? `Welcome back, ${firstName}! Your membership information has been updated.`
          : `Welcome to MOYD, ${firstName}! Your membership is being processed.`,
      },
    });
  } catch (err) {
    console.error('Membership processing error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
