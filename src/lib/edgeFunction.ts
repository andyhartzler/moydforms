// Edge function client for form submission
// This connects to the Supabase edge function at:
// https://faajpcarasilbfndzkmd.supabase.co/functions/v1/submit-form

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://faajpcarasilbfndzkmd.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/submit-form`;
const EDGE_FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

export interface InitSessionResponse {
  success: boolean;
  submission_id: string;
  subscriber_id: string;
  member_id: string | null;
  donor_id: string | null;
  session_token: string;
  person_found: boolean;
  prefill: {
    name: string | null;
    email: string | null;
    zip_code: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  is_placeholder: boolean;
}

async function callEdgeFunction<T>(action: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...data }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Edge function call failed');
  }

  return result;
}

// Called when form page loads
export async function recordFormView(
  formId: string,
  sessionToken?: string
): Promise<{ session_token: string }> {
  return callEdgeFunction('view', {
    form_id: formId,
    session_token: sessionToken,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  });
}

// Called when phone number is entered
export async function initSession(
  formId: string,
  phone: string,
  sessionToken?: string
): Promise<InitSessionResponse> {
  return callEdgeFunction('init_session', {
    form_id: formId,
    phone,
    session_token: sessionToken,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  });
}

// Called on every field blur
export async function updateField(
  submissionId: string,
  sessionToken: string,
  fieldKey: string,
  fieldValue: unknown,
  fieldType?: string
): Promise<{ success: boolean }> {
  return callEdgeFunction('update_field', {
    submission_id: submissionId,
    session_token: sessionToken,
    field_key: fieldKey,
    field_value: fieldValue,
    field_type: fieldType,
  });
}

// Called when form is submitted
export async function submitForm(
  submissionId: string,
  sessionToken: string,
  finalData?: Record<string, unknown>
): Promise<{ success: boolean; submission_id: string }> {
  return callEdgeFunction('submit', {
    submission_id: submissionId,
    session_token: sessionToken,
    final_data: finalData,
  });
}

// Called on page unload or timeout
export async function abandonForm(
  submissionId: string,
  sessionToken: string
): Promise<{ success: boolean }> {
  return callEdgeFunction('abandon', {
    submission_id: submissionId,
    session_token: sessionToken,
  });
}

// Get the edge function URL for sendBeacon
export function getEdgeFunctionUrl(): string {
  return EDGE_FUNCTION_URL;
}

// ============================================
// Specialized Edge Functions for Form Processing
// ============================================

export interface FileUploadInfo {
  field_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

// Response from process-chartering-submission
export interface CharteringSubmissionResponse {
  success: boolean;
  data?: {
    chapter_id: string;
    chapter_name: string;
    chapter_type: string;
    status: string;
    membership_form_url: string | null;
    membership_form_slug: string | null;
    membership_form_id: string | null;
    officers_processed: number;
    members_processed: number;
    governing_docs_converted: boolean;
    message: string;
  };
  error?: string;
}

// Response from process-member-signup
export interface MemberSignupResponse {
  success: boolean;
  data?: {
    member_id: string;
    was_existing: boolean;
    chapter_name: string;
    message: string;
  };
  error?: string;
}

// Response from process-member-info-update
export interface MemberInfoUpdateResponse {
  success: boolean;
  data?: {
    member_id: string;
    fields_updated: number;
    message: string;
  };
  error?: string;
}

// Generic Edge Function response
export type EdgeFunctionResponse = CharteringSubmissionResponse | MemberSignupResponse | MemberInfoUpdateResponse;

// Call a specific Edge Function endpoint
async function callSpecificEdgeFunction<T>(
  endpoint: string,
  data: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${EDGE_FUNCTIONS_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok && !result.success) {
    throw new Error(result.error || `Edge function call to ${endpoint} failed`);
  }

  return result;
}

// Process chartering form submission
export async function processCharteringSubmission(
  submissionId: string,
  formData: Record<string, unknown>,
  files: FileUploadInfo[]
): Promise<CharteringSubmissionResponse> {
  return callSpecificEdgeFunction<CharteringSubmissionResponse>(
    'process-chartering-submission',
    {
      submission_id: submissionId,
      form_data: formData,
      files,
    }
  );
}

// Process member signup from join-* forms
export async function processMemberSignup(
  submissionId: string,
  formSlug: string,
  formData: Record<string, unknown>,
  formSettings?: Record<string, unknown>
): Promise<MemberSignupResponse> {
  return callSpecificEdgeFunction<MemberSignupResponse>(
    'process-member-signup',
    {
      submission_id: submissionId,
      form_slug: formSlug,
      form_data: formData,
      form_settings: formSettings,
    }
  );
}

// Process member info update
export async function processMemberInfoUpdate(
  submissionId: string,
  formData: Record<string, unknown>,
  settings?: Record<string, unknown>
): Promise<MemberInfoUpdateResponse> {
  return callSpecificEdgeFunction<MemberInfoUpdateResponse>(
    'process-member-info-update',
    {
      submission_id: submissionId,
      form_data: formData,
      settings,
    }
  );
}

// Determine which Edge Function to call based on form slug
export function getEdgeFunctionForForm(slug: string): 'chartering' | 'member-signup' | 'member-info' | null {
  if (slug === 'chapter-chartering') {
    return 'chartering';
  }
  if (slug.startsWith('join-')) {
    return 'member-signup';
  }
  if (slug === 'member-info') {
    return 'member-info';
  }
  return null;
}

// Upload file to Supabase Storage
export async function uploadFileToStorage(
  file: File,
  storagePath: string,
  bucket: string = 'form-uploads'
): Promise<{ path: string; url: string }> {
  // Generate unique filename
  const uuid = crypto.randomUUID();
  const fileName = `${uuid}_${file.name}`;
  const fullPath = `${storagePath}/${fileName}`;

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${fullPath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'File upload failed');
  }

  return {
    path: fullPath,
    url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fullPath}`,
  };
}
