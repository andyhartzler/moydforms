// Dual-write a form submission to the original Google Sheet that the
// pre-moydforms Zapier pipeline used to log responses. Keeps the historical
// response log continuous so nothing is lost when we retire the Google Form.
//
// Fire-and-forget — don't block the submission response on this.

import { appendRow } from './googleSheets';

type FieldValue = unknown;
type SubmissionData = Record<string, FieldValue>;

interface SheetTarget {
  spreadsheetId: string;
  worksheetTitle: string;
  /** Ordered list mapping each sheet column to either a form field id or null. */
  columns: Array<string | null>;
  /** Extra transform for specific fields (e.g. join arrays, format phone). */
  transforms?: Record<string, (value: FieldValue, data: SubmissionData) => FieldValue>;
}

// Chapter chartering form → Chartering Form (Responses) sheet.
// Source-of-truth mapping based on the 33 columns in worksheet "Form Responses 1"
// as of 2026-04-14 (106 historical rows from the Google Forms era).
const CHARTERING: SheetTarget = {
  spreadsheetId: '1PKH96W2G6lf1sve-q_2ZHTQjQGU_OHekFZJwzFpjqA0',
  worksheetTitle: 'Form Responses 1',
  columns: [
    'timestamp',                    // 1 Timestamp — generated
    'contact_first_name',           // 2 First Name
    'contact_last_name',            // 3 Last Name
    'contact_phone',                // 4 Phone Number
    'contact_email',                // 5 Email Address
    'chapter_type_label',           // 6 Unit Type — human-friendly label
    'chapter_name',                 // 7 Chartered Unit name
    'county_selection_label',       // 8 County
    'county_other_specify',         // 9 Other county
    'county_governing_documents',   // 10 County governing docs (file URL or filename)
    'county_officers_list',         // 11 County officers
    'county_membership_list',       // 12 County membership list
    'hs_school_name',               // 13 HS name
    'hs_city',                      // 14 HS city
    'hs_zip',                       // 15 HS zip
    'hs_street_address',            // 16 HS street
    'hs_governing_documents',       // 17 HS governing
    'hs_officers_list',             // 18 HS officers
    'hs_membership_list',           // 19 HS membership
    'college_name',                 // 20 College name
    'college_city',                 // 21 College city
    'college_zip',                  // 22 College zip
    'college_street_address',       // 23 College street
    'college_governing_documents',  // 24 College governing
    'college_officers_list',        // 25 College officers
    'college_membership_list',      // 26 College membership
    'social_facebook',              // 27 Facebook
    'social_twitter',               // 28 Twitter (X)
    'social_instagram',             // 29 Instagram
    'social_threads',               // 30 Threads
    'social_bluesky',               // 31 Bluesky
    'social_tiktok',                // 32 TikTok
    'social_website',               // 33 Website
  ],
  transforms: {
    timestamp: () => new Date().toISOString(),
    chapter_type_label: (_v, data) => {
      const v = data.chapter_type;
      if (v === 'county') return 'County Chapter';
      if (v === 'highschool') return 'High School Chapter';
      if (v === 'college') return 'College Chapter';
      return (v as string) || '';
    },
    county_selection_label: (v) => {
      // Supabase stores lowercase county ids; sheet expects label case
      if (typeof v !== 'string') return '';
      if (v === 'other') return 'Other';
      return v.charAt(0).toUpperCase() + v.slice(1);
    },
  },
};

