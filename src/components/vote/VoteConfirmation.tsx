'use client';

import { CheckCircle } from 'lucide-react';

interface VoteConfirmationProps {
  voteTitle: string;
  memberName: string;
}

export function VoteConfirmation({ voteTitle, memberName }: VoteConfirmationProps) {
  const firstName = memberName.split(' ')[0];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Thank You, {firstName}!
      </h2>

      <p className="text-gray-600 mb-6">
        Your vote has been recorded successfully for:
      </p>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="font-semibold text-gray-900">{voteTitle}</p>
      </div>

      <p className="text-sm text-gray-500">
        You can close this page now.
      </p>
    </div>
  );
}
