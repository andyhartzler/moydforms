// Canonical schema for an auto-generated chapter "join" form.
//
// When a new chapter is chartered, the `process-chartering-submission` Edge
// Function creates a chapter row + records a planned `membership_form_id` +
// `membership_form_slug` in the chartering submission's page_data. A separate
// moydforms API route (/api/chartering/create-join-form) then calls Supabase
// with the service role to materialize the form_schemas row using this
// template — so the auto-generated URL actually renders when members visit it.
//
// Single source of truth — keep this in sync with the Zapier-era member
// onboarding zaps (Welcome Email Poolooza etc.) so the field IDs line up with
// downstream member-creation logic.

export interface JoinFormContext {
  chapterId: string;
  chapterName: string;
}

export interface JoinFormRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  form_type: 'registration';
  schema: Record<string, unknown>;
  settings: Record<string, unknown>;
  status: 'active';
  page_count: number;
  public_form: true;
  require_login: false;
  one_submission_per_user: false;
}

function schema(ctx: JoinFormContext) {
  return {
    questions: [
      {
        id: 'section_welcome',
        page: 1,
        text: `Join ${ctx.chapterName}`,
        description:
          "Fill this out to officially associate yourself with the chapter and become a member of the Missouri Young Democrats. Welcome!",
        question_type: 'section_header',
      },
      {
        id: 'first_name',
        page: 1,
        text: 'First Name',
        required: true,
        validation: { min_length: 2, max_length: 100 },
        placeholder: 'Your first name',
        question_type: 'short_answer',
      },
      {
        id: 'last_name',
        page: 1,
        text: 'Last Name',
        required: true,
        validation: { min_length: 2, max_length: 100 },
        placeholder: 'Your last name',
        question_type: 'short_answer',
      },
      {
        id: 'email',
        page: 1,
        text: 'Email Address',
        required: true,
        placeholder: 'you@example.com',
        question_type: 'email',
      },
      {
        id: 'phone',
        page: 1,
        text: 'Phone Number',
        required: true,
        placeholder: '(555) 555-5555',
        question_type: 'phone',
      },
      {
        id: 'date_of_birth',
        page: 1,
        text: 'Date of Birth',
        required: true,
        helper_text: 'MOYD membership is open to folks ages 13–35.',
        question_type: 'date_picker',
      },
      {
        id: 'city',
        page: 1,
        text: 'City / Town',
        required: true,
        question_type: 'short_answer',
      },
      {
        id: 'zip_code',
        page: 1,
        text: 'ZIP Code',
        required: true,
        validation: { pattern: '^[0-9]{5}(-[0-9]{4})?$' },
        question_type: 'short_answer',
      },
      {
        id: 'preferred_pronouns',
        page: 1,
        text: 'Preferred Pronouns (optional)',
        required: false,
        question_type: 'short_answer',
      },
      {
        id: 'areas_of_interest',
        page: 1,
        text: 'What are you interested in? (optional)',
        helper_text: 'Select any that apply.',
        required: false,
        question_type: 'checkbox_group',
        options: [
          { id: 'organizing', value: 'organizing', label: 'Organizing & voter outreach' },
          { id: 'fundraising', value: 'fundraising', label: 'Fundraising' },
          { id: 'comms', value: 'comms', label: 'Communications / social media' },
          { id: 'events', value: 'events', label: 'Events & programming' },
          { id: 'policy', value: 'policy', label: 'Policy & advocacy' },
          { id: 'campaigns', value: 'campaigns', label: 'Campaigns & elections' },
        ],
      },
    ],
    metadata: {
      chapter_id: ctx.chapterId,
      chapter_name: ctx.chapterName,
      auto_generated: true,
      generated_at: new Date().toISOString(),
    },
    confirmation: {
      message: `Welcome to ${ctx.chapterName}! You're now officially a member.`,
    },
  };
}

const SETTINGS = {
  prefill_enabled: true,
  require_valid_token: false,
  field_to_member_mapping: {
    first_name: '_first_name',
    last_name: '_last_name',
    email: 'email',
    phone: 'phone',
    date_of_birth: 'date_of_birth',
    city: '_city',
    zip_code: '_zip_code',
    preferred_pronouns: 'preferred_pronouns',
    areas_of_interest: 'areas_of_interest',
  },
};

/**
 * Build the full form_schemas row payload for an auto-generated join form.
 * The caller supplies the intended id + slug (these come from
 * page_data.membership_form_id / page_data.membership_form_slug written by
 * the process-chartering-submission Edge Function).
 */
export function buildJoinFormRow(
  id: string,
  slug: string,
  ctx: JoinFormContext
): JoinFormRow {
  return {
    id,
    slug,
    title: `Join ${ctx.chapterName}`,
    description: `Become an official member of ${ctx.chapterName}.`,
    form_type: 'registration',
    schema: schema(ctx),
    settings: SETTINGS,
    status: 'active',
    page_count: 1,
    public_form: true,
    require_login: false,
    one_submission_per_user: false,
  };
}
