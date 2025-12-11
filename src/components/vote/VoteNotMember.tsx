'use client';

import { UserX, ExternalLink } from 'lucide-react';

interface VoteNotMemberProps {
  voteTitle: string;
  voteSlug: string;
  enteredPhone: string;
  onTryAgain: () => void;
}

const MEMBERSHIP_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd5Hd_cgdFmgE7f9gdIxmwXSAdxkuFuITENO_x5VkhDrtR8Ag/viewform';

export function VoteNotMember({ voteTitle, voteSlug, enteredPhone, onTryAgain }: VoteNotMemberProps) {
  const voteUrl = `https://forms.moyoungdemocrats.org/vote/${voteSlug}`;

  // Build mailto link with pre-populated email
  const emailSubject = encodeURIComponent(`Help Finding My Membership: ${voteTitle}`);
  const emailBody = encodeURIComponent(
    `Hello,\n\n` +
    `I tried to vote on "${voteTitle}" (${voteUrl}) but my phone number was not found in the member database.\n\n` +
    `Phone number entered: ${enteredPhone}\n\n` +
    `I believe I am a member. Could you please help me verify my membership?\n\n` +
    `Thank you`
  );
  const mailtoLink = `mailto:info@moyoungdemocrats.org?subject=${emailSubject}&body=${emailBody}`;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <UserX className="w-8 h-8 text-red-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Only Members Can Vote
      </h2>

      <p className="text-gray-600 mb-6">
        We couldn&apos;t find your phone number in our member database.
        Only Missouri Young Democrats members can participate in this vote.
      </p>

      <div className="space-y-3">
        <a
          href={MEMBERSHIP_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
        >
          Join Missouri Young Democrats
          <ExternalLink className="w-5 h-5" />
        </a>

        <button
          onClick={onTryAgain}
          className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
        >
          Try a different phone number
        </button>
      </div>

      <p className="text-sm text-gray-500 mt-6">
        Already a member? Make sure you&apos;re using the phone number
        you registered with, or{' '}
        <a
          href={mailtoLink}
          className="text-primary hover:underline underline font-medium"
        >
          contact us
        </a>
        {' '}for help.
      </p>
    </div>
  );
}
