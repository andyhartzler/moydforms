'use client';

import { CheckCircle } from 'lucide-react';

interface AlreadyVotedProps {
  memberName: string;
  voteTitle: string;
}

export function AlreadyVoted({ memberName, voteTitle }: AlreadyVotedProps) {
  const firstName = memberName.split(' ')[0];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-blue-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        You&apos;ve Already Voted
      </h2>

      <p className="text-gray-600 mb-4">
        Hi {firstName}! You have already cast your vote for:
      </p>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="font-semibold text-gray-900">{voteTitle}</p>
      </div>

      <p className="text-sm text-gray-500">
        Each member can only vote once. Your vote has been recorded.
      </p>
    </div>
  );
}
