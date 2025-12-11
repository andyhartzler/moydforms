'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getVoteInfo, verifyMember, submitVote } from '@/lib/vote-api';
import { PhoneVerification } from '@/components/vote/PhoneVerification';
import { VoteNotMember } from '@/components/vote/VoteNotMember';
import { VoteNotEligible } from '@/components/vote/VoteNotEligible';
import { VoteStatusMessage } from '@/components/vote/VoteStatusMessage';
import { PublicVoteForm } from '@/components/vote/PublicVoteForm';
import { VoteConfirmation } from '@/components/vote/VoteConfirmation';
import { AlreadyVoted } from '@/components/vote/AlreadyVoted';
import { trackVoteEvent, linkSessionToMember, linkSessionToVote } from '@/lib/voteAnalytics';
import { clearSessionToken } from '@/lib/analytics';
import type { VoteInfo, MemberVerification } from '@/lib/vote-types';

type PageState =
  | 'loading'
  | 'phone_entry'
  | 'not_member'
  | 'not_eligible'
  | 'already_voted'
  | 'vote_form'
  | 'submitted'
  | 'status_message';

export default function PublicVotePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [voteInfo, setVoteInfo] = useState<VoteInfo | null>(null);
  const [memberVerification, setMemberVerification] = useState<MemberVerification | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  const hasTrackedView = useRef(false);
  const hasTrackedStart = useRef(false);

  const loadVoteInfo = useCallback(async () => {
    try {
      const info = await getVoteInfo(slug);
      setVoteInfo(info);
      setSessionToken(info.session_token);

      // Track page view
      if (!hasTrackedView.current && info.vote_id) {
        await trackVoteEvent({
          form_id: info.vote_id,
          event_type: 'view',
          metadata: {
            vote_title: info.vote_title,
            page_url: typeof window !== 'undefined' ? window.location.href : null,
          },
        });
        hasTrackedView.current = true;
      }

      if (info.vote_status !== 'open') {
        setPageState('status_message');
      } else {
        setPageState('phone_entry');
      }
    } catch (err) {
      console.error('Error loading vote info:', err);
      setVoteInfo({
        vote_id: null,
        vote_title: null,
        vote_description: null,
        vote_status: 'not_found',
        voting_starts_at: null,
        voting_ends_at: null,
        committee_restricted: null,
        session_token: '',
      });
      setPageState('status_message');
    }
  }, [slug]);

  // Initial load - get vote info
  useEffect(() => {
    loadVoteInfo();
  }, [loadVoteInfo]);

  // Track abandon event if user leaves without completing
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasTrackedStart.current && pageState !== 'submitted' && voteInfo?.vote_id) {
        // Use sendBeacon for reliable tracking on page leave
        const payload = JSON.stringify({
          form_id: voteInfo.vote_id,
          event_type: 'abandon',
          member_id: memberVerification?.member_id || null,
          session_token: sessionStorage.getItem('vote_session_token'),
          timestamp: new Date().toISOString(),
          metadata: { abandoned_at_step: pageState },
        });

        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/form_analytics`,
          payload
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [voteInfo?.vote_id, memberVerification?.member_id, pageState]);

  const handleVerifyPhone = async (phone: string) => {
    setVerifying(true);
    setVerifyError('');

    try {
      // Track phone entered
      if (voteInfo?.vote_id) {
        await trackVoteEvent({
          form_id: voteInfo.vote_id,
          event_type: 'phone_entered',
          metadata: { phone_last_four: phone.slice(-4) },
        });
      }

      const result = await verifyMember(phone, slug, sessionToken || undefined);
      setMemberVerification(result);
      setSessionToken(result.session_token);

      // Track identity found
      if (voteInfo?.vote_id) {
        await trackVoteEvent({
          form_id: voteInfo.vote_id,
          event_type: 'identity_found',
          member_id: result.member_id || undefined,
          metadata: {
            found: result.is_member,
            member_name: result.member_name || undefined,
            is_eligible: result.is_eligible,
          },
        });
      }

      // Link session to member if verified
      if (result.is_member && voteInfo?.vote_id && result.member_id) {
        await linkSessionToMember(voteInfo.vote_id, result.member_id);
      }

      if (!result.is_member) {
        setPageState('not_member');
      } else if (result.already_voted) {
        setPageState('already_voted');
      } else if (!result.is_eligible) {
        setPageState('not_eligible');
      } else if (result.vote_status !== 'open') {
        setVoteInfo({
          ...voteInfo!,
          vote_status: result.vote_status,
        });
        setPageState('status_message');
      } else {
        // Track start event when vote form is about to be shown
        if (!hasTrackedStart.current && voteInfo?.vote_id && result.member_id) {
          await trackVoteEvent({
            form_id: voteInfo.vote_id,
            event_type: 'start',
            member_id: result.member_id,
          });
          hasTrackedStart.current = true;
        }
        setPageState('vote_form');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify membership';
      setVerifyError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitVote = async (voteData: Record<string, unknown>) => {
    if (!memberVerification?.vote_id || !memberVerification?.member_id) {
      setSubmitError('Invalid session. Please refresh and try again.');
      return;
    }

    try {
      const result = await submitVote(
        memberVerification.vote_id,
        memberVerification.member_id,
        voteData,
        sessionToken!
      );

      if (result.success) {
        // Track submit event with vote_id from the response
        await trackVoteEvent({
          form_id: memberVerification.vote_id,
          event_type: 'submit',
          member_id: memberVerification.member_id,
          vote_id: result.vote_id,
          metadata: {
            questions_answered: Object.keys(voteData).length,
          },
        });

        // Link all session events to the vote_id
        if (result.vote_id) {
          await linkSessionToVote(memberVerification.vote_id, result.vote_id);
        }

        // Clear session token
        clearSessionToken();

        setPageState('submitted');
      } else {
        setSubmitError(result.error || 'Failed to submit vote');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote';
      setSubmitError(errorMessage);
    }
  };

  const handleTryAgain = () => {
    setMemberVerification(null);
    setVerifyError('');
    setSubmitError('');
    setPageState('phone_entry');
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Loading vote...</p>
        </div>
      </div>
    );
  }

  // Status message (not found, ended, not started, etc.)
  if (pageState === 'status_message') {
    return (
      <div className="px-4">
        <div className="max-w-2xl mx-auto">
          {/* Main Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white">
              Voting Portal
            </h1>
          </div>
          <VoteStatusMessage
            status={voteInfo?.vote_status || 'not_found'}
            votingStartsAt={voteInfo?.voting_starts_at}
            votingEndsAt={voteInfo?.voting_ends_at}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header - only show for non-vote-form states */}
        {pageState !== 'vote_form' && (
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white">
              Voting Portal
            </h1>
          </div>
        )}

        {/* Phone Entry */}
        {pageState === 'phone_entry' && (
          <PhoneVerification
            onVerify={handleVerifyPhone}
            loading={verifying}
            error={verifyError}
            committeeRestricted={voteInfo?.committee_restricted}
          />
        )}

        {/* Not a Member */}
        {pageState === 'not_member' && (
          <VoteNotMember onTryAgain={handleTryAgain} />
        )}

        {/* Not Eligible */}
        {pageState === 'not_eligible' && memberVerification && (
          <VoteNotEligible
            voteTitle={memberVerification.vote_title || 'this vote'}
            voteSlug={slug}
            memberName={memberVerification.member_name || 'Member'}
            eligibilityReason={memberVerification.eligibility_reason || undefined}
            committeeRestricted={memberVerification.committee_restricted}
            onTryAgain={handleTryAgain}
          />
        )}

        {/* Already Voted */}
        {pageState === 'already_voted' && memberVerification && (
          <AlreadyVoted
            memberName={memberVerification.member_name || 'Member'}
            voteTitle={memberVerification.vote_title || 'this vote'}
          />
        )}

        {/* Vote Form */}
        {pageState === 'vote_form' && memberVerification?.vote_schema && (
          <>
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 max-w-sm mx-auto">
                <p className="text-red-700 text-sm text-center">{submitError}</p>
              </div>
            )}

            <PublicVoteForm
              schema={memberVerification.vote_schema}
              voteTitle={memberVerification.vote_title || 'Vote'}
              memberName={memberVerification.member_name || 'Member'}
              memberId={memberVerification.member_id || undefined}
              voteId={voteInfo?.vote_id || undefined}
              voteDescription={memberVerification.vote_description}
              supportingDocuments={memberVerification.supporting_documents}
              onSubmit={handleSubmitVote}
            />
          </>
        )}

        {/* Submitted */}
        {pageState === 'submitted' && memberVerification && (
          <VoteConfirmation
            voteTitle={memberVerification.vote_title || 'this vote'}
            memberName={memberVerification.member_name || 'Member'}
          />
        )}
      </div>
    </div>
  );
}
