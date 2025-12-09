// Edge function client for form submission
// This connects to the Supabase edge function at:
// https://faajpcarasilbfndzkmd.supabase.co/functions/v1/submit-form

const EDGE_FUNCTION_URL = 'https://faajpcarasilbfndzkmd.supabase.co/functions/v1/submit-form';

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
