# ⚙️ Configuração do Webhook PagBank - TUTORIAL COMPLETO

## ✅ O que foi aplicado automaticamente:

1. ✅ **notification_urls** adicionado aos pedidos PIX
2. ✅ **notification_urls** adicionado aos pedidos com Cartão de Crédito
3. ✅ Endpoint webhook já implementado no backend (`/api/payments/webhook`)

---

## 📝 O que VOCÊ precisa fazer agora:

### 1. Criar arquivo `.env` na raiz do projeto

Crie um arquivo chamado `.env` na raiz do projeto com o seguinte conteúdo:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_do_supabase

# PagBank Webhook Configuration
# Para desenvolvimento local (use ngrok): https://seu-ngrok-url.ngrok.io/api/payments/webhook
# Para produção: https://seu-backend-producao.vercel.app/api/payments/webhook
VITE_PAGBANK_WEBHOOK_URL=http://localhost:3000/api/payments/webhook
```

**⚠️ IMPORTANTE:** Substitua os valores de exemplo pelos seus valores reais.

---

### 2. Configurar o Backend

Certifique-se de que o arquivo `backend pagbank/.env` existe com as seguintes variáveis:

```env
# PagBank API Configuration
PAGBANK_API_KEY=seu_token_do_pagbank_aqui

# Supabase Configuration (necessário para webhooks)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_do_supabase

# Server Configuration
PORT=3000
NODE_ENV=development
```

---

### 3. Testar Webhooks Localmente com ngrok

Para testar os webhooks localmente, você precisa expor seu backend usando **ngrok**:

#### 3.1. Instalar ngrok

```bash
# Windows (com chocolatey)
choco install ngrok

# Ou baixe em: https://ngrok.com/download
```

#### 3.2. Executar o Backend

```bash
cd "backend pagbank"
npm install
npm start
```

O backend deve estar rodando em `http://localhost:3000`

#### 3.3. Executar ngrok

Em outro terminal:

```bash
ngrok http 3000
```

Você verá algo assim:

```
ngrok                                                          

Session Status                online
Account                       seu-usuario (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

#### 3.4. Copiar a URL pública

Copie a URL que aparece em "Forwarding" (exemplo: `https://abc123xyz.ngrok.io`)

#### 3.5. Atualizar o arquivo `.env`

No arquivo `.env` na raiz do projeto, atualize:

```env
VITE_PAGBANK_WEBHOOK_URL=https://abc123xyz.ngrok.io/api/payments/webhook
```

**⚠️ IMPORTANTE:** Reinicie o frontend após alterar o `.env`

---

### 4. Configurar no Painel do PagBank (OPCIONAL)

Se você quiser configurar webhooks globais no painel do PagBank (além dos `notification_urls`):

#### Sandbox (Testes):
1. Acesse: https://sandbox.pagseguro.uol.com.br/
2. Faça login com sua conta de testes
3. Vá em **Configurações** → **Webhooks** ou **Integrações**
4. Adicione a URL: `https://abc123xyz.ngrok.io/api/payments/webhook`
5. Selecione os eventos:
   - ✅ `payment.paid` (Pagamento aprovado)
   - ✅ `payment.failed` (Pagamento falhou)
   - ✅ `payment.pending` (Pagamento pendente)
   - ✅ `order.cancelled` (Pedido cancelado)
   - ✅ `order.created` (Pedido criado)

#### Produção:
1. Acesse: https://pagseguro.uol.com.br/
2. Siga os mesmos passos acima
3. Use a URL de produção: `https://seu-backend-producao.vercel.app/api/payments/webhook`

**📝 NOTA:** Com os `notification_urls` configurados no código (já feito automaticamente), os webhooks serão enviados mesmo sem configuração no painel. A configuração no painel é adicional/opcional.

---

## 🧪 Como Testar

### 1. Testar criação de pedido PIX:

1. Certifique-se de que o backend está rodando
2. Certifique-se de que o ngrok está ativo
3. Acesse o frontend e crie um pedido PIX
4. No console do backend, você deve ver:

```
💳 Dados do pedido recebidos: {
  "reference_id": "ORD-...",
  "customer": {...},
  "items": [...],
  "qr_codes": [...],
  "notification_urls": ["https://abc123xyz.ngrok.io/api/payments/webhook"]
}
```

5. Pague o PIX (no sandbox, você pode simular o pagamento)
6. O webhook será chamado e você verá no console:

