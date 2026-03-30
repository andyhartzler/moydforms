'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Link2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { SubmissionResult } from '@/hooks/useFormSession';
import { AutoConfetti } from '../motion/Confetti';
import { successVariants, fadeInUp } from '@/lib/motion';

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
    <>
      <AutoConfetti />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center overflow-hidden relative"
      >
        {/* Decorative gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-400 via-gold-400 to-green-400" />

        {/* Animated checkmark */}
        <motion.div
          variants={successVariants}
          initial="hidden"
          animate="visible"
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-green-600" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 mb-3"
        >
          Thank You! 🎉
        </motion.h2>

        {/* Display the message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6 whitespace-pre-line text-left bg-gray-50 rounded-xl p-4"
        >
          {displayMessage}
        </motion.div>

        {/* Membership Form URL */}
        {membershipFormUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6 p-4 bg-primary-50 border-2 border-primary-200 rounded-xl"
          >
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
              <motion.button
                onClick={copyToClipboard}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors min-h-[36px]"
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
              </motion.button>
            </div>
            <a
              href={membershipFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-700 underline"
            >
              Open signup form in new tab →
            </a>
          </motion.div>
        )}

        {!submissionResult && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-500 mb-6"
          >
            Your response to <span className="font-medium">{formTitle}</span> has been recorded.
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {redirectUrl ? (
            <motion.a
              href={redirectUrl}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[48px]"
            >
              Continue
            </motion.a>
          ) : (
            <motion.a
              href="/"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[48px]"
            >
              Back to Home
            </motion.a>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
