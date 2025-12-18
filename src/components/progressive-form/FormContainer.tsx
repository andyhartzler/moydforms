'use client';

import { useCallback } from 'react';
import { useFormSession } from '@/hooks/useFormSession';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { PhoneEntryStage } from './PhoneEntryStage';
import { IdentityFieldsStage, IdentityConfig } from './IdentityFieldsStage';
import { CustomFieldsStage } from './CustomFieldsStage';
import { SuccessMessage } from './SuccessMessage';
import { FormRecord } from '@/types/forms';
import { toTitleCase } from '@/lib/utils';
import { FileText, AlertCircle, ArrowLeft } from 'lucide-react';

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
    setStage,
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

  // Handle going back to previous stage
  const handleGoBack = useCallback(() => {
    if (stage === 'identity') {
      setStage('phone');
    } else if (stage === 'custom') {
      setStage('identity');
    }
  }, [stage, setStage]);

  // Properly capitalize the form title
  const formTitle = toTitleCase(form.title);

  // Get confirmation settings
  const confirmation = form.schema?.confirmation;

  // Check if back button should be shown (based on show_back_button field)
  const showBackToFormsButton = form.show_back_button === true;

  return (
    <div className="min-h-screen py-8 md:py-12 relative z-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Back to Forms button - circular style like moyd-events */}
        {showBackToFormsButton && stage !== 'submitted' && (
          <div className="mb-6">
            <a
              href="/"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
              aria-label="Back to Forms"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
          </div>
        )}

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
            <div
              className="text-gray-600 text-base leading-relaxed [&_a]:text-primary-600 [&_a]:underline [&_a:hover]:text-primary-700 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_b]:font-semibold"
              dangerouslySetInnerHTML={{ __html: form.description }}
            />
          )}

          {/* Progress bar only (no text) */}
          {stage !== 'submitted' && (
            <div className="mt-6">
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
            onBack={handleGoBack}
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
            onBack={handleGoBack}
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