```
🔔 Webhook PagBank recebido: {...}
✅ PAGAMENTO APROVADO! ID: ORDE_...
💰 Valor: R$ 50.00
💳 Método: PIX
👤 Cliente: Nome do Cliente
✅ Order atualizado para paid: 123
✅ Transaction atualizada para completed
```

### 2. Testar criação de pedido com Cartão:

Siga os mesmos passos acima, mas escolha pagamento com cartão de crédito.

---

## 📊 Eventos que o Webhook Trata

O endpoint `/api/payments/webhook` já está configurado para tratar os seguintes eventos:

| Evento | Ação | Tabelas Atualizadas |
|--------|------|---------------------|
| `payment.paid` | Pagamento aprovado | `orders.payment_status = 'paid'`<br>`orders.paid_at = now()`<br>`transactions.status = 'completed'` |
| `payment.failed` | Pagamento falhou | `orders.payment_status = 'failed'`<br>`transactions.status = 'failed'` |
| `payment.pending` | Pagamento pendente | `orders.payment_status = 'pending'`<br>`transactions.status = 'pending'` |
| `order.cancelled` | Pedido cancelado | `orders.payment_status = 'cancelled'`<br>`orders.canceled_at = now()`<br>`transactions.status = 'cancelled'` |
| `order.created` | Pedido criado | Vincula `pagbank_order_id` ao order local |

---

## 🔍 Como Monitorar os Webhooks

### 1. Logs no Backend

Os webhooks são logados automaticamente no console do backend. Procure por:

```
🔔 Webhook PagBank recebido: {...}
```

### 2. Interface Web do ngrok

O ngrok tem uma interface web em `http://127.0.0.1:4040` onde você pode ver todas as requisições HTTP, incluindo os webhooks.

### 3. Logs no Supabase

Você pode verificar se os dados foram atualizados corretamente no Supabase:

1. Acesse o painel do Supabase
2. Vá em **Table Editor**
3. Verifique as tabelas `orders` e `transactions`
4. Procure por atualizações nos campos `payment_status`, `paid_at`, etc.

---

## 🚀 Deploy em Produção

Quando fizer deploy do backend em produção (ex: Vercel, Heroku, etc.):

### 1. Atualizar variável de ambiente

No arquivo `.env` de produção:

```env
VITE_PAGBANK_WEBHOOK_URL=https://seu-backend-producao.vercel.app/api/payments/webhook
```

### 2. Configurar no PagBank

No painel de produção do PagBank, configure a mesma URL.

### 3. Testar

Faça um pedido real de teste e verifique se o webhook é chamado.

---

## ❓ Solução de Problemas

### Webhook não está sendo chamado?

1. ✅ Verifique se `notification_urls` está sendo enviado no payload (já configurado)
2. ✅ Verifique se o ngrok está rodando e a URL está correta
3. ✅ Verifique se o backend está rodando na porta 3000
4. ✅ Verifique se reiniciou o frontend após alterar o `.env`
5. ✅ Verifique os logs do ngrok em `http://127.0.0.1:4040`

### Webhook está sendo chamado mas dá erro?

1. Verifique se as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas no `backend pagbank/.env`
2. Verifique se as tabelas `orders` e `transactions` existem no Supabase
3. Verifique os logs do backend para ver o erro específico

### Dados não estão sendo atualizados no Supabase?

1. Verifique se o `pagbank_order_id` está sendo salvo corretamente na tabela `orders`
2. Verifique se as policies do Supabase permitem atualização das tabelas
3. Verifique os logs do backend para ver se há erros de permissão

---

## 📚 Documentação Oficial

- [Webhooks PagBank](https://dev.pagseguro.uol.com.br/reference/webhooks-1)
- [API de Pedidos PagBank](https://dev.pagseguro.uol.com.br/reference/criar-pedido)
- [ngrok Documentation](https://ngrok.com/docs)

---

## ✅ Checklist Final

Antes de testar, certifique-se de que:

- [ ] Arquivo `.env` criado na raiz do projeto com `VITE_PAGBANK_WEBHOOK_URL`
- [ ] Arquivo `backend pagbank/.env` configurado com todas as variáveis
- [ ] Backend rodando em `http://localhost:3000`
- [ ] ngrok rodando e expondo o backend
- [ ] URL do ngrok configurada no `.env` (e frontend reiniciado)
- [ ] Frontend rodando e funcionando normalmente

Após isso, faça um pedido de teste e verifique os logs! 🎉