// Membership form → Interest Form (Responses) sheet.
// Only the cleanly-mappable columns are populated. The Zapier-era sheet has 77
// columns including many legacy/duplicate/typo'd headers; we leave those blank
// and rely on the current Supabase submission as the canonical record.
const MEMBERSHIP: SheetTarget = {
  spreadsheetId: '13YznU1lEJSbqrXxIxK_jWTddY8VUxCXtPNqv-i_wpEs',
  worksheetTitle: 'Form Responses 1',
  columns: [
    'timestamp',                 // 1
    'email_field',               // 2 Email Address
    '7ef3d9a0',                  // 3 First Name
    '7221a225',                  // 4 Last Name
    '3a456eeb',                  // 5 Preferred Pronouns
    '562e6d09',                  // 6 Date of Birth
    null,                        // 7 Zodiac (legacy, computed downstream)
    '3c7a8a3d',                  // 8 Sexual Orientation
    '4a6d1b7f',                  // 9 Race
    '60686161',                  // 10 Gender Identity
    '17d3907b',                  // 11 Interested in serving
    '226743e3',                  // 12 Hours per week
    '73400ed5',                  // 13 City/Town
    '458e9ec2',                  // 14 Phone
    '596e8a46',                  // 15 Instagram
    null,                        // 16 Instagram Link (legacy)
    '6428fdf1',                  // 17 TikTok
    null,                        // 18 TikTok Link (legacy)
    '417477cd',                  // 19 X (Twitter)
    '011b2200',                  // 20 Bluesky
    '51cff5db',                  // 21 Highest education
    '442d6c18',                  // 22 Religious affiliation
    '559c0f96',                  // 23 Registered to vote
    '7e3d564c',                  // 24 Skills great at
    '1de09937',                  // 25 Meeting days (general)
    '1af21ffa',                  // 26 Meeting times (general)
    '3f84c11f',                  // 27 Other orgs
    '51e12843',                  // 28 Issues passionate
    null,                        // 29 Experience advocating (not in Supabase)
    '69d07773',                  // 30 Currently enrolled
    '4a9c0213',                  // 31 School name
    '6fa4f34c',                  // 32 Employed
    '2585235b',                  // 33 Industry
    '2238ba58',                  // 34 Hispanic origin
    '66a5f51e',                  // 35 Disability
    '331915b2',                  // 36 Accommodations
    '32bfab74',                  // 37 Community type
    '40602e67',                  // 38 Languages
    '280f5f06',                  // 39 Why join
    '6cf26feb',                  // 40 Other info
    '6c6d967c',                  // 41 How heard
    '207879c2',                  // 42 Street address
    null,                        // 43 Column 41 (legacy Zapier artifact)
    null,                        // 44 Duplicate skills col
    null,                        // 45 City (duplicate of col 13)
    '23cca2cb',                  // 46 Zip code
    'committee_1st_choice',      // 47 1st choice
    'committee_2nd_choice',      // 48 2nd choice
    'committee_3rd_choice',      // 49 3rd choice
    null, null, null,            // 50-52 4th-6th choices (not in Supabase)
    '11648ea3',                  // 53 Hours per week (leadership)
    '67b2a620',                  // 54 Why interested in role
    '54016ebb',                  // 55 Experience/skills
    '13f36d81',                  // 56 Prior leadership
    null,                        // 57 Why issues matter (not in Supabase)
    '5780de4a',                  // 58 Attend regular meetings
    '7949931e',                  // 59 Team comfort
    '41db9d9c',                  // 60 State
    null, null, null,            // 61-63 duplicates
    '706b4e0b',                  // 64 Grad year
    '016ae30f',                  // 65 YD chapter member
    '3b88c54f',                  // 66 Chapter name
    null, null, null, null, null, null, // 67-72 legacy duplicates
    null, null,                          // 73-74
    null,                                // 75
    null,                                // 76
    null,                                // 77
  ],
  transforms: {
    timestamp: () => new Date().toISOString(),
  },
};

const TARGETS: Record<string, SheetTarget> = {
  membership: MEMBERSHIP,
  'chapter-chartering': CHARTERING,
};

function coerce(value: FieldValue): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(coerce).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildRow(
  target: SheetTarget,
  data: SubmissionData,
  fileUrls: Record<string, string | string[]> | null
): string[] {
  return target.columns.map((col) => {
    if (!col) return '';
    const transform = target.transforms?.[col];
    if (transform) {
      return coerce(transform(data[col], data));
    }
    // File URLs override raw data for file_upload fields
    if (fileUrls && col in fileUrls) {
      const fu = fileUrls[col];
      if (Array.isArray(fu)) return fu.join(', ');
      return fu || '';
    }
    return coerce(data[col]);
  });
}

/**
 * Some field IDs that the legacy Google Sheet expects were dropped from the
 * live form schema (they duplicated what the IdentityFieldsStage already
 * collects). Backfill the per-field keys from the session identity values
 * before building the row, so the sheet — and any n8n workflow that triggers
 * off it — sees the same shape it's always seen.
 */
function normalizeIdentityFields(slug: string, data: SubmissionData): SubmissionData {
  if (slug !== 'membership') return data;
  const out: SubmissionData = { ...data };
  // Name: split "Full Name" into first/last if per-field IDs are empty.
  if (!out['7ef3d9a0'] && !out['7221a225'] && typeof out['name'] === 'string') {
    const parts = String(out['name']).trim().split(/\s+/);
    out['7ef3d9a0'] = parts.shift() || '';
    out['7221a225'] = parts.join(' ');
  }
  if (!out['email_field'] && typeof out['email'] === 'string') out['email_field'] = out['email'];
  if (!out['458e9ec2'] && typeof out['phone'] === 'string') out['458e9ec2'] = out['phone'];
  if (!out['23cca2cb'] && typeof out['zip_code'] === 'string') out['23cca2cb'] = out['zip_code'];
  return out;
}

/**
 * Dual-write a form submission to the legacy Google Sheet for continuity.
 * Returns true on success, false on any failure. Never throws — caller should
 * fire-and-forget and not propagate errors to the submission response.
 */
export async function dualWriteSubmission(
  slug: string,
  data: SubmissionData,
  fileUrls: Record<string, string | string[]> | null
): Promise<boolean> {
  const target = TARGETS[slug];
  if (!target) return false;
  try {
    const row = buildRow(target, normalizeIdentityFields(slug, data), fileUrls);
    return await appendRow(target.spreadsheetId, target.worksheetTitle, row);
  } catch (err) {
    console.error('[sheetsDualWrite] append failed:', err);
    return false;
  }
}
