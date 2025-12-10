import { createBrowserClient } from '@supabase/ssr';
import { getOrCreateSessionToken } from './analytics';

// Initialize Supabase client
const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

export type FormAnalyticsEventType = 'view' | 'start' | 'phone_entered' | 'identity_found' | 'submit' | 'abandon';
export type FieldAnalyticsEventType = 'interaction' | 'field_completed' | 'field_updated' | 'time_spent';

export interface AnalyticsEvent {
  form_id: string;
  event_type: FormAnalyticsEventType;
  member_id?: string | null;
  vote_id?: string | null;
  metadata?: Record<string, any>;
}

export interface FieldAnalyticsEvent {
  form_id: string;
  field_id: string;
  field_type?: string;
  event_type: FieldAnalyticsEventType;
  member_id?: string | null;
  vote_id?: string | null;
  metadata?: Record<string, any>;
}

export async function trackVoteEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const supabase = createClient();
    const sessionToken = getOrCreateSessionToken();

    await supabase.from('form_analytics').insert({
      form_id: event.form_id,
      event_type: event.event_type,
      member_id: event.member_id || null,
      vote_id: event.vote_id || null,
      session_token: sessionToken,
      timestamp: new Date().toISOString(),
      metadata: event.metadata || null,
      ip_address: null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
    });
  } catch (error) {
    console.error('Failed to track vote event:', error);
  }
}

export async function trackVoteFieldEvent(event: FieldAnalyticsEvent): Promise<void> {
  try {
    const supabase = createClient();
    const sessionToken = getOrCreateSessionToken();

    await supabase.from('form_field_analytics').insert({
      form_id: event.form_id,
      field_id: event.field_id,
      field_type: event.field_type || null,
      event_type: event.event_type,
      member_id: event.member_id || null,
      vote_id: event.vote_id || null,
      session_token: sessionToken,
      timestamp: new Date().toISOString(),
      metadata: event.metadata || null,
    });
  } catch (error) {
    console.error('Failed to track vote field event:', error);
  }
}

export async function linkSessionToMember(
  formId: string,
  memberId: string
): Promise<void> {
  try {
    const supabase = createClient();
    const sessionToken = getOrCreateSessionToken();

    // Update form_analytics
    await supabase
      .from('form_analytics')
      .update({ member_id: memberId })
      .eq('form_id', formId)
      .eq('session_token', sessionToken)
      .is('member_id', null);

    // Update form_field_analytics
    await supabase
      .from('form_field_analytics')
      .update({ member_id: memberId })
      .eq('form_id', formId)
      .eq('session_token', sessionToken)
      .is('member_id', null);
  } catch (error) {
    console.error('Failed to link session to member:', error);
  }
}

export async function linkSessionToVote(
  formId: string,
  voteId: string
): Promise<void> {
  try {
    const supabase = createClient();
    const sessionToken = getOrCreateSessionToken();

    // Update form_analytics
    await supabase
      .from('form_analytics')
      .update({ vote_id: voteId })
      .eq('form_id', formId)
      .eq('session_token', sessionToken);

    // Update form_field_analytics
    await supabase
      .from('form_field_analytics')
      .update({ vote_id: voteId })
      .eq('form_id', formId)
      .eq('session_token', sessionToken);
  } catch (error) {
    console.error('Failed to link session to vote:', error);
  }
}
