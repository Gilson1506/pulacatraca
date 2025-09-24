# 🔒 Arquitetura Segura - Pagar.me + Supabase

## 📋 Visão Geral

Esta implementação segue a **arquitetura recomendada** para máxima segurança e conformidade PCI DSS, onde:

- **Frontend**: Gera `card_hash` usando encryption key pública
- **Backend**: Processa pagamentos com API key secreta
- **Nenhum dado sensível** passa pelo servidor

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Supabase        │    │   Pagar.me      │
│   (React)       │    │  Functions       │    │   API           │
│                 │    │                  │    │                 │
│ 1. Validação    │───▶│ 1. Recebe        │───▶│ 1. Processa     │
│ 2. card_hash    │    │    card_hash     │    │    pagamento    │
│ 3. Envia dados  │    │ 2. API Key       │    │ 2. Retorna      │
│    seguros      │    │    secreta       │    │    resultado    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔐 Fluxo de Segurança

### 1. **Cartão de Crédito/Débito**
```
Frontend → card_hash → Supabase Function → Pagar.me API
   ↓           ↓              ↓              ↓
Validação → Criptografia → Processamento → Resultado
```

### 2. **PIX**
```
Frontend → Dados seguros → Supabase Function → Pagar.me API
   ↓           ↓              ↓              ↓
Validação → Sem dados → Processamento → QR Code
           sensíveis
```

## 📁 Estrutura de Arquivos

```
src/
├── config/
│   └── pagarme.js                    # Configurações (sem API key secreta)
├── services/
│   ├── cardEncryptionService.js      # Gera card_hash
│   └── securePaymentService.js       # Comunica com Supabase Functions
├── hooks/
│   └── useSecurePayment.js           # Hook para pagamentos seguros
├── components/
│   └── SecureCheckoutForm.jsx        # Formulário seguro
└── types/
    └── pagarme.ts                    # Tipos TypeScript

supabase/
└── functions/
    ├── process-payment/              # Processa pagamentos
    ├── get-payment-status/           # Busca status
    └── cancel-payment/               # Cancela pagamentos
```

## 🚀 Instalação

### 1. **Configurar Variáveis de Ambiente**

```env
# Frontend (.env.local)
REACT_APP_PAGARME_ENCRYPTION_KEY=sua_chave_criptografia_publica
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima

# Supabase Functions (supabase/functions/.env)
PAGARME_API_KEY=sua_chave_api_secreta
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
```

### 2. **Deploy das Supabase Functions**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy das functions
supabase functions deploy process-payment
supabase functions deploy get-payment-status
supabase functions deploy cancel-payment
```

### 3. **Configurar Banco de Dados**

```sql
-- Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  customer_id UUID REFERENCES auth.users(id),
  customer_data JSONB,
  items JSONB,
  pagarme_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE USING (auth.uid() = customer_id);
```

## 💻 Uso

### 1. **Importar Componente Seguro**

```jsx
import SecureCheckoutForm from './components/SecureCheckoutForm';

function App() {
  const items = [
    {
      amount: 5000, // R$ 50,00 em centavos
      description: 'Ingresso VIP',
      quantity: 1,
      code: 'VIP001'
    }
  ];

  return (
    <SecureCheckoutForm 
      items={items}
      onSuccess={(orderId) => console.log('Pedido criado:', orderId)}
      onCancel={() => console.log('Checkout cancelado')}
    />
  );
}
```

### 2. **Usar Hook Seguro**

```jsx
import useSecurePayment from './hooks/useSecurePayment';

