# Frontend PagBank - Sistema de Testes

Este documento explica como usar o sistema de testes do PagBank integrado ao frontend.

## 🚀 Como Testar

### 1. Configuração do Backend

Primeiro, certifique-se de que o backend está rodando:

```bash
cd backend
npm install
npm start
```

O backend deve estar rodando em `http://localhost:3000`

### 2. Configuração da API Key

Configure a variável de ambiente no backend:

```bash
# No arquivo backend/.env
PAGBANK_API_KEY=seu_token_do_pagbank_aqui
```

### 3. Acessar o Formulário de Teste

1. Inicie o frontend:
   ```bash
   npm run dev
   ```

2. Acesse a página de teste:
   - **URL:** `http://localhost:5173/test-pagbank`
   - **Ou clique em:** "🧪 Teste PagBank" no header do site

### 4. Testar Pagamentos

#### Teste PIX:
1. Selecione "PIX" como método de pagamento
2. Preencha os dados do cliente
3. Configure o item a ser vendido
4. Clique em "💳 Gerar PIX"
5. O QR Code será exibido na resposta

#### Teste Cartão de Crédito:
1. Selecione "Cartão de Crédito" como método de pagamento
2. Preencha os dados do cliente
3. Configure o item a ser vendido
4. Preencha os dados do cartão de teste
5. Clique em "💳 Pagar com Cartão"
6. A transação será processada imediatamente

## 📋 Dados de Teste

### Cartão de Crédito de Teste:
- **Número:** 4111 1111 1111 1111
- **Mês:** 03
- **Ano:** 2026
- **CVV:** 123
- **Nome:** Jose da Silva
- **CPF:** 12345678909

### Cliente de Teste:
- **Nome:** Jose da Silva
- **Email:** jose@teste.com
- **CPF:** 12345678909
- **Telefone:** 11999999999

## 🔧 Estrutura do Código

### Componentes Principais:

1. **PagBankTestForm** (`src/components/PagBankTestForm.tsx`)
   - Formulário principal para testes
   - Suporte a PIX e cartão de crédito
   - Validação de dados
   - Exibição de resultados

2. **PagBankTestPage** (`src/pages/PagBankTestPage.tsx`)
   - Página que contém o formulário
   - Instruções de configuração
   - Informações sobre o ambiente de teste

### Serviços:

1. **PagBankService** (`src/services/pagbankService.ts`)
   - Cliente para comunicação com a API
   - Métodos para PIX e cartão
   - Formatação de dados

2. **usePagBankPayment** (`src/hooks/usePagBankPayment.ts`)
   - Hook personalizado para gerenciar estado
   - Loading, error e result states
   - Métodos de pagamento

### Configuração:

1. **PagBank Config** (`src/config/pagbank.ts`)
   - URLs da API
   - Dados de teste
   - Configurações de pagamento

## 📡 Endpoints Utilizados

### Backend (http://localhost:3000):
- `POST /api/payments` - Criar pedido
- `GET /api/payments/:orderId` - Consultar pedido
- `POST /api/payments/:orderId/cancel` - Cancelar pedido
- `POST /api/payments/generate-card-token` - Gerar token do cartão
- `POST /api/payments/webhook` - Webhook para notificações

### PagBank API:
- `POST https://sandbox.api.pagseguro.com/orders` - Criar pedido
- `GET https://sandbox.api.pagseguro.com/orders/:id` - Consultar pedido
- `POST https://sandbox.api.pagseguro.com/cards` - Criar token do cartão

## 🐛 Troubleshooting

### Erro: "Failed to fetch"
- Verifique se o backend está rodando na porta 3000
- Teste: `curl http://localhost:3000/`

### Erro: "PAGBANK_API_KEY ausente"
- Configure a variável de ambiente no backend
- Reinicie o servidor backend

### Erro: "CORS"
- O backend já está configurado com CORS
- Se persistir, verifique se está acessando via localhost

### PIX não gera QR Code
- Verifique se a API key está correta
- Verifique se está usando a URL de sandbox
- Verifique os logs do backend

## 📊 Exemplo de Resposta

### PIX:
```json
{
  "success": true,
  "id": "order_123",
  "status": "pending",
  "qr_codes": [
    {
      "qr_code": {
        "text": "00020126580014br.gov.bcb.pix...",
        "links": [
          {
            "href": "https://sandbox.api.pagseguro.com/qr-codes/..."
          }
        ]
      },
      "expiration_date": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Cartão:
```json
{
  "success": true,
  "id": "order_123",
  "status": "paid",
  "charges": [
    {
      "id": "charge_123",
      "status": "paid",
      "amount": {
        "value": 5000,
        "currency": "BRL"
      }
    }
  ]
}
```

## 🔄 Próximos Passos

1. Integrar com o sistema de ingressos existente
2. Adicionar validações mais robustas
3. Implementar webhook para notificações
4. Adicionar testes automatizados
5. Configurar ambiente de produção

## 📞 Suporte

Para dúvidas sobre a integração:
- Consulte a [documentação oficial do PagBank](https://docs.pagbank.com.br/)
- Verifique os logs do backend
- Teste os endpoints manualmente com curl
