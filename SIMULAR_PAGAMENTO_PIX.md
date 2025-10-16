# 💳 Como Simular Pagamento PIX no Sandbox PagBank

## 📋 PEDIDO MAIS RECENTE:

**Order ID:** `ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84`  
**Valor:** R$ 393,75 (39375 centavos)  
**QR Code ID:** `QRCO_2BF30D2C-5B05-4910-A319-EF333817AD95`

---

## 🎯 SIMULAR PAGAMENTO NO SANDBOX:

O PagBank Sandbox permite simular pagamentos PIX. Existem algumas formas:

### **Opção 1: API de Teste (Recomendado)**

Execute este comando no PowerShell:

```powershell
$orderId = "ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84"
$token = "dbfdf701-ccb3-4b69-808c-c87cc97a8f62bd4e1c2e46a29daa59c5e23fa9bbb073a6da-03c0-48c6-a249-213a12d814b3"

Invoke-RestMethod -Method POST `
  -Uri "https://sandbox.api.pagseguro.com/orders/$orderId/pay" `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body '{"payment_method": {"type": "PIX"}}' | ConvertTo-Json -Depth 10
```

---

### **Opção 2: Consultar o Pedido Atual**

Para ver o status atual do pedido:

```powershell
$orderId = "ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84"
$token = "dbfdf701-ccb3-4b69-808c-c87cc97a8f62bd4e1c2e46a29daa59c5e23fa9bbb073a6da-03c0-48c6-a249-213a12d814b3"

Invoke-RestMethod -Method GET `
  -Uri "https://sandbox.api.pagseguro.com/orders/$orderId" `
  -Headers @{
    "Authorization" = "Bearer $token"
  } | ConvertTo-Json -Depth 10
```

---

### **Opção 3: Painel do PagBank Sandbox**

1. Acesse: https://sandbox.pagseguro.uol.com.br/
2. Faça login
3. Vá em **Transações** ou **Pedidos**
4. Procure pelo pedido: `ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84`
5. Clique em **"Simular Pagamento"** ou **"Pagar"**

---

### **Opção 4: Usar o QR Code de Teste**

No ambiente sandbox, você pode escanear o QR Code e será redirecionado para uma tela de simulação automática.

---

## 🔍 VERIFICAR SE O WEBHOOK FUNCIONA:

Após simular o pagamento, você deve ver no **backend**:

```
🔔 Webhook PagBank recebido: {
  "id": "ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84",
  ...
}
📦 Processando webhook para Order: ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84, Status: PAID
✅ PAGAMENTO APROVADO! ID: ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84
💰 Valor: R$ 393.75  ← CORRETO!
💳 Método: PIX
👤 Cliente: Domingas Denny
✅ Order atualizado para paid: [uuid]
✅ Transaction atualizada para completed
```

E no **frontend** você deve ter visto:
```
✅ pagbank_order_id salvo: ORDE_14AE5AFD-FDA2-4B45-97AC-E6AE70807F84
```

Se isso apareceu, o pedido está vinculado corretamente e o webhook vai funcionar!

---

## ⚠️ SE NÃO SALVOU O `pagbank_order_id`:

Verifique no console do **navegador** (F12) se apareceu algum erro ao salvar.

Possíveis causas:
1. **Policy RLS bloqueando:** Usuário não tem permissão para UPDATE
2. **Coluna não existe:** Tabela `orders` não tem a coluna `pagbank_order_id`
3. **Sessão expirada:** Usuário não está mais autenticado

---

**Você viu a mensagem `✅ pagbank_order_id salvo` no console do navegador quando criou o pedido de R$ 393,75?**

