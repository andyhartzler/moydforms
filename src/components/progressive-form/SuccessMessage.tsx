'use client';

import { CheckCircle, Link2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { SubmissionResult } from '@/hooks/useFormSession';

interface SuccessMessageProps {
  formTitle: string;
  message?: string;
  redirectUrl?: string;
  submissionResult?: SubmissionResult | null;
}

export function SuccessMessage({
  formTitle,
  message = 'Your submission has been received. Thank you for your response!',
  redirectUrl,
  submissionResult,
}: SuccessMessageProps) {
  const [copied, setCopied] = useState(false);

  // Use dynamic message from submission result if available
  const displayMessage = submissionResult?.message || message;
  const membershipFormUrl = submissionResult?.membershipFormUrl;

  const copyToClipboard = async () => {
    if (membershipFormUrl) {
      try {
        await navigator.clipboard.writeText(membershipFormUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>

      {/* Display the message with line breaks preserved */}
      <div className="text-gray-600 mb-6 whitespace-pre-line text-left bg-gray-50 rounded-xl p-4">
        {displayMessage}
      </div>

      {/* Membership Form URL - Prominent display for chartering submissions */}
      {membershipFormUrl && (
        <div className="mb-6 p-4 bg-primary-50 border-2 border-primary-200 rounded-xl">
          <div className="flex items-center justify-center gap-2 text-primary-700 font-semibold mb-2">
            <Link2 className="w-5 h-5" />
            <span>Member Signup Link</span>
          </div>
          <p className="text-sm text-primary-600 mb-3">
            Share this link with your members to have them sign up:
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-primary-200">
            <input
              type="text"
              readOnly
              value={membershipFormUrl}
              className="flex-1 text-sm text-gray-700 bg-transparent outline-none truncate"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <a
            href={membershipFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Open signup form in new tab →
          </a>
        </div>
      )}

      {!submissionResult && (
        <p className="text-sm text-gray-500 mb-6">
          Your response to <span className="font-medium">{formTitle}</span> has been recorded.
        </p>
      )}

      {redirectUrl ? (
        <a
          href={redirectUrl}
          className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Continue
        </a>
      ) : (
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to Home
        </a>
      )}
    </div>
  );
}
