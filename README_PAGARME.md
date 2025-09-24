# 🚀 Integração Pagar.me com Supabase

## 📋 Visão Geral

Esta integração implementa **pagamento transparente** com Pagar.me para cartão de crédito, débito e PIX, integrado com Supabase para armazenamento seguro de transações.

## ✨ Funcionalidades

- 💳 **Cartão de Crédito**: Com validação e parcelamento
- 💳 **Cartão de Débito**: Processamento direto
- 📱 **PIX**: Geração de QR Code
- 🔒 **Segurança**: Validações em tempo real
- 📱 **Responsivo**: Funciona em todos os dispositivos
- 🎨 **UI Moderna**: Interface intuitiva e bonita

## 🏗️ Arquitetura

```
Frontend (React) → Pagar.me API → Supabase Database
     ↓                    ↓              ↓
  CheckoutForm    →   Pagamento   →  Histórico
  (Componente)    →   (Gateway)    →  (Transações)
```

## 📁 Estrutura de Arquivos

```
src/
├── config/
│   └── pagarme.js          # Configurações do Pagar.me
├── services/
│   └── pagarmeService.js   # Serviço de integração
├── hooks/
│   └── usePagarmePayment.js # Hook personalizado
├── components/
│   ├── CheckoutForm.jsx    # Componente principal
│   └── CheckoutForm.css    # Estilos
└── types/
    └── pagarme.ts          # Tipos TypeScript
```

## 🚀 Instalação

### 1. Dependências

```bash
npm install
# ou
yarn install
```

### 2. Configuração das Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Pagar.me
REACT_APP_PAGARME_API_KEY=sua_chave_api_aqui
REACT_APP_PAGARME_ENCRYPTION_KEY=sua_chave_criptografia_aqui
REACT_APP_WEBHOOK_URL=https://seudominio.com/webhook/pagarme

# Supabase
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### 3. Configuração do Supabase

Execute o SQL para criar a tabela de pedidos:

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

-- Política para usuários verem apenas seus pedidos
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

-- Política para usuários criarem pedidos
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Política para usuários atualizarem seus pedidos
CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE USING (auth.uid() = customer_id);
```

## 💻 Uso Básico

### 1. Importar o Componente

```jsx
import CheckoutForm from './components/CheckoutForm';

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
    <CheckoutForm 
      items={items}
      onSuccess={(orderId) => console.log('Pedido criado:', orderId)}
      onCancel={() => console.log('Checkout cancelado')}
    />
  );
}
```

### 2. Usar o Hook

```jsx
import usePagarmePayment from './hooks/usePagarmePayment';

