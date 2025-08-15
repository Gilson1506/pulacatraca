# 🚀 Guia Completo: Integração Stripe + Supabase

Este guia implementa o fluxo completo:
✅ **Criar evento no app** → **Gerar produto no Stripe**  
✅ **Registrar transação** → **Fazer checkout com Stripe**  
✅ **Confirmar pagamento com webhook**

## 📋 Índice

1. [Configuração Inicial](#-configuração-inicial)
2. [Estrutura do Projeto](#-estrutura-do-projeto)
3. [Edge Functions](#-edge-functions)
4. [Database Schema](#-database-schema)
5. [Implementação Cliente](#-implementação-cliente)
6. [Exemplos de Uso](#-exemplos-de-uso)
7. [Deploy e Configuração](#-deploy-e-configuração)
8. [Troubleshooting](#-troubleshooting)

## 🛠 Configuração Inicial

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Instalar Dependências

```bash
npm install @supabase/supabase-js @stripe/stripe-js
```

## 📁 Estrutura do Projeto

```
projeto/
├── supabase/
│   ├── functions/
│   │   ├── create-event-product/     # Cria evento + produto Stripe
│   │   ├── create-checkout-session/  # Transação + checkout
│   │   ├── stripe-webhook/           # Confirma pagamentos
│   │   ├── create-subscription/      # Gerencia assinaturas
│   │   └── get-customer-portal/      # Portal do cliente
│   ├── migrations/
│   │   └── 001_create_stripe_integration_tables.sql
│   └── config.toml
├── src/
│   └── lib/
│       └── stripe-integration.ts     # Biblioteca cliente
├── .env.example
└── STRIPE_INTEGRATION_GUIDE.md
```

## ⚡ Edge Functions

### 1. Create Event Product (`create-event-product`)

**Funcionalidade:** Cria evento no Supabase + produto no Stripe

```typescript
// Exemplo de chamada
const eventData = {
  title: "Festival de Música 2024",
  description: "Grande festival com artistas nacionais",
  price: 150.00,
  event_date: "2024-06-15T20:00:00Z",
  location: "São Paulo, SP",
  max_attendees: 1000,
  ticket_types: [
    {
      name: "VIP",
      price: 300.00,
      description: "Acesso total + backstage",
      quantity: 100
    },
    {
      name: "Pista",
      price: 150.00,
      description: "Acesso à pista principal",
      quantity: 900
    }
  ]
}

const result = await createEventWithStripeProduct(eventData)
```

### 2. Create Checkout Session (`create-checkout-session`)

**Funcionalidade:** Registra transação + cria checkout Stripe

```typescript
// Exemplo de chamada
const checkoutData = {
  event_id: "uuid-do-evento",
  ticket_type_id: "uuid-do-tipo-ingresso",
  quantity: 2,
  success_url: "https://meuapp.com/success",
  cancel_url: "https://meuapp.com/cancel",
  customer_info: {
    name: "João Silva",
    phone: "+5511999999999"
  }
}

const result = await createCheckoutSession(checkoutData)
// Redireciona para: result.checkout_url
```

### 3. Stripe Webhook (`stripe-webhook`)

**Funcionalidade:** Processa eventos do Stripe e atualiza status

**Eventos tratados:**
- `payment_intent.succeeded` → Confirma pagamento + gera ingressos
- `payment_intent.payment_failed` → Marca como falhou
- `customer.subscription.*` → Gerencia assinaturas
- `invoice.payment_*` → Processsa faturas

## 🗄 Database Schema

### Tabelas Principais

1. **`events`** - Eventos criados
2. **`event_ticket_types`** - Tipos de ingresso por evento
3. **`transactions`** - Registro de transações
4. **`ticket_purchases`** - Compras de ingressos
5. **`tickets`** - Ingressos individuais com códigos únicos
6. **`customers`** - Clientes Stripe
7. **`subscriptions`** - Assinaturas ativas

### Aplicar Schema

```bash
# Via Supabase CLI
supabase db push

# Ou execute o SQL diretamente no Supabase Dashboard
```

## 💻 Implementação Cliente

### Exemplo: Criar Evento

```typescript
import { createEventWithStripeProduct } from '@/lib/stripe-integration'

async function handleCreateEvent(formData: EventData) {
  try {
    const result = await createEventWithStripeProduct(formData)
    console.log('Evento criado:', result.event.id)
    console.log('Produto Stripe:', result.event.stripe_product_id)
  } catch (error) {
    console.error('Erro:', error.message)
  }
}
```

### Exemplo: Comprar Ingressos

```typescript
import { createCheckoutSession } from '@/lib/stripe-integration'

async function handleBuyTickets(eventId: string, ticketTypeId: string) {
  try {
    const result = await createCheckoutSession({
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantity: 2,
      success_url: `${window.location.origin}/payment/success`,
      cancel_url: `${window.location.origin}/payment/cancel`,
    })
    
    // Redireciona para o checkout do Stripe
    window.location.href = result.checkout_url
  } catch (error) {
    console.error('Erro no checkout:', error)
  }
}
```

### Exemplo: Listar Eventos

```typescript
import { getActiveEvents, formatCurrency, formatDate } from '@/lib/stripe-integration'

function EventsList() {
  const [events, setEvents] = useState([])
  
  useEffect(() => {
    getActiveEvents().then(setEvents)
  }, [])
  
  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          <p>{formatDate(event.event_date)}</p>
          <p>{formatCurrency(event.price)}</p>
        </div>
      ))}
    </div>
  )
}
```

## 🚀 Deploy e Configuração

### 1. Deploy Edge Functions

```bash
# Deploy todas as funções
supabase functions deploy

# Ou individual
supabase functions deploy create-event-product
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

### 2. Configurar Webhook no Stripe

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Adicione endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Selecione eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3. Configurar RLS Policies

As policies já estão configuradas no SQL, mas verifique se estão ativas:

```sql
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Webhook não funciona
```bash
# Verificar logs das functions
supabase functions logs stripe-webhook

# Testar webhook localmente
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

#### 2. Erro de CORS
Verifique se os headers CORS estão corretos nas Edge Functions:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

#### 3. Erro de autenticação
```typescript
// Verificar se o usuário está logado
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  throw new Error('Usuário não autenticado')
}
```

#### 4. RLS bloqueando acesso
```sql
-- Verificar policies ativas
SELECT * FROM pg_policies WHERE tablename = 'events';

-- Temporariamente desabilitar RLS para teste
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
```

### Logs Úteis

```bash
# Logs das Edge Functions
supabase functions logs

# Logs específicos de uma função
supabase functions logs stripe-webhook --follow

# Logs do banco
supabase logs db
```

## 📊 Monitoramento

### Métricas Importantes

1. **Taxa de conversão de checkout**
2. **Tempo médio de processamento de pagamento**
3. **Falhas de webhook**
4. **Eventos criados vs vendas**

### Queries Úteis

```sql
-- Vendas por evento
SELECT 
  e.title,
  COUNT(tp.id) as total_purchases,
  SUM(tp.total_amount) as total_revenue
FROM events e
LEFT JOIN ticket_purchases tp ON e.id = tp.event_id
WHERE tp.status = 'confirmed'
GROUP BY e.id, e.title;

-- Transações falharam
SELECT * FROM transactions 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## 🎯 Próximos Passos

1. **Implementar reembolsos**
2. **Adicionar check-in via QR Code**
3. **Sistema de transferência de ingressos**
4. **Análytics avançados**
5. **Notificações por email/SMS**

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs das Edge Functions
2. Consulte a documentação do Stripe
3. Verifique as policies do Supabase
4. Teste em ambiente de desenvolvimento primeiro

---

**✅ Implementação Completa!**

Agora você tem uma integração completa entre Supabase e Stripe que permite:
- Criar eventos e produtos automaticamente
- Processar pagamentos com checkout seguro
- Confirmar pagamentos via webhooks
- Gerenciar ingressos e assinaturas
- Monitorar vendas e métricas