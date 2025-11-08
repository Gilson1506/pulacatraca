import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { cleanupOldCartData } from './utils/cartStorage';
import { initCacheCleanup } from './utils/cacheManager';
import { initPerformanceMonitoring } from './utils/performanceMonitor';
import './utils/testEnvVars';
import { abort } from '@/lib/globalAbort';

// Limpar dados antigos do carrinho na inicialização
cleanupOldCartData();

// Inicializar limpeza periódica de cache e monitoramento de performance
let cacheCleanup: (() => void) | null = null;
let performanceMonitor: (() => void) | null = null;

if (typeof window !== 'undefined') {
  try {
    cacheCleanup = initCacheCleanup();
    performanceMonitor = initPerformanceMonitoring();
    console.log('🧹 Gerenciadores de cache e performance inicializados');
  } catch (error) {
    console.error('❌ Erro ao inicializar gerenciadores:', error);
  }
  
  // Aborta requisições pendentes periodicamente (failsafe)
  setInterval(abort, 8000);
  
    // Cleanup ao fechar a página
    window.addEventListener('beforeunload', () => {
      if (cacheCleanup) cacheCleanup();
      if (performanceMonitor) performanceMonitor();
    });
}

// Desabilitar StrictMode em produção para melhor performance
const isDevelopment = import.meta.env.DEV;

const root = createRoot(document.getElementById('root')!);

if (isDevelopment) {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
} else {
  // Em produção, sem StrictMode para melhor performance
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
