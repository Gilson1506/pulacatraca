# 🌐 Configuração dos Endpoints para Render

## ✅ Configuração Concluída

Todos os endpoints do frontend foram atualizados para apontar para o backend no Render:
**https://backend-pula.onrender.com**

## 📋 Endpoints Configurados

### 1. **Pagamentos**
- **POST** `https://backend-pula.onrender.com/api/payments`
  - Criar pedido/pagamento genérico
  - Aceita cartão de crédito, débito e PIX

### 2. **Geração de Hash do Cartão**
- **POST** `https://backend-pula.onrender.com/api/payments/generate-card-hash`
  - Gera token seguro para dados do cartão

### 3. **Proxy para QR Code PIX**
- **GET** `https://backend-pula.onrender.com/api/payments/qr-image?url=<qr_code_url>`
  - Exibe imagens de QR Code sem problemas de CORS

### 4. **Detalhes da Transação PIX**
- **GET** `https://backend-pula.onrender.com/api/payments/pix-details?transaction_id=<id>`
  - Busca informações detalhadas de transações PIX

### 5. **Verificação de Status**
- **GET** `https://backend-pula.onrender.com/`
  - Status da API
- **GET** `https://backend-pula.onrender.com/env-check`
  - Verificação de variáveis de ambiente

## 🔧 Arquivos Atualizados

### Frontend
- ✅ `src/services/securePaymentService.js` - URL do backend atualizada
- ✅ `src/services/cardEncryptionService.js` - URL do backend atualizada  
- ✅ `src/hooks/useSecurePayment.js` - URLs hardcoded atualizadas
- ✅ `env.example` - Variável VITE_BACKEND_URL adicionada

### Configuração
- ✅ `vercel.json` - Configuração do Vercel mantida
- ✅ `package.json` - Scripts mantidos

## 🚀 Próximos Passos

### 1. **Configurar Variáveis de Ambiente no Vercel**

No painel do Vercel, adicione as seguintes variáveis:

```bash
# Frontend (Vercel)
VITE_BACKEND_URL=https://backend-pula.onrender.com
VITE_SUPABASE_URL=https://ejqebmnphdxzwyohxysh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcWVibW5waGR4end5b2h4eXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzI5NzcsImV4cCI6MjA1MTI0ODk3N30.a5ab0533f36c9490e81fe52f9d288861a6fab3479980ba02a1953a6ff337e4ee
VITE_PAGARME_PUBLIC_KEY=pk_test_3lXpvYAhbfZvG7V1
VITE_PAGARME_ENCRYPTION_KEY=pk_test_3lXpvYAhbfZvG7V1
VITE_WEBHOOK_URL=https://ejqebmnphdxzwyohxysh.supabase.co/functions/v1/pagarme-webhook
```

### 2. **Deploy do Frontend**

```bash
# Deploy para produção
vercel --prod
```

### 3. **Testar Endpoints**

Após o deploy, teste os seguintes endpoints:

1. **Status da API**: `https://backend-pula.onrender.com/`
2. **Verificação de Ambiente**: `https://backend-pula.onrender.com/env-check`
3. **Teste de Pagamento**: Use o frontend para testar um pagamento

## 🔍 Verificação

### Como Verificar se Está Funcionando

1. **Console do Navegador**: Verifique se não há erros de CORS
2. **Network Tab**: Confirme que as requisições estão indo para `backend-pula.onrender.com`
3. **Logs do Backend**: Monitore os logs no dashboard do Render

### Possíveis Problemas

1. **CORS**: Já configurado no backend
2. **Timeout**: Render tem timeout de 30s no plano gratuito
3. **Cold Start**: Primeira requisição pode demorar alguns segundos

## 📱 Teste Local

Para testar localmente, crie um arquivo `.env` na raiz do projeto:

```bash
VITE_BACKEND_URL=https://backend-pula.onrender.com
VITE_SUPABASE_URL=https://ejqebmnphdxzwyohxysh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcWVibW5waGR4end5b2h4eXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzI5NzcsImV4cCI6MjA1MTI0ODk3N30.a5ab0533f36c9490e81fe52f9d288861a6fab3479980ba02a1953a6ff337e4ee
VITE_PAGARME_PUBLIC_KEY=pk_test_3lXpvYAhbfZvG7V1
VITE_PAGARME_ENCRYPTION_KEY=pk_test_3lXpvYAhbfZvG7V1
```

## ✅ Status

- ✅ Backend deployado no Render
- ✅ Endpoints atualizados no frontend
- ✅ Configuração de CORS no backend
- ✅ Variáveis de ambiente documentadas
- ⏳ Aguardando deploy do frontend no Vercel
- ⏳ Aguardando configuração das variáveis no Vercel
