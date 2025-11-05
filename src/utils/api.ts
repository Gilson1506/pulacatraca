/**
 * Wrapper para requisições com timeout
 * Previne travamento de formulários quando requisições demoram muito
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = 'Operação excedeu o tempo limite. Por favor, tente novamente.'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

/**
 * Wrapper para requisições do Supabase com timeout e retry
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  
  throw lastError!;
};

/**
 * Combina timeout e retry
 */
export const withTimeoutAndRetry = async <T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  maxRetries: number = 1
): Promise<T> => {
  return withTimeout(
    withRetry(fn, maxRetries),
    timeoutMs
  );
};

