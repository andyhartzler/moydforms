'use client';

import { useState } from 'react';
import { formatPhoneDisplay } from '@/lib/phone';
import { Check, CheckCircle, Loader2 } from 'lucide-react';

export interface IdentityConfig {
  phone_label?: string;
  name_label?: string;
  name_required?: boolean;
  email_label?: string;
  email_required?: boolean;
  zip_label?: string;
  zip_required?: boolean;
}

interface IdentityFieldsStageProps {
  config?: IdentityConfig;
  values: Record<string, unknown>;
  prefill: { name: string | null; email: string | null; zip_code: string | null };
  personFound: boolean;
  onFieldChange: (key: string, value: string) => void;
  onFieldBlur: (key: string, value: string, type?: string) => void;
  onComplete: () => void;
  isLoading: boolean;
}

const defaultConfig: IdentityConfig = {
  phone_label: 'Phone Number',
  name_label: 'Full Name',
  name_required: true,
  email_label: 'Email Address',
  email_required: true,
  zip_label: 'Zip Code',
  zip_required: true,
};

export function IdentityFieldsStage({
  config = defaultConfig,
  values,
  prefill,
  personFound,
  onFieldChange,
  onFieldBlur,
  onComplete,
  isLoading,
}: IdentityFieldsStageProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mergedConfig = { ...defaultConfig, ...config };

  // Check if all required fields are filled
  const isComplete =
    (!mergedConfig.name_required || values.name) &&
    (!mergedConfig.email_required || values.email) &&
    (!mergedConfig.zip_required || values.zip_code);

  // Validate email
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validate zip
  const validateZip = (zip: string): boolean => {
    return /^\d{5}(-\d{4})?$/.test(zip);
  };

  const handleBlur = (key: string, value: string, type?: string) => {
    // Validate
    if (key === 'email' && value && !validateEmail(value)) {
      setErrors((prev) => ({ ...prev, [key]: 'Please enter a valid email address' }));
      return;
    }

    if (key === 'zip_code' && value && !validateZip(value)) {
      setErrors((prev) => ({ ...prev, [key]: 'Please enter a valid 5-digit zip code' }));
      return;
    }

    // Clear error
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });

    // Save to server
    onFieldBlur(key, value, type);
  };

  const handleContinue = () => {
    // Final validation
    const newErrors: Record<string, string> = {};

    if (mergedConfig.name_required && !values.name) {
      newErrors.name = 'Name is required';
    }

    if (mergedConfig.email_required) {
      if (!values.email) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(values.email as string)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (mergedConfig.zip_required) {
      if (!values.zip_code) {
        newErrors.zip_code = 'Zip code is required';
      } else if (!validateZip(values.zip_code as string)) {
        newErrors.zip_code = 'Please enter a valid 5-digit zip code';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      {/* Welcome back message */}
      {personFound && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="ml-3">
              <p className="font-medium text-green-800">
                Welcome back{prefill.name ? `, ${prefill.name.split(' ')[0]}` : ''}!
              </p>
              <p className="text-sm text-green-700">
                We found your information. Please verify it&apos;s correct.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phone (read-only) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {mergedConfig.phone_label}
        </label>
        <div className="flex items-center px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
          <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
          <span className="text-gray-700">{formatPhoneDisplay((values.phone as string) || '')}</span>
        </div>
      </div>

      {/* Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {mergedConfig.name_label}
          {mergedConfig.name_required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="text"
          value={(values.name as string) || ''}
          onChange={(e) => {
            onFieldChange('name', e.target.value);
            if (errors.name) {
              setErrors((prev) => {
                const { name: _, ...rest } = prev;
                return rest;
              });
            }
          }}
          onBlur={(e) => handleBlur('name', e.target.value, 'text')}
          placeholder="John Doe"
          disabled={isLoading}
          className={`
            w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            ${errors.name ? 'border-red-300' : 'border-gray-200'}
            ${prefill.name ? 'bg-green-50 border-green-300' : 'bg-white'}
            transition-all duration-200
          `}
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Email */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {mergedConfig.email_label}
          {mergedConfig.email_required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="email"
          value={(values.email as string) || ''}
          onChange={(e) => {
            onFieldChange('email', e.target.value);
            if (errors.email) {
              setErrors((prev) => {
                const { email: _, ...rest } = prev;
                return rest;
              });
            }
          }}
          onBlur={(e) => handleBlur('email', e.target.value, 'email')}
          placeholder="john@example.com"
          disabled={isLoading}
          className={`
            w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            ${errors.email ? 'border-red-300' : 'border-gray-200'}
            ${prefill.email ? 'bg-green-50 border-green-300' : 'bg-white'}
            transition-all duration-200
          `}
        />
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
      </div>

      {/* Zip Code */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {mergedConfig.zip_label}
          {mergedConfig.zip_required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={(values.zip_code as string) || ''}
          onChange={(e) => {
            onFieldChange('zip_code', e.target.value);
            if (errors.zip_code) {
              setErrors((prev) => {
                const { zip_code: _, ...rest } = prev;
                return rest;
              });
            }
          }}
          onBlur={(e) => handleBlur('zip_code', e.target.value, 'text')}
          placeholder="64101"
          disabled={isLoading}
          className={`
            w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            ${errors.zip_code ? 'border-red-300' : 'border-gray-200'}
            ${prefill.zip_code ? 'bg-green-50 border-green-300' : 'bg-white'}
            transition-all duration-200
          `}
        />
        {errors.zip_code && <p className="mt-1 text-sm text-red-500">{errors.zip_code}</p>}
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!isComplete || isLoading || Object.keys(errors).length > 0}
        className={`
          w-full py-3 px-6 font-semibold rounded-xl transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          flex items-center justify-center gap-2
          ${
            isComplete && Object.keys(errors).length === 0
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Saving...
          </>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  );
}
