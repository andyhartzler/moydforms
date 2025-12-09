'use client';

import { CheckCircle } from 'lucide-react';

interface VoteWelcomeProps {
  memberName: string;
}

export function VoteWelcome({ memberName }: VoteWelcomeProps) {
  // Extract first name
  const firstName = memberName.split(' ')[0];

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
      <div>
        <p className="font-semibold text-green-800">Welcome, {firstName}!</p>
        <p className="text-sm text-green-700">Your membership has been verified.</p>
      </div>
    </div>
  );
}
