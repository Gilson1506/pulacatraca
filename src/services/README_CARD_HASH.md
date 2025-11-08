# Serviço de Geração de Card Hash - Frontend

Este serviço implementa a geração de card hash no frontend seguindo exatamente o padrão do SDK da Pagar.me, garantindo segurança e compatibilidade.

## Características

- ✅ **Geração local no frontend**: Não depende de backend para gerar card hash
- ✅ **Compatível com SDK Pagar.me**: Usa a mesma API de tokens
- ✅ **Validação completa**: Valida número, CVV, data de expiração e nome
- ✅ **Detecção de bandeira**: Identifica automaticamente a bandeira do cartão
- ✅ **Formatação automática**: Formata dados para o padrão correto
- ✅ **Tratamento de erros**: Mensagens de erro claras e específicas

## Configuração

### 1. Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# Chave pública do Pagar.me (começa com pk_)
VITE_PAGARME_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx

# Chave de criptografia do Pagar.me (começa com ek_)
VITE_PAGARME_ENCRYPTION_KEY=ek_test_xxxxxxxxxxxxxxxx
```

### 2. Importação

```javascript
import frontendCardHashService from '../services/frontendCardHashService';
```

## Uso Básico

### Gerar Card Hash

```javascript
const cardData = {
  number: '4111111111111111',
  holder_name: 'João Silva',
  exp_month: 12,
  exp_year: 2025,
  cvv: '123'
};

try {
  const cardHash = await frontendCardHashService.generateCardHash(cardData);
  console.log('Card hash gerado:', cardHash);
} catch (error) {
  console.error('Erro:', error.message);
}
```

### Validação de Cartão

```javascript
// Validar número do cartão
const isValidNumber = frontendCardHashService.validateCardNumber('4111111111111111');

// Validar CVV
const isValidCVV = frontendCardHashService.validateCVV('123', 'visa');

// Validar data de expiração
const isValidExpiry = frontendCardHashService.validateExpiry(12, 2025);

// Identificar bandeira
const brand = frontendCardHashService.getCardBrand('4111111111111111');
```

### Formatação

```javascript
// Formatar número do cartão
const formattedNumber = frontendCardHashService.formatCardNumber('4111111111111111');
// Resultado: "4111 1111 1111 1111"

// Formatar data de expiração
const formattedExpiry = frontendCardHashService.formatExpiry('1225');
// Resultado: "12/25"
```

## Integração com Componentes

### React Hook

```javascript
import { useSecurePayment } from '../hooks/useSecurePayment';

const MyComponent = () => {
  const { processPayment } = useSecurePayment();
  
  const handlePayment = async (cardData) => {
    try {
      await processPayment({
        payment_method: 'credit_card',
        card: cardData,
        amount: 10000, // em centavos
        customer: { /* dados do cliente */ }
      });
    } catch (error) {
      console.error('Erro no pagamento:', error);
    }
  };
};
```

### Componente de Checkout

```javascript
import SecureCheckoutForm from '../components/SecureCheckoutForm';

const CheckoutPage = () => {
  return (
    <SecureCheckoutForm
      items={cartItems}
      onSuccess={(result) => console.log('Pagamento aprovado:', result)}
      onCancel={() => console.log('Pagamento cancelado')}
    />
  );
};
```

## Fluxo de Pagamento

1. **Coleta de dados**: Usuário preenche formulário de cartão
2. **Validação**: Dados são validados localmente
3. **Geração de hash**: Card hash é gerado usando API do Pagar.me
4. **Envio seguro**: Apenas o hash é enviado para o backend
5. **Processamento**: Backend processa pagamento com o hash

## Segurança

- ✅ **Dados sensíveis nunca saem do frontend**: Apenas o card hash é enviado
- ✅ **Validação local**: Dados são validados antes da criptografia
- ✅ **Chaves seguras**: Usa encryption_key do Pagar.me
- ✅ **API oficial**: Usa endpoint oficial de tokens do Pagar.me

## Tratamento de Erros

O serviço trata os seguintes tipos de erro:

- **Dados incompletos**: Campos obrigatórios não preenchidos
- **Validação**: Número, CVV ou data inválidos
- **Rede**: Problemas de conectividade com API
- **API**: Erros retornados pela Pagar.me
- **Configuração**: Chaves não configuradas

## Exemplos de Erro

```javascript
try {
  const cardHash = await frontendCardHashService.generateCardHash(cardData);
} catch (error) {
  if (error.message.includes('Dados do cartão incompletos')) {
    // Tratar dados faltantes
  } else if (error.message.includes('Número do cartão inválido')) {
    // Tratar número inválido
  } else if (error.message.includes('Encryption key inválida')) {
    // Tratar configuração
  }
}
```

## Compatibilidade

- ✅ **Navegadores modernos**: Chrome, Firefox, Safari, Edge
- ✅ **Mobile**: iOS Safari, Chrome Mobile
- ✅ **React**: 16.8+ (hooks)
- ✅ **Pagar.me API**: v5

## Troubleshooting

### Erro: "Encryption key inválida"
- Verifique se `VITE_PAGARME_ENCRYPTION_KEY` está configurada
- Confirme se a chave começa com `ek_`

### Erro: "Public key inválida"
- Verifique se `VITE_PAGARME_PUBLIC_KEY` está configurada
- Confirme se a chave começa com `pk_`

### Erro: "Número do cartão inválido"
- Verifique se o número tem 13-19 dígitos
- Confirme se passa no algoritmo de Luhn

### Erro: "CVV inválido"
- Visa/Mastercard: 3 dígitos
- American Express: 4 dígitos

### Erro: "Data de expiração inválida"
- Mês: 01-12
- Ano: Ano atual ou futuro
- Formato: MM/YY ou YYYY

