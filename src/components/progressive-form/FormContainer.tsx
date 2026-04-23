'use client';

import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormSession, SubmissionResult } from '@/hooks/useFormSession';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { PhoneEntryStage } from './PhoneEntryStage';
import { IdentityFieldsStage, IdentityConfig } from './IdentityFieldsStage';
import { CustomFieldsStage } from './CustomFieldsStage';
import { SuccessMessage } from './SuccessMessage';
import { FormRecord, FileUploadResult } from '@/types/forms';
import { toTitleCase } from '@/lib/utils';
import { FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { pageVariants, pageTransition, fadeInUp } from '@/lib/motion';

interface FormContainerProps {
  form: FormRecord;
  identityConfig?: IdentityConfig;
  onFileUpload?: (file: File, fieldId: string) => Promise<FileUploadResult>;
  /**
   * Extra key/value pairs merged into the submitted form data. Used by the
   * endorsement questionnaire to ship `candidate_id` from the URL into the
   * submission without exposing a visible field.
   */
  extraFormData?: Record<string, unknown>;
  /**
   * Opt-in visual: show the Young-Dem vs Partner Candidate track banner
   * once `date_of_birth` has been answered. Currently only used by the
   * endorsement questionnaire, but implemented generically in case other
   * age-gated forms want it later.
   */
  showTrackBanner?: boolean;
  /**
   * Opt-in localStorage autosave for the custom-fields stage. Set to a key
   * like `membership:<phone>` or `endorsement-questionnaire-2026:<candidate_id>`
   * and the user will be offered a "Pick up where you left off?" banner on
   * next load. Pass `null` to explicitly disable (default for short forms).
   */
  autosaveKey?: string | null;
  /**
   * Replace the default generic header (icon + title) with a custom hero
   * element. Used by the membership form to render a branded "Join the
   * movement" splash instead of the default FileText icon card.
   */
  heroOverride?: React.ReactNode;
}

// Stage order for direction calculation
const STAGE_ORDER = ['phone', 'identity', 'custom', 'submitted'];

export function FormContainer({
  form,
  identityConfig,
  onFileUpload,
  extraFormData,
  showTrackBanner,
  autosaveKey,
  heroOverride,
}: FormContainerProps) {
  const [direction, setDirection] = useState(1);
  const [prevStage, setPrevStage] = useState('phone');

  const {
    stage,
    session,
    values,
    isLoading,
    error,
    submissionResult,
    setStage,
    setValues,
    handlePhoneSubmit,
    handleFieldBlur,
    handleIdentityComplete,
    handleSubmit,
    handleAbandon,
  } = useFormSession({
    formId: form.id,
    formSlug: form.slug,
    formSettings: form.settings as Record<string, unknown> | undefined,
    onSubmitSuccess: (result?: SubmissionResult) => console.log('Form submitted successfully', result),
  });

  // Track direction for page transitions
  useEffect(() => {
    const prevIdx = STAGE_ORDER.indexOf(prevStage);
    const currIdx = STAGE_ORDER.indexOf(stage);
    setDirection(currIdx >= prevIdx ? 1 : -1);
    setPrevStage(stage);
  }, [stage]);

  useBeforeUnload({
    enabled: stage !== 'phone' && stage !== 'submitted',
    onUnload: handleAbandon,
    message: 'Your form progress will be saved. Are you sure you want to leave?',
  });

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [setValues]
  );

  const handleCustomFieldChange = useCallback(
    (key: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [setValues]
  );

  const handleGoBack = useCallback(() => {
    if (stage === 'identity') {
      setStage('phone');
    } else if (stage === 'custom') {
      setStage('identity');
    }
  }, [stage, setStage]);

  const formTitle = toTitleCase(form.title);
  const confirmation = form.schema?.confirmation;
  const showBackToFormsButton = form.show_back_button === true;

  return (
    <div className="min-h-screen py-8 md:py-12 relative z-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Back to Forms button */}
        {showBackToFormsButton && stage !== 'submitted' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <a
              href="/"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
              aria-label="Back to Forms"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
          </motion.div>
        )}

        {/* Form Header — either a caller-supplied hero (membership uses one)
            or the default editorial header. Both paths render form.description
            as sanitized HTML via the shared sanitizeHtml() helper. */}
        {heroOverride ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="mb-6"
          >
            {heroOverride}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6 relative overflow-hidden"
          >
            {/* Decorative accent — MOYD unity/sunrise gradient rule */}
            <div
              aria-hidden
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{
                background:
                  'linear-gradient(90deg, #273351 0%, #FDB813 50%, #273351 100%)',
              }}
            />

            {/* Form icon + title. Title uses Fraunces display face for an
                editorial first impression; icon tile gets an MOYD-unity
                background so the eye goes to the word, not the chrome. */}
            <div className="flex items-start gap-4 mb-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.15 }}
                className="w-12 h-12 rounded-xl bg-moyd-unity flex items-center justify-center shadow-[0_8px_20px_-10px_rgba(39,51,81,0.7)]"
              >
                <FileText className="w-6 h-6 text-moyd-sunrise" />
              </motion.div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-moyd-unity/70">
                  Missouri Young Democrats
                </div>
                <h1 className="mt-1 font-display text-[28px] sm:text-[36px] leading-[1.05] tracking-tight font-semibold text-moyd-unity">
                  {formTitle}
                </h1>
              </div>
            </div>

            {/* Description only on phone/identity intro stages. Sanitized
                via sanitizeHtml() before injection — same behavior as before. */}
            {form.description && (stage === 'phone' || stage === 'identity') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-gray-600 text-base leading-relaxed [&_a]:text-primary-600 [&_a]:underline [&_a:hover]:text-primary-700 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_b]:font-semibold"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.description) }}
              />
            )}
          </motion.div>
        )}

        {/* Error message with animation */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage transitions with AnimatePresence */}
        <AnimatePresence mode="wait" custom={direction}>
          {stage === 'phone' && (
            <motion.div
              key="phone"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
            >
              <PhoneEntryStage
                label="Phone Number"
                helpText="Enter your phone number to get started"
                onSubmit={handlePhoneSubmit}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {stage === 'identity' && session && (
            <motion.div
              key="identity"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
            >
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
            </motion.div>
          )}

          {stage === 'custom' && session && (
            <motion.div
              key="custom"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
            >
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
                extraFormData={extraFormData}
                showTrackBanner={showTrackBanner}
                autosaveKey={autosaveKey}
              />
            </motion.div>
          )}

          {stage === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <SuccessMessage
                formTitle={formTitle}
                message={confirmation?.message}
                redirectUrl={confirmation?.redirectUrl}
                submissionResult={submissionResult}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-blue-100 text-center"
        >
          Powered by <span className="font-semibold text-white">Missouri Young Democrats</span>
        </motion.p>
      </div>
    </div>
  );
}
