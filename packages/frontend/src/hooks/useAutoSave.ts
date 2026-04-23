import { useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  delay?: number;
  onSave: (data: T, version: number) => Promise<void>;
}

export function useAutoSave<T>({ delay = 30_000, onSave }: UseAutoSaveOptions<T>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef(0);
  const maxRetries = 3;

  const mutate = useCallback(async (data: T) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          await onSave(data, 0); // version managed by caller
          retryRef.current = 0;
          return;
        } catch {
          attempt++;
          retryRef.current = attempt;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
      throw new Error('Auto-save failed after 3 retries');
    }, delay);
  }, [delay, onSave]);

  return { mutate };
}
