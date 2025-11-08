import { useEffect } from 'react';
import { abort, signal } from '@/lib/supabase';

export const useAbortController = (key = "global") => {
  useEffect(() => () => abort(key), [key]);

  const createNewController = () => {
    abort(key);
    return { signal: signal(key) };
  };

  return {
    abortController: { signal: signal(key) },
    createNewController
  };
};

