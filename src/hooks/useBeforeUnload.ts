'use client';

import { useEffect, useRef } from 'react';

interface UseBeforeUnloadOptions {
  enabled: boolean;
  onUnload: () => void;
  message?: string;
}

export function useBeforeUnload({ enabled, onUnload, message }: UseBeforeUnloadOptions) {
  const onUnloadRef = useRef(onUnload);

  useEffect(() => {
    onUnloadRef.current = onUnload;
  }, [onUnload]);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      onUnloadRef.current();

      if (message) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    // NOTE: we deliberately do NOT listen for `visibilitychange`/`hidden`.
    // On mobile that event fires on every app-switch, lock, notification,
    // and keyboard/contact-picker popup, so treating it as abandonment marks
    // actively-filling sessions abandoned mid-form (the 2026-07 premature-
    // submit incident). Abandonment is only inferred from a true page unload
    // (below); durability of in-progress answers is handled by the
    // form_drafts autosave, not by an abandon beacon.
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, message]);
}
