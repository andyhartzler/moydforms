'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getVoteInfo, verifyMember, submitVote } from '@/lib/vote-api';
import { PhoneVerification } from '@/components/vote/PhoneVerification';
import { VoteNotMember } from '@/components/vote/VoteNotMember';
import { VoteWelcome } from '@/components/vote/VoteWelcome';
import { VoteStatusMessage } from '@/components/vote/VoteStatusMessage';
import { PublicVoteForm } from '@/components/vote/PublicVoteForm';
import { VoteConfirmation } from '@/components/vote/VoteConfirmation';
import { AlreadyVoted } from '@/components/vote/AlreadyVoted';
import type { VoteInfo, MemberVerification } from '@/lib/vote-types';

type PageState =
  | 'loading'
  | 'phone_entry'
  | 'not_member'
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

  const loadVoteInfo = useCallback(async () => {
    try {
      const info = await getVoteInfo(slug);
      setVoteInfo(info);
      setSessionToken(info.session_token);

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
        session_token: '',
      });
      setPageState('status_message');
    }
  }, [slug]);

  // Initial load - get vote info
  useEffect(() => {
    loadVoteInfo();
  }, [loadVoteInfo]);

  const handleVerifyPhone = async (phone: string) => {
    setVerifying(true);
    setVerifyError('');

    try {
      const result = await verifyMember(phone, slug, sessionToken || undefined);
      setMemberVerification(result);
      setSessionToken(result.session_token);

      if (!result.is_member) {
        setPageState('not_member');
      } else if (result.already_voted) {
        setPageState('already_voted');
      } else if (!result.is_eligible) {
        setVerifyError(result.eligibility_reason || 'You are not eligible for this vote');
      } else if (result.vote_status !== 'open') {
        setVoteInfo({
          ...voteInfo!,
          vote_status: result.vote_status,
        });
        setPageState('status_message');
      } else {
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
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
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

  // Check if we're signed in (have member verification)
  const isSignedIn = pageState === 'vote_form' || pageState === 'already_voted' || pageState === 'submitted';

  return (
    <div className="px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Main title - always "Voting Portal" */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Voting Portal
          </h1>

          {/* Show vote title as smaller header when signed in */}
          {isSignedIn && (memberVerification?.vote_title || voteInfo?.vote_title) && (
            <h2 className="text-xl md:text-2xl font-semibold text-white/90 mt-4">
              {memberVerification?.vote_title || voteInfo?.vote_title}
            </h2>
          )}

          {/* Description only shows during phone entry */}
          {pageState === 'phone_entry' && voteInfo?.vote_description && (
            <p className="text-white/80 text-lg mt-2">
              {voteInfo.vote_description}
            </p>
          )}
        </div>

        {/* Phone Entry */}
        {pageState === 'phone_entry' && (
          <PhoneVerification
            onVerify={handleVerifyPhone}
            loading={verifying}
            error={verifyError}
          />
        )}

        {/* Not a Member */}
        {pageState === 'not_member' && (
          <VoteNotMember onTryAgain={handleTryAgain} />
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
          <div className="space-y-6">
            <VoteWelcome memberName={memberVerification.member_name || 'Member'} />

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700">{submitError}</p>
              </div>
            )}

            <PublicVoteForm
              schema={memberVerification.vote_schema}
              onSubmit={handleSubmitVote}
            />
          </div>
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
