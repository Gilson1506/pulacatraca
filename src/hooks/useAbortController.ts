import { useEffect, useRef } from 'react';

/**
 * Hook para gerenciar AbortController com cleanup automático
 * @deprecated Use useAbortOnUnmount from @/lib/supabase instead
 */
export const useAbortController = () => {
  const controllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    controllerRef.current = new AbortController();
    
    return () => {
      // Cancela requisições pendentes quando componente desmonta
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const createNewController = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    return { signal: controllerRef.current.signal };
  };

  return {
    abortController: { signal: controllerRef.current?.signal },
    createNewController
  };
};

