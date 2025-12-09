'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  initSession,
  updateField,
  submitForm,
  abandonForm,
  recordFormView,
  getEdgeFunctionUrl,
  InitSessionResponse,
} from '@/lib/edgeFunction';
import { isValidPhone, formatPhoneE164 } from '@/lib/phone';

export type FormStage = 'phone' | 'identity' | 'custom' | 'submitted';

export interface FormSession {
  submissionId: string;
  subscriberId: string;
  memberId: string | null;
  donorId: string | null;
  sessionToken: string;
  personFound: boolean;
  prefill: {
    name: string | null;
    email: string | null;
    zip_code: string | null;
  };
}

interface UseFormSessionOptions {
  formId: string;
  onSessionStart?: (session: FormSession) => void;
  onSubmitSuccess?: () => void;
}

export function useFormSession({ formId, onSessionStart, onSubmitSuccess }: UseFormSessionOptions) {
  const [stage, setStage] = useState<FormStage>('phone');
  const [session, setSession] = useState<FormSession | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // Record view on mount
  useEffect(() => {
    recordFormView(formId, sessionTokenRef.current || undefined)
      .then((result) => {
        sessionTokenRef.current = result.session_token;
      })
      .catch(console.error);
  }, [formId]);

  // Handle phone submission
  const handlePhoneSubmit = useCallback(
    async (phone: string) => {
      if (!isValidPhone(phone)) {
        setError('Please enter a valid 10-digit phone number');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await initSession(formId, phone, sessionTokenRef.current || undefined);

        if (!result.success) {
          throw new Error('Failed to initialize session');
        }

        const newSession: FormSession = {
          submissionId: result.submission_id,
          subscriberId: result.subscriber_id,
          memberId: result.member_id,
          donorId: result.donor_id,
          sessionToken: result.session_token,
          personFound: result.person_found,
          prefill: result.prefill,
        };

        setSession(newSession);
        sessionTokenRef.current = result.session_token;

        // Pre-fill values
        setValues((prev) => ({
          ...prev,
          phone: formatPhoneE164(phone),
          name: result.prefill.name || prev.name || '',
          email: result.prefill.email || prev.email || '',
          zip_code: result.prefill.zip_code || prev.zip_code || '',
        }));

        // Move to identity stage
        setStage('identity');

        onSessionStart?.(newSession);

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start form');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [formId, onSessionStart]
  );

  // Handle field blur (auto-save)
  const handleFieldBlur = useCallback(
    async (fieldKey: string, fieldValue: unknown, fieldType?: string) => {
      if (!session) return;

      // Update local state
      setValues((prev) => ({ ...prev, [fieldKey]: fieldValue }));

      // Auto-save to server (don't await, fire and forget)
      updateField(session.submissionId, session.sessionToken, fieldKey, fieldValue, fieldType).catch(
        (err) => console.error('Auto-save failed:', err)
      );
    },
    [session]
  );

  // Handle identity fields completion
  const handleIdentityComplete = useCallback(() => {
    // Check all required identity fields are filled
    if (values.name && values.email && values.zip_code) {
      setStage('custom');
    }
  }, [values]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (finalData?: Record<string, unknown>) => {
      if (!session) return false;

      setIsLoading(true);
      setError(null);

      try {
        const result = await submitForm(
          session.submissionId,
          session.sessionToken,
          finalData || (values as Record<string, unknown>)
        );

        if (result.success) {
          setStage('submitted');
          onSubmitSuccess?.();
          return true;
        }

        throw new Error('Submission failed');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit form');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [session, values, onSubmitSuccess]
  );

  // Handle abandon
  const handleAbandon = useCallback(() => {
    if (!session) return;

    // Use sendBeacon for reliability on page unload
    const data = JSON.stringify({
      action: 'abandon',
      submission_id: session.submissionId,
      session_token: session.sessionToken,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(getEdgeFunctionUrl(), new Blob([data], { type: 'application/json' }));
    } else {
      abandonForm(session.submissionId, session.sessionToken).catch(console.error);
    }
  }, [session]);

  return {
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
  };
}
