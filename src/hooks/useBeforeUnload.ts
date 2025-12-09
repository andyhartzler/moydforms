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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        onUnloadRef.current();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, message]);
}
