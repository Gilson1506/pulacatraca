# Configuração da Criptografia de Cartão - PagBank

## ⚠️ IMPORTANTE: Criptografia Obrigatória

Os dados do cartão de crédito devem ser criptografados antes do envio para o PagBank, exceto em ambientes certificados com PCI-DSS.

## 📋 Configuração

### 1. Adicionar Chave Pública no .env

Adicione a seguinte variável no seu arquivo `.env`:

```bash
VITE_PAGBANK_PUBLIC_KEY=sua_chave_publica_aqui
```

### 2. Obter a Chave Pública

1. Acesse sua conta do PagBank: https://minhaconta.pagseguro.uol.com.br/
2. Navegue até a seção de **Integrações** ou **API**
3. Gere ou copie sua **Chave Pública** (não confundir com o Token de autenticação)

### 3. SDK do PagBank

O SDK do PagBank já foi adicionado ao `index.html`:

```html
<script src="https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js"></script>
```

## 🔐 Como Funciona

### Criptografia no Frontend

1. O usuário preenche os dados do cartão no formulário
2. O SDK do PagBank (`PagSeguro.encryptCard()`) criptografa os dados localmente no navegador usando sua chave pública
3. Apenas o cartão **criptografado** é enviado para o backend
4. O PagBank descriptografa usando a chave privada (que só ele possui)

### Exemplo de Código

```typescript
const cardEncryption = window.PagSeguro.encryptCard({
  publicKey: import.meta.env.VITE_PAGBANK_PUBLIC_KEY,
  holder: "Nome do Titular",
  number: "4111111111111111",
  expMonth: "12",
  expYear: "2030",
  securityCode: "123"
});

if (!cardEncryption.hasErrors) {
  // Enviar cardEncryption.encryptedCard para o backend
  const encrypted = cardEncryption.encryptedCard;
}
```

## 📝 Possíveis Erros

| Código | Mensagem | Solução |
|--------|----------|---------|
| `INVALID_NUMBER` | Invalid card number | Verifique o número do cartão |
| `INVALID_SECURITY_CODE` | Invalid field securityCode | CVV deve ter 3 ou 4 dígitos |
| `INVALID_EXPIRATION_MONTH` | Invalid field expMonth | Mês deve ser entre 1 e 12 |
| `INVALID_EXPIRATION_YEAR` | Invalid field expYear | Ano deve ter 4 dígitos |
| `INVALID_PUBLIC_KEY` | Invalid publicKey | Verifique a chave pública no .env |
| `INVALID_HOLDER` | Invalid holder | Verifique o nome do titular |

## 🧪 Testar Criptografia

Para testar a criptografia sem fazer pagamentos reais, use os [cartões de teste do PagBank](https://dev.pagseguro.uol.com.br/reference/testing-cards).

## 📚 Documentação Oficial

- [Criar e pagar pedido com cartão](https://dev.pagseguro.uol.com.br/docs/criar-e-pagar-pedido-com-cartao)
- [SDK do PagBank](https://dev.pagseguro.uol.com.br/docs/sdk-checkout)

## ✅ Alterações Implementadas

1. ✅ SDK do PagBank adicionado ao `index.html`
2. ✅ Tipos TypeScript criados em `src/types/pagseguro.d.ts`
3. ✅ Interface `PagBankCard` atualizada para suportar cartão criptografado
4. ✅ Função `handleCardPayment` modificada para criptografar o cartão antes de enviar
5. ✅ Validação de erros de criptografia implementada

## 🔒 Benefícios

- ✅ Reduz o escopo PCI (compliance)
- ✅ Dados sensíveis nunca trafegam em texto claro
- ✅ Criptografia acontece localmente no navegador
- ✅ Nenhuma chamada ao servidor para criptografar
- ✅ Utiliza algoritmo RSA com chave pública

