// Gerenciador de cache para prevenir acúmulo excessivo de dados no localStorage

const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB máximo
const CLEANUP_INTERVAL = 30 * 60 * 1000; // Limpar a cada 30 minutos

const isQuotaExceeded = (error: unknown) => {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
};

/**
 * Calcula o tamanho aproximado de um objeto em bytes
 */
const getSize = (obj: any): number => {
  const str = JSON.stringify(obj);
  return new Blob([str]).size;
};

/**
 * Limpa dados antigos do localStorage para manter dentro do limite
 */
export const cleanupLocalStorage = (): void => {
  try {
    let totalSize = 0;
    const items: Array<{ key: string; size: number; timestamp: number }> = [];

    // Calcular tamanho de todos os itens
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      if (!value) continue;

      const size = getSize(value);
      totalSize += size;

      // Tentar extrair timestamp se existir
      let timestamp = Date.now();
      try {
        const parsed = JSON.parse(value);
        if (parsed.timestamp) {
          timestamp = parsed.timestamp;
        } else if (parsed.state?.timestamp) {
          timestamp = parsed.state.timestamp;
        }
      } catch {
        // Se não conseguir parsear, usar timestamp atual
      }

      items.push({ key, size, timestamp });
    }

    // Se exceder o limite, remover itens mais antigos
    if (totalSize > MAX_CACHE_SIZE) {
      console.log('🧹 Cache excedeu limite, limpando itens antigos...');
      
      // Ordenar por timestamp (mais antigos primeiro)
      items.sort((a, b) => a.timestamp - b.timestamp);

      // Remover itens até ficar abaixo do limite (manter pelo menos 3MB)
      const targetSize = MAX_CACHE_SIZE * 0.6; // 60% do limite
      let currentSize = totalSize;

      for (const item of items) {
        if (currentSize <= targetSize) break;
        
        // Não remover chaves críticas
        if (
          item.key.startsWith('sb-') || 
          item.key === 'pulacatraca-auth' ||
          item.key === 'checkout_data' ||
          item.key === 'checkout_restore_data'
        ) {
          continue;
        }

        localStorage.removeItem(item.key);
        currentSize -= item.size;
        console.log(`🗑️ Removido: ${item.key} (${(item.size / 1024).toFixed(2)}KB)`);
      }

      console.log(`✅ Cache limpo: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
  }
};

/**
 * Inicializa limpeza periódica de cache
 */
export const initCacheCleanup = (): (() => void) => {
  // Limpar imediatamente
  cleanupLocalStorage();

  // Configurar limpeza periódica
  const intervalId = setInterval(cleanupLocalStorage, CLEANUP_INTERVAL);

  // Retornar função de cleanup
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Limpa cache específico de autenticação (chamado no logout)
 */
export const clearAuthCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key === 'pulacatraca-auth')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Cache de autenticação limpo');
  } catch (error) {
    console.error('❌ Erro ao limpar cache de auth:', error);
  }
};

interface SafeSetOptions {
  fallbackToSessionStorage?: boolean;
  keyDescription?: string;
}

/**
 * Salva dados no localStorage tratando QuotaExceededError e acionando limpeza automática.
 */
export const safeSetItem = (
  key: string,
  value: string,
  options: SafeSetOptions = {}
): boolean => {
  const description = options.keyDescription ?? key;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceeded(error)) {
      console.warn(`⚠️ Espaço insuficiente ao salvar "${description}". Executando cleanup...`);
      cleanupLocalStorage();

      try {
        localStorage.setItem(key, value);
        console.info(`✅ "${description}" salvo após cleanup.`);
        return true;
      } catch (retryError) {
        if (isQuotaExceeded(retryError)) {
          console.warn(`⚠️ Ainda sem espaço após cleanup ao salvar "${description}".`);
          try {
            localStorage.removeItem(key);
          } catch {
            // ignorar
          }

          if (options.fallbackToSessionStorage) {
            try {
              sessionStorage.setItem(key, value);
              console.warn(`💾 "${description}" salvo no sessionStorage como fallback temporário.`);
            } catch (sessionError) {
              console.error('❌ Falha ao salvar no sessionStorage:', sessionError);
            }
          }

          return false;
        }

        console.error('❌ Erro inesperado ao salvar item após cleanup:', retryError);
        return false;
      }
    }

    console.error('❌ Erro ao salvar item no localStorage:', error);
    return false;
  }
};