function MyComponent() {
  const {
    formData,
    paymentState,
    processPayment,
    addItem,
    calculateTotal
  } = useSecurePayment();

  const handlePayment = async () => {
    await processPayment();
  };

  return (
    <div>
      <p>Total: R$ {calculateTotal() / 100}</p>
      <button onClick={handlePayment}>
        Pagar com Segurança
      </button>
    </div>
  );
}
```

## 🔐 Segurança Implementada

### 1. **PCI DSS Compliance**
- ✅ **Nenhum dado de cartão** no servidor
- ✅ **card_hash** criptografado
- ✅ **API key secreta** apenas no backend
- ✅ **Validação** no frontend e backend

### 2. **Proteções**
- 🔐 **HTTPS** obrigatório
- 🛡️ **Validação** em tempo real
- 📍 **Geolocalização** (opcional)
- 🖥️ **Fingerprint** do dispositivo
- 🔒 **RLS** no Supabase

### 3. **Validações**
- ✅ **Cartão**: Algoritmo de Luhn + bandeira
- ✅ **CPF/CNPJ**: Dígitos verificadores
- ✅ **Email**: Formato válido
- ✅ **Telefone**: Formato brasileiro
- ✅ **Endereço**: Campos obrigatórios

## 📊 Monitoramento

### 1. **Logs de Segurança**

```javascript
// Frontend
console.log('🔐 Card hash gerado:', cardHash);
console.log('📤 Enviando dados seguros para backend');

// Backend (Supabase Functions)
console.log('🔒 Processando pagamento com card_hash:', cardHash);
console.log('✅ Pagamento processado com sucesso');
```

### 2. **Webhooks**

Configure no dashboard do Pagar.me:
```javascript
// Eventos disponíveis
'order.paid'           // Pedido pago
'order.payment_failed' // Pagamento falhou
'order.canceled'       // Pedido cancelado
'order.created'        // Pedido criado
'order.pending'        // Pedido pendente
```

## 🧪 Testes

### 1. **Cartões de Teste**

```javascript
// Visa
const testCard = {
  number: '4111111111111111',
  holder_name: 'Teste Teste',
  exp_month: '12',
  exp_year: '2025',
  cvv: '123'
};

// Mastercard
const testCard2 = {
  number: '5555555555554444',
  holder_name: 'Teste Teste',
  exp_month: '12',
  exp_year: '2025',
  cvv: '123'
};
```

### 2. **Testar PIX**
- PIX será gerado automaticamente
- Use app do banco para testar



## 🚨 Tratamento de Erros

### 1. **Erros Comuns**

```javascript
try {
  await processPayment();
} catch (error) {
  if (error.code === 'card_declined') {
    showError('Cartão recusado. Verifique os dados.');
  } else if (error.code === 'insufficient_funds') {
    showError('Saldo insuficiente no cartão.');
  } else {
    showError('Erro ao processar pagamento.');
  }
}
```

### 2. **Retry Automático**

```javascript
const retryPayment = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await processPayment();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## 🔄 Atualizações

### 1. **Verificar Versões**

```bash
# Verificar versão do Supabase
supabase --version

# Verificar atualizações
npm outdated
```

### 2. **Migração de Versões**

```javascript
// Versão antiga (insegura)
const oldConfig = {
  apiKey: 'chave_no_frontend' // ❌ Inseguro
};

// Nova versão (segura)
const newConfig = {
  encryptionKey: 'chave_publica', // ✅ Seguro
  // API key apenas no backend
};
```

## 📞 Suporte

### 1. **Documentação Oficial**
- [Pagar.me Docs](https://docs.pagar.me/)
- [Supabase Functions](https://supabase.com/docs/guides/functions)
- [PCI DSS](https://www.pcisecuritystandards.org/)

### 2. **Comunidade**
- [GitHub Issues](https://github.com/pagarme/pagarme-js/issues)
- [Supabase Discord](https://discord.supabase.com/)

### 3. **Contato**
- **Pagar.me**: suporte@pagar.me
- **Supabase**: support@supabase.com

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/SecureFeature`)
3. Commit suas mudanças (`git commit -m 'Add secure payment feature'`)
4. Push para a branch (`git push origin feature/SecureFeature`)
5. Abra um Pull Request

## 📈 Roadmap

- [ ] Integração com Apple Pay
- [ ] Integração com Google Pay
- [ ] Split de pagamentos
- [ ] Assinaturas recorrentes
- [ ] Marketplace
- [ ] Relatórios avançados
- [ ] Dashboard administrativo
- [ ] Auditoria de segurança
- [ ] Compliance automático

---

**Desenvolvido com ❤️ e 🔒 para máxima segurança**
