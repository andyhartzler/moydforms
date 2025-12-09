import { VoteInfo, MemberVerification, VoteSubmissionResult } from './vote-types';

// Edge Function endpoint - already deployed and ready to use
const VOTE_API_ENDPOINT = 'https://faajpcarasilbfndzkmd.supabase.co/functions/v1/verify-member-for-vote';

/**
 * Get basic vote info by slug (before phone verification)
 */
export async function getVoteInfo(
  slug: string,
  sessionToken?: string
): Promise<VoteInfo> {
  const response = await fetch(VOTE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'get_vote_info',
      slug,
      session_token: sessionToken,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get vote info');
  }

  return response.json();
}

/**
 * Verify member by phone number
 */
export async function verifyMember(
  phone: string,
  voteSlug: string,
  sessionToken?: string
): Promise<MemberVerification> {
  const response = await fetch(VOTE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'verify_member',
      phone,
      vote_slug: voteSlug,
      session_token: sessionToken,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to verify member');
  }

  return response.json();
}

/**
 * Submit vote
 */
export async function submitVote(
  voteId: string,
  memberId: string,
  voteData: Record<string, unknown>,
  sessionToken: string
): Promise<VoteSubmissionResult> {
  const response = await fetch(VOTE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'submit_vote',
      vote_id: voteId,
      member_id: memberId,
      vote_data: voteData,
      session_token: sessionToken,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit vote');
  }

  return response.json();
}
