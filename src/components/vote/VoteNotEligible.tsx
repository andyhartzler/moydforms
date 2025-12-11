'use client';

import { ShieldX, Mail, UserPlus } from 'lucide-react';

interface VoteNotEligibleProps {
  voteTitle: string;
  voteSlug: string;
  memberName: string;
  eligibilityReason?: string;
  committeeRestricted?: string | null;
  onTryAgain: () => void;
}

export function VoteNotEligible({
  voteTitle,
  voteSlug,
  memberName,
  eligibilityReason,
  committeeRestricted,
  onTryAgain
}: VoteNotEligibleProps) {
  const firstName = memberName.split(' ')[0];
  const voteUrl = `https://forms.moyoungdemocrats.org/vote/${voteSlug}`;

  // Special handling for College Democrats and High School Democrats
  const isCollegeDems = committeeRestricted === 'College Democrats';
  const isHighSchoolDems = committeeRestricted === 'High School Democrats';
  const isAffiliateOrg = isCollegeDems || isHighSchoolDems;

  const getEligibilityMessage = () => {
    if (isCollegeDems) {
      return 'this ballot can only be accessed by members of the Missouri College Democrats.';
    }
    if (isHighSchoolDems) {
      return 'this ballot can only be accessed by members of the Missouri High School Democrats.';
    }
    if (committeeRestricted) {
      return `this ballot can only be accessed by members of the ${committeeRestricted}.`;
    }
    return eligibilityReason || 'you are not eligible for this vote.';
  };

  // Build mailto link with pre-populated email
  const emailSubject = encodeURIComponent(`Question About Vote Eligibility: ${voteTitle}`);
  const emailBody = encodeURIComponent(
    `Hello,\n\n` +
    `I received a message that I am not eligible to vote on "${voteTitle}" (${voteUrl}).\n\n` +
    `I believe this may be an error. Could you please help me verify my eligibility?\n\n` +
    `Thank you,\n` +
    `${memberName}`
  );
  const mailtoLink = `mailto:eboard@moyoungdemocrats.org?subject=${emailSubject}&body=${emailBody}`;

  const membershipFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSd5Hd_cgdFmgE7f9gdIxmwXSAdxkuFuITENO_x5VkhDrtR8Ag/viewform';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-auto text-center">
      <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldX className="w-7 h-7 text-orange-600" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Not Eligible to Vote
      </h2>

      <p className="text-gray-600 mb-2">
        Hi {firstName}, {getEligibilityMessage()}
      </p>

      {isAffiliateOrg && (
        <a
          href={membershipFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 font-medium transition-colors mb-4"
        >
          <UserPlus className="w-5 h-5" />
          Become a Member
        </a>
      )}

      <p className="text-sm text-gray-500 mb-5">
        If you believe this message is shown in error, please reach out to{' '}
        <a
          href={mailtoLink}
          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <Mail className="w-3.5 h-3.5" />
          eboard@moyoungdemocrats.org
        </a>
      </p>

      <button
        onClick={onTryAgain}
        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
      >
        Try a different phone number
      </button>
    </div>
  );
}
