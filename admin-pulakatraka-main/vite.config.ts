import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente com base no modo (development/production)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log das variáveis de ambiente durante o build (apenas os nomes, não os valores por segurança)
  console.log('Variáveis de ambiente disponíveis:', Object.keys(env).filter(key => key.startsWith('VITE_')));
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
        },
      },
    },
    // Configuração para SPA - garantir que todas as rotas direcionem para index.html
    preview: {
      port: 4173,
      strictPort: true,
    },
    server: {
      host: true,
      port: 5174,
      strictPort: true,
    },
    // Garante que as variáveis de ambiente estejam disponíveis
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY),
    },
  };
});
