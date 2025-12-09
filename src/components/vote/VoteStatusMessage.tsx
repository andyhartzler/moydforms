'use client';

import { Clock, AlertCircle, Calendar, XCircle } from 'lucide-react';

interface VoteStatusMessageProps {
  status: 'not_found' | 'not_active' | 'not_started' | 'ended' | 'open';
  votingStartsAt?: string | null;
  votingEndsAt?: string | null;
}

export function VoteStatusMessage({ status, votingStartsAt, votingEndsAt }: VoteStatusMessageProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (status === 'not_found') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Not Found</h2>
        <p className="text-gray-600">
          The vote you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  if (status === 'not_active') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Not Active</h2>
        <p className="text-gray-600">
          This vote is not currently active. Please check back later.
        </p>
      </div>
    );
  }

  if (status === 'not_started') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Voting Opens Soon</h2>
        <p className="text-gray-600 mb-4">
          This vote hasn&apos;t started yet.
        </p>
        {votingStartsAt && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Opens:</strong> {formatDate(votingStartsAt)}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Voting Has Ended</h2>
        <p className="text-gray-600 mb-4">
          This vote has closed and is no longer accepting responses.
        </p>
        {votingEndsAt && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Closed:</strong> {formatDate(votingEndsAt)}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Open status - return null, let parent render the form
  return null;
}
