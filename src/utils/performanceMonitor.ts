// Monitor de performance para detectar problemas de memory leaks e performance

interface PerformanceMetrics {
  memoryUsage?: number;
  renderTime: number;
  componentCount: number;
  eventListeners: number;
  localStorageSize: number;
}

/**
 * Monitora o uso de memória e performance
 */
export const monitorPerformance = (): PerformanceMetrics => {
  const metrics: PerformanceMetrics = {
    renderTime: 0,
    componentCount: 0,
    eventListeners: 0,
    localStorageSize: 0
  };

  try {
    // Verificar uso de memória (se disponível)
    if ((performance as any).memory) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    // Calcular tamanho do localStorage
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
    }
    metrics.localStorageSize = totalSize;

    // Log apenas se houver problemas
    if (metrics.localStorageSize > 3 * 1024 * 1024) { // 3MB
      console.warn('⚠️ localStorage muito grande:', (metrics.localStorageSize / 1024 / 1024).toFixed(2), 'MB');
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      console.warn('⚠️ Uso de memória alto:', (metrics.memoryUsage / 1024 / 1024).toFixed(2), 'MB');
    }
  } catch (error) {
    // Ignorar erros de monitoramento
  }

  return metrics;
};

/**
 * Inicializa monitoramento periódico de performance
 */
export const initPerformanceMonitoring = (): (() => void) => {
  // Monitorar a cada 5 minutos
  const intervalId = setInterval(() => {
    const metrics = monitorPerformance();
    
    // Se houver problemas, tentar limpar cache
    if (metrics.localStorageSize > 4 * 1024 * 1024) { // 4MB
      console.log('🧹 Performance: localStorage muito grande, iniciando limpeza...');
      try {
        const { cleanupLocalStorage } = require('./cacheManager');
        cleanupLocalStorage();
      } catch (error) {
        console.error('Erro ao limpar cache:', error);
      }
    }
  }, 5 * 60 * 1000); // 5 minutos

  // Retornar função de cleanup
  return () => {
    clearInterval(intervalId);
  };
};
