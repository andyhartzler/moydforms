'use client';

import { useState, useEffect, useRef } from 'react';
import { formatPhoneDisplay, isPhoneComplete, isValidPhone } from '@/lib/phone';
import { Phone, Loader2 } from 'lucide-react';

interface PhoneEntryStageProps {
  label?: string;
  helpText?: string;
  onSubmit: (phone: string) => Promise<boolean>;
  isLoading: boolean;
}

export function PhoneEntryStage({
  label = 'Phone Number',
  helpText = 'Enter your phone number to get started',
  onSubmit,
  isLoading,
}: PhoneEntryStageProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitAttempted = useRef(false);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-submit when phone is complete
  useEffect(() => {
    if (isPhoneComplete(phone) && isValidPhone(phone) && !submitAttempted.current) {
      // Small delay to show the completed number
      const timer = setTimeout(() => {
        handleSubmit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phone]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value);
    setPhone(formatted);
    setError(null);
    submitAttempted.current = false;
  };

  const handleSubmit = async () => {
    if (!isValidPhone(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    submitAttempted.current = true;
    const success = await onSubmit(phone);
    if (!success) {
      setError('Failed to verify phone number. Please try again.');
      submitAttempted.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isPhoneComplete(phone)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{label}</h2>
        {helpText && <p className="mt-2 text-gray-500">{helpText}</p>}
      </div>

      <div className="space-y-4">
        <input
          ref={inputRef}
          type="tel"
          value={phone}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="(555) 555-5555"
          disabled={isLoading}
          className={`
            w-full text-center text-2xl font-medium py-4 px-6
            border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200'}
            ${isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            transition-all duration-200
          `}
          autoComplete="tel"
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {isLoading && (
          <div className="flex items-center justify-center text-gray-500">
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
            Looking you up...
          </div>
        )}

        {!isLoading && isPhoneComplete(phone) && (
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 px-6 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
