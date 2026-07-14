import { createServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

// Field ID to members table column mapping
// Keys prefixed with _ are stored in notes or require special handling
const FIELD_TO_MEMBER_MAP: Record<string, string> = {
  // Page 1: Basics
  '7ef3d9a0': '_first_name', // special: combine with last name into `name`
  '7221a225': '_last_name',  // special: combine with first name into `name`
  '562e6d09': 'date_of_birth',
  'email_field': 'email',
  '458e9ec2': 'phone',

  // Page 2: Location & Identity
  '73400ed5': '_city',       // combined into `address`
  '207879c2': '_street',     // combined into `address`
  '41db9d9c': '_state',      // combined into `address`
  '23cca2cb': '_zip_code',   // combined into `address`
  '3a456eeb': 'preferred_pronouns',
  '559c0f96': '_registered_voter', // converted to boolean

  // Page 3: Social Media
  '596e8a46': 'instagram',
  '6428fdf1': 'tiktok',
  '417477cd': 'x',
  '011b2200': '_bluesky',    // no column — stored in notes

  // Page 4: Leadership Interest
  '17d3907b': 'desire_to_lead',

  // Page 4b: Committee Leadership Application (grid rows)
  '60d8b355': '_committee_1st', // grid row: 1st Choice
  '57b7ccec': '_committee_2nd', // grid row: 2nd Choice
  '65eafa86': '_committee_3rd', // grid row: 3rd Choice
  '3090e34d': '_committee_4th', // grid row: 4th Choice
  '40c20ece': '_committee_5th', // grid row: 5th Choice
  '15bbfc47': '_committee_6th', // grid row: 6th Choice
  '11648ea3': '_leadership_hours',
  '54016ebb': 'goals_and_ambitions',
  '67b2a620': 'qualified_experience',
  '122ee3c8': '_leader_passionate_issues', // leadership-section issues (stored in notes)
  '5d3b6dcf': 'why_issues_matter',
  '13f36d81': 'leadership_experience',
  '5780de4a': '_available_meetings',
  '7949931e': '_comfortable_teamwork',
  '75a2099d': '_leader_meeting_days',
  '3f6c5cff': '_leader_meeting_times',

  // Page 5: Skills & Areas of Interest
  '7e3d564c': 'areas_of_interest',

  // Page 6: Availability
  '226743e3': 'hours_per_week',
  '1de09937': '_meeting_days',
  '1af21ffa': '_meeting_times',

  // Page 7: Political & Community Involvement
  '016ae30f': 'current_chapter_member',
  '3b88c54f': 'chapter_name',
  '3f84c11f': 'current_involvement',
  '51e12843': 'passionate_issues',
  '2f1adc8c': 'political_experience',

  // Page 8: Education & Employment
  '69d07773': 'in_school',
  '4a9c0213': 'school_name',
  '706b4e0b': 'graduation_year',
  '51cff5db': 'education_level',
  '6fa4f34c': 'employed',
  '2585235b': 'industry',

  // Page 9: Demographics
  '60686161': 'gender_identity',
  '3c7a8a3d': 'sexual_orientation',
  '2238ba58': '_hispanic_latino', // converted to boolean
  '4a6d1b7f': 'race',
  '66a5f51e': 'disability',
  '331915b2': 'accommodations',
  '32bfab74': 'community_type',
  '442d6c18': 'religion',
  '40602e67': 'languages',

  // Page 10: Final Insights
  '280f5f06': 'why_join',
  '6cf26feb': '_additional_info', // stored in notes
  '6c6d967c': 'referral_source',
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

function calculateZodiacSign(dateStr: string): string | null {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();

    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    return 'Capricorn';
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Service-role client: `members` is RLS-locked with no anon policy, so the
  // public form's anon key cannot write it (this was the source of the 500 that
  // broke membership signups since the April RLS overhaul). This route runs
  // server-side only, so the service key is never exposed to the browser.
  const supabase = createServiceClient();

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
    // ── Core identity fields ──────────────────────────────────
    // First/last come from the IdentityFieldsStage "Full Name" by default (form_data.name).
    // The per-field keys (7ef3d9a0 / 7221a225) are only present on legacy forms that
    // still carry the redundant name inputs on page 1.
    let firstName = String(form_data['7ef3d9a0'] || '').trim();
    let lastName = String(form_data['7221a225'] || '').trim();
    const sessionName = String(form_data['name'] || '').trim();
    if (!firstName && !lastName && sessionName) {
      const parts = sessionName.split(/\s+/);
      firstName = parts.shift() || '';
      lastName = parts.join(' ');
    }
    const fullName = `${firstName} ${lastName}`.trim() || sessionName;
    const email = String(
      form_data['email_field'] || form_data['respondentEmail'] || form_data['email'] || ''
    ).trim().toLowerCase();
    const phone = String(form_data['458e9ec2'] || form_data['phone'] || '').trim();

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // ── Address ───────────────────────────────────────────────
    const street = String(form_data['207879c2'] || '').trim();
    const line2 = String(form_data['address_line2'] || '').trim();
    const streetWithApt = line2 ? `${street} ${line2}` : street;
    const city = String(form_data['73400ed5'] || '').trim();
    const state = String(form_data['41db9d9c'] || 'Missouri').trim();
    // Zip comes from the IdentityFieldsStage by default (form_data.zip_code);
    // 23cca2cb only survives on legacy forms that kept the dedicated Zip field on page 2.
    const zip = String(form_data['23cca2cb'] || form_data['zip_code'] || '').trim();
    const fullAddress = [streetWithApt, city, state, zip].filter(Boolean).join(', ');

    // ── Boolean conversions ──────────────────────────────────
    const registeredVoterRaw = form_data['559c0f96'];
    let registeredVoter: boolean | null = null;
    if (typeof registeredVoterRaw === 'string') {
      if (registeredVoterRaw === 'Yes') registeredVoter = true;
      else if (registeredVoterRaw === 'No') registeredVoter = false;
    } else if (Array.isArray(registeredVoterRaw)) {
      // checkbox field — "Yes" present means true
      if (registeredVoterRaw.includes('Yes')) registeredVoter = true;
      else if (registeredVoterRaw.includes('No')) registeredVoter = false;
    }

    const hispanicRaw = form_data['2238ba58'];
    let hispanicLatino: boolean | null = null;
    if (hispanicRaw === 'Yes') hispanicLatino = true;
    else if (hispanicRaw === 'No') hispanicLatino = false;

    // ── Committee choices from grid rows ─────────────────────
    const committeeGridIds = ['60d8b355', '57b7ccec', '65eafa86', '3090e34d', '40c20ece', '15bbfc47'];
    const committeeChoices: string[] = [];
    for (const id of committeeGridIds) {
      const val = form_data[id];
      if (val && typeof val === 'string') {
        committeeChoices.push(val);
      }
    }
    // Also accept a pre-built committee_choices array (from progressive form)
    if (committeeChoices.length === 0 && form_data['committee_choices']) {
      committeeChoices.push(...arrayToPostgresArray(form_data['committee_choices']));
    }

    // ── Zodiac sign ──────────────────────────────────────────
    const dob = form_data['562e6d09'] || null;
    const zodiacSign = dob ? calculateZodiacSign(String(dob)) : null;

    // ── Notes (fields without direct columns) ────────────────
    const notesParts: string[] = [];
    if (form_data['011b2200']) notesParts.push(`Bluesky: ${form_data['011b2200']}`);
    if (form_data['6cf26feb']) notesParts.push(`Additional info: ${form_data['6cf26feb']}`);
    if (form_data['1de09937']) notesParts.push(`Meeting days: ${arrayToString(form_data['1de09937'])}`);
    if (form_data['1af21ffa']) notesParts.push(`Meeting times: ${arrayToString(form_data['1af21ffa'])}`);
    // No dedicated columns for these — write to notes so the data doesn't
    // get dropped on the floor. User-visible columns on the members table
    // stay untouched.
    if (form_data['major_field']) notesParts.push(`Major / area of study: ${form_data['major_field']}`);
    if (form_data['experience_advocacy']) notesParts.push(`Advocacy experience: ${form_data['experience_advocacy']}`);
    // Capture any "Other (please specify)" free-text the user typed when
    // they selected the Other option on radio/checkbox fields.
    Object.keys(form_data).forEach((k) => {
      if (k.endsWith('_other_text') && form_data[k]) {
        const parent = k.replace(/_other_text$/, '');
        notesParts.push(`Other (${parent}): ${form_data[k]}`);
      }
    });

    // Leadership application notes
    if (form_data['17d3907b'] === 'Yes' || form_data['17d3907b'] === 'Maybe') {
      notesParts.push('--- LEADERSHIP APPLICATION ---');
      for (let i = 0; i < committeeGridIds.length; i++) {
        const val = form_data[committeeGridIds[i]];
        if (val) notesParts.push(`Choice ${i + 1}: ${val}`);
      }
      if (form_data['11648ea3']) notesParts.push(`Leadership hours/week: ${form_data['11648ea3']}`);
      if (form_data['5780de4a']) notesParts.push(`Available for meetings: ${form_data['5780de4a']}`);
      if (form_data['7949931e']) notesParts.push(`Comfortable with teamwork: ${form_data['7949931e']}`);
      if (form_data['75a2099d']) notesParts.push(`Leader meeting days: ${arrayToString(form_data['75a2099d'])}`);
      if (form_data['3f6c5cff']) notesParts.push(`Leader meeting times: ${arrayToString(form_data['3f6c5cff'])}`);
      if (form_data['122ee3c8']) notesParts.push(`Passionate issues (leadership): ${arrayToString(form_data['122ee3c8'])}`);
    }

    // ── Build the member record ──────────────────────────────
    const memberRecord: Record<string, unknown> = {
      name: fullName,
      email: email,
      phone: phone || null,
      date_of_birth: dob || null,
      preferred_pronouns: arrayToString(form_data['3a456eeb']) || null,
      registered_voter: registeredVoter,
      address: fullAddress || null,
      county: city || null, // best-effort city→county; trigger_normalize_county will fix
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
      hours_per_week: arrayToString(form_data['226743e3']) || null,
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
      political_experience: form_data['2f1adc8c'] || null,
      // Schema stores this under its own field id now; keep the legacy
      // 5d3b6dcf as fallback so existing in-flight submissions don't lose it.
      why_issues_matter: form_data['why_issues_matter'] || form_data['5d3b6dcf'] || null,
      zodiac_sign: zodiacSign,
      notes: notesParts.length > 0 ? notesParts.join('\n') : null,
      date_joined: new Date().toISOString().split('T')[0],
    };

    // ── Upsert member ────────────────────────────────────────
    // Match on the already-lowercased email. `.maybeSingle()` returns null
    // (not an error) when there's no existing member, and `.eq` avoids ilike
    // treating % / _ in an address as wildcards.
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let memberId: string;
    let wasExisting = false;

    if (existingMember) {
      wasExisting = true;
      memberId = existingMember.id;

      // Only update fields that have non-null values (don't overwrite existing data with nulls)
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

    // ── Link submission ──────────────────────────────────────
    if (submission_id) {
      await supabase
        .from('form_submissions')
        .update({ member_id: memberId, status: 'processed' })
        .eq('id', submission_id);
    }

    // ── Fire n8n webhook (comprehensive payload for all automations) ──
    try {
      await fetch('https://n8n.moydchat.org/webhook/membership-form-submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Core identity
          member_id: memberId,
          first_name: firstName,
          last_name: lastName,
          name: fullName,
          email: email,
          phone: phone,
          date_of_birth: dob || null,

          // Location
          street_address: street,
          city: city,
          state: state,
          zip_code: zip,
          address: fullAddress,

          // Identity
          preferred_pronouns: arrayToString(form_data['3a456eeb']) || null,
          registered_voter: registeredVoter,

          // Social
          instagram: form_data['596e8a46'] || null,
          tiktok: form_data['6428fdf1'] || null,
          x: form_data['417477cd'] || null,
          bluesky: form_data['011b2200'] || null,

          // Education & Employment
          in_school: form_data['69d07773'] || null,
          school_name: form_data['4a9c0213'] || null,
          graduation_year: form_data['706b4e0b'] || null,
          education_level: form_data['51cff5db'] || null,
          employed: form_data['6fa4f34c'] || null,
          industry: form_data['2585235b'] || null,

          // Leadership & Committees
          desire_to_lead: form_data['17d3907b'] || 'No',
          committees: committeeChoices,
          committee_1st_choice: form_data['60d8b355'] || null,
          committee_2nd_choice: form_data['57b7ccec'] || null,
          committee_3rd_choice: form_data['65eafa86'] || null,
          leadership_hours: form_data['11648ea3'] || null,
          goals_and_ambitions: form_data['54016ebb'] || null,
          qualified_experience: form_data['67b2a620'] || null,
          leadership_experience: form_data['13f36d81'] || null,

          // Involvement
          hours_per_week: arrayToString(form_data['226743e3']) || null,
          passionate_issues: arrayToString(form_data['51e12843']) || null,
          why_issues_matter: form_data['why_issues_matter'] || form_data['5d3b6dcf'] || null,
          current_chapter_member: form_data['016ae30f'] || null,
          chapter_name: form_data['3b88c54f'] || null,
          current_involvement: form_data['3f84c11f'] || null,
          political_experience: form_data['2f1adc8c'] || null,
          areas_of_interest: arrayToString(form_data['7e3d564c']) || null,

          // Demographics
          gender_identity: arrayToString(form_data['60686161']) || null,
          sexual_orientation: arrayToString(form_data['3c7a8a3d']) || null,
          hispanic_latino: hispanicLatino,
          race: arrayToString(form_data['4a6d1b7f']) || null,
          disability: form_data['66a5f51e'] || null,
          accommodations: form_data['331915b2'] || null,
          community_type: form_data['32bfab74'] || null,
          religion: arrayToString(form_data['442d6c18']) || null,
          languages: form_data['40602e67'] || null,

          // Final
          why_join: form_data['280f5f06'] || null,
          referral_source: arrayToString(form_data['6c6d967c']) || null,
          additional_info: form_data['6cf26feb'] || null,
          zodiac_sign: zodiacSign,

          // Scheduling
          meeting_days: form_data['1de09937'] || null,
          meeting_times: form_data['1af21ffa'] || null,

          // Meta
          was_existing: wasExisting,
          submission_id: submission_id,
          submitted_at: new Date().toISOString(),

          // Pass full form_data for any automation that needs raw access
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
        chapter_name: form_data['3b88c54f'] || 'Missouri Young Democrats',
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