function MyComponent() {
  const {
    formData,
    paymentState,
    processPayment,
    addItem,
    calculateTotal
  } = usePagarmePayment();

  const handlePayment = async () => {
    await processPayment();
  };

  return (
    <div>
      <p>Total: R$ {calculateTotal() / 100}</p>
      <button onClick={handlePayment}>
        Pagar
      </button>
    </div>
  );
}
```

## 🔧 Configuração Avançada

### 1. Personalizar Configurações

Edite `src/config/pagarme.js`:

```javascript
export const PAGARME_CONFIG = {
  API_KEY: process.env.REACT_APP_PAGARME_API_KEY,
  
  // Configurar parcelas
  PAYMENT_CONFIG: {
    CARD: {
      installments: [1, 2, 3, 6, 12], // Apenas estas opções
      defaultInstallments: 1,
      capture: true
    }
  },
  
  // Configurar antifraude
  ANTIFRAUD: {
    enabled: true,
    provider: 'clearsale'
  }
};
```

### 2. Personalizar Validações

```javascript
export const VALIDATION_CONFIG = {
  CARD: {
    minLength: 16, // Apenas cartões com 16+ dígitos
    maxLength: 19,
    cvvLength: [3, 4]
  }
};
```

### 3. Personalizar UI

```javascript
export const UI_CONFIG = {
  THEME: {
    primary: '#FF6B35', // Sua cor principal
    secondary: '#004E89'
  },
  
  MESSAGES: {
    SUCCESS: 'Pagamento aprovado com sucesso!',
    ERROR: 'Erro no pagamento. Tente novamente.'
  }
};
```

## 🧪 Testes

### 1. Cartões de Teste

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

### 2. Testar PIX

O PIX será gerado automaticamente e você pode testar com o app do seu banco.



## 🔒 Segurança

### 1. Validações Implementadas

- ✅ **Cartão**: Algoritmo de Luhn + validação de bandeira
- ✅ **CPF/CNPJ**: Validação de dígitos verificadores
- ✅ **Email**: Formato válido
- ✅ **Telefone**: Formato brasileiro
- ✅ **Endereço**: Campos obrigatórios

### 2. Proteções

- 🔐 **HTTPS**: Todas as comunicações são criptografadas
- 🛡️ **Antifraude**: Integração com Clearsale/Sift
- 📍 **Geolocalização**: Captura de IP e localização
- 🖥️ **Fingerprint**: Identificação única do dispositivo

### 3. RLS (Row Level Security)

```sql
-- Usuários só veem seus próprios pedidos
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);
```

## 📊 Monitoramento

### 1. Logs

```javascript
// Habilitar logs detalhados
console.log('🔍 Buscando usuário por email:', email);
console.log('✅ Usuário encontrado:', userData);
console.log('❌ Erro ao processar:', error);
```

### 2. Webhooks

Configure no dashboard do Pagar.me:

```javascript
// Eventos disponíveis
'order.paid'           // Pedido pago
'order.payment_failed' // Pagamento falhou
'order.canceled'       // Pedido cancelado
'order.created'        // Pedido criado
'order.pending'        // Pedido pendente
```

### 3. Status dos Pedidos

```javascript
const status = {
  'pending': 'Aguardando pagamento',
  'paid': 'Pago',
  'failed': 'Falhou',
  'canceled': 'Cancelado',
  'processing': 'Processando'
};
```

## 🚨 Tratamento de Erros

### 1. Erros Comuns

```javascript
try {
  await processPayment();
} catch (error) {
  if (error.code === 'card_declined') {
    // Cartão recusado
    showError('Cartão recusado. Verifique os dados.');
  } else if (error.code === 'insufficient_funds') {
    // Saldo insuficiente
    showError('Saldo insuficiente no cartão.');
  } else {
    // Erro genérico
    showError('Erro ao processar pagamento.');
  }
}
```

### 2. Retry Automático

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

## 📱 Responsividade

### 1. Breakpoints

```css
/* Desktop */
@media (min-width: 1024px) { ... }

/* Tablet */
@media (max-width: 768px) { ... }

/* Mobile */
@media (max-width: 480px) { ... }
```

### 2. Grid Adaptativo

```css
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
```

## 🔄 Atualizações

### 1. Verificar Versões

```bash
# Verificar versão do Pagar.me
npm list pagarme

# Verificar atualizações
npm outdated
```

### 2. Migração de Versões

```javascript
// Versão antiga
const oldConfig = {
  apiKey: 'chave_antiga'
};

// Nova versão
const newConfig = {
  API_KEY: 'nova_chave',
  ENVIRONMENT: 'production'
};
```

## 📞 Suporte

### 1. Documentação Oficial

- [Pagar.me Docs](https://docs.pagar.me/)
- [API Reference](https://docs.pagar.me/reference)
- [Webhooks](https://docs.pagar.me/docs/webhooks)

### 2. Comunidade

- [GitHub Issues](https://github.com/pagarme/pagarme-js/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/pagarme)

### 3. Contato

- **Email**: suporte@pagar.me
- **Telefone**: (11) 3004-6400
- **Chat**: Dashboard Pagar.me

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📈 Roadmap

- [ ] Integração com Apple Pay
- [ ] Integração com Google Pay
- [ ] Split de pagamentos
- [ ] Assinaturas recorrentes
- [ ] Marketplace
- [ ] Relatórios avançados
- [ ] Dashboard administrativo

---

**Desenvolvido com ❤️ para a comunidade Pagar.me**

