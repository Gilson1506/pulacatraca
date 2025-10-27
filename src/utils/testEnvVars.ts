// Utilitário para testar e debugar variáveis de ambiente

export const testEnvVars = () => {
  console.log('=== 🔍 TESTE DE VARIÁVEIS DE AMBIENTE ===');
  
  const envVars = {
    VITE_PAGBANK_PUBLIC_KEY: import.meta.env.VITE_PAGBANK_PUBLIC_KEY,
    VITE_PAGBANK_API_URL: import.meta.env.VITE_PAGBANK_API_URL,
    VITE_PAGBANK_WEBHOOK_URL: import.meta.env.VITE_PAGBANK_WEBHOOK_URL,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  };

  console.table(envVars);

  // Verificações
  const checks = {
    '✅ Chave Pública PagBank': !!envVars.VITE_PAGBANK_PUBLIC_KEY && envVars.VITE_PAGBANK_PUBLIC_KEY.startsWith('MIIBIj'),
    '✅ URL API PagBank': !!envVars.VITE_PAGBANK_API_URL && envVars.VITE_PAGBANK_API_URL.includes('/api/payments'),
    '✅ URL Supabase': !!envVars.VITE_SUPABASE_URL,
    '✅ Modo de Desenvolvimento': envVars.DEV === true,
  };

  console.log('\n=== ✅ VERIFICAÇÕES ===');
  Object.entries(checks).forEach(([key, value]) => {
    console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
  });

  if (Object.values(checks).every(v => v)) {
    console.log('\n🎉 TODAS AS VARIÁVEIS ESTÃO CONFIGURADAS CORRETAMENTE!');
  } else {
    console.error('\n⚠️ ALGUMAS VARIÁVEIS NÃO ESTÃO CONFIGURADAS!');
    console.log('💡 DICA: Reinicie o servidor do Vite (npm run dev) para carregar o .env');
  }

  return checks;
};

// Executar automaticamente em desenvolvimento
if (import.meta.env.DEV) {
  testEnvVars();
}

export default testEnvVars;

