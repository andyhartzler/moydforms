'use client';

import { useCallback } from 'react';
import { useFormSession, FormSession } from '@/hooks/useFormSession';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { PhoneEntryStage } from './PhoneEntryStage';
import { IdentityFieldsStage, IdentityConfig } from './IdentityFieldsStage';
import { CustomFieldsStage } from './CustomFieldsStage';
import { SuccessMessage } from './SuccessMessage';
import { FormRecord } from '@/types/forms';
import { toTitleCase } from '@/lib/utils';
import { FileText, AlertCircle } from 'lucide-react';

interface FormContainerProps {
  form: FormRecord;
  identityConfig?: IdentityConfig;
  onFileUpload?: (file: File, fieldId: string) => Promise<string>;
}

export function FormContainer({ form, identityConfig, onFileUpload }: FormContainerProps) {
  const {
    stage,
    session,
    values,
    isLoading,
    error,
    setValues,
    handlePhoneSubmit,
    handleFieldBlur,
    handleIdentityComplete,
    handleSubmit,
    handleAbandon,
  } = useFormSession({
    formId: form.id,
    onSubmitSuccess: () => console.log('Form submitted successfully'),
  });

  // Track abandon on page leave
  useBeforeUnload({
    enabled: stage !== 'phone' && stage !== 'submitted',
    onUnload: handleAbandon,
    message: 'Your form progress will be saved. Are you sure you want to leave?',
  });

  // Handle field change for identity fields
  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [setValues]
  );

  // Handle field change for custom fields
  const handleCustomFieldChange = useCallback(
    (key: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [setValues]
  );

  // Apply custom styling from form schema
  const styling = form.schema?.styling || {};
  const primaryColor = styling.primaryColor || '#273351';

  // Properly capitalize the form title
  const formTitle = toTitleCase(form.title);

  // Get confirmation settings
  const confirmation = form.schema?.confirmation;

  return (
    <div className="min-h-screen py-8 md:py-12 relative z-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Form Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6 relative overflow-hidden">
          {/* Decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700" />

          {/* Form icon */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h1
                className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {formTitle}
              </h1>
            </div>
          </div>

          {form.description && (
            <p className="text-gray-600 text-base leading-relaxed">{form.description}</p>
          )}

          {/* Progress indicator */}
          {stage !== 'submitted' && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">
                  Step {stage === 'phone' ? 1 : stage === 'identity' ? 2 : 3} of 3
                </span>
                <span className="text-gray-500">
                  {stage === 'phone' ? 'Phone' : stage === 'identity' ? 'Your Info' : 'Details'}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: stage === 'phone' ? '33%' : stage === 'identity' ? '66%' : '100%',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stage: Phone Entry */}
        {stage === 'phone' && (
          <PhoneEntryStage
            label="Phone Number"
            helpText="Enter your phone number to get started"
            onSubmit={handlePhoneSubmit}
            isLoading={isLoading}
          />
        )}

        {/* Stage: Identity Fields */}
        {stage === 'identity' && session && (
          <IdentityFieldsStage
            config={identityConfig}
            values={values as Record<string, unknown>}
            prefill={session.prefill}
            personFound={session.personFound}
            onFieldChange={handleFieldChange}
            onFieldBlur={handleFieldBlur}
            onComplete={handleIdentityComplete}
            isLoading={isLoading}
          />
        )}

        {/* Stage: Custom Fields */}
        {stage === 'custom' && session && (
          <CustomFieldsStage
            schema={form.schema}
            identityValues={values as Record<string, unknown>}
            onFieldChange={handleCustomFieldChange}
            onFieldBlur={handleFieldBlur}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel={form.settings?.submitButtonText || 'Submit'}
            onFileUpload={onFileUpload}
          />
        )}

        {/* Stage: Success */}
        {stage === 'submitted' && (
          <SuccessMessage
            formTitle={formTitle}
            message={confirmation?.message}
            redirectUrl={confirmation?.redirectUrl}
          />
        )}

        {/* Footer Note */}
        <p className="mt-8 text-sm text-blue-100 text-center">
          Powered by <span className="font-semibold text-white">Missouri Young Democrats</span>
        </p>
      </div>
    </div>
  );
}
