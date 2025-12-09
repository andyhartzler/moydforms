'use client';

import { CheckCircle } from 'lucide-react';

interface SuccessMessageProps {
  formTitle: string;
  message?: string;
  redirectUrl?: string;
}

export function SuccessMessage({
  formTitle,
  message = 'Your submission has been received. Thank you for your response!',
  redirectUrl,
}: SuccessMessageProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>

      <p className="text-gray-600 mb-6">{message}</p>

      <p className="text-sm text-gray-500 mb-6">
        Your response to <span className="font-medium">{formTitle}</span> has been recorded.
      </p>

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
