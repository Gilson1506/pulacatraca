# 🚀 Comandos para Deploy das Edge Functions

## 📋 **Pré-requisitos**
1. Ter Supabase CLI instalado: `npm install -g supabase`
2. Estar logado: `supabase login`
3. Ter o projeto linkado: `supabase link --project-ref seu-projeto-ref`

## 🗑️ **1. Remover Functions Antigas do Stripe**
```bash
# Remover todas as functions antigas
supabase functions delete create-checkout-session
supabase functions delete create-payment-intent
supabase functions delete create-subscription
supabase functions delete refund-payment
supabase functions delete create-event-product
supabase functions delete get-customer-portal
supabase functions delete stripe-webhook
```

## 🚀 **2. Deploy das Novas Functions do Pagar.me**
```bash
# Deploy da function principal
supabase functions deploy process-payment

# Deploy da function de status
supabase functions deploy get-payment-status

# Deploy da function de cancelamento
supabase functions deploy cancel-payment
```

## 🔑 **3. Configurar Variáveis de Ambiente**
```bash
# Definir chave do Pagar.me
supabase secrets set PAGARME_API_KEY=sua_chave_api_secreta_aqui

# Verificar configuração
supabase secrets list
```

## ✅ **4. Verificar Resultado**
```bash
# Listar functions ativas
supabase functions list

# Ver logs de uma function
supabase functions logs process-payment
```

## 🧪 **5. Testar Functions**
```bash
# Testar process-payment
curl -X POST "https://seu-projeto.supabase.co/functions/v1/process-payment" \
  -H "Authorization: Bearer sua_chave_anonima" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 📁 **Estrutura Final Esperada**
```
supabase/functions/
├── process-payment/          # ✅ Nova function
├── get-payment-status/       # ✅ Nova function
└── cancel-payment/           # ✅ Nova function
```

## ⚠️ **Importante**
- Substitua `sua_chave_api_secreta_aqui` pela sua chave real do Pagar.me
- Substitua `seu-projeto.supabase.co` pela URL do seu projeto
- Substitua `sua_chave_anonima` pela sua chave anônima do Supabase
