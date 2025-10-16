# 🔍 INSTRUÇÕES FINAIS - Debug e Correção

## ✅ LOGS DE DEBUG ADICIONADOS!

O backend agora vai mostrar informações detalhadas para identificar o problema.

---

## 🚀 PASSO 1: CORRIGIR RLS NO SUPABASE

Execute o arquivo **`CORRIGIR_RLS_TICKETS.sql`** no Supabase:

1. Acesse: https://app.supabase.com/project/jasahjktswfmbakjluvy/sql
2. Copie TODO o conteúdo de `CORRIGIR_RLS_TICKETS.sql`
3. Cole e clique em **"RUN"**
4. Leia as mensagens de NOTICE

Isso vai permitir que o webhook crie tickets.

---

## 🚀 PASSO 2: REINICIAR BACKEND

```bash
cd "backend pagbank"
npm start
```

---

## 🧪 PASSO 3: CRIAR NOVO PEDIDO PIX E TESTAR

### **1. Criar pedido PIX**

No navegador, console deve mostrar:
```
✅ pagbank_order_id salvo: ORDE_...
✅ Transactions PIX inseridas: 1
```

### **2. Simular pagamento**

```powershell
$orderId = "ORDE_seu_id_aqui"
$token = "dbfdf701-ccb3-4b69-808c-c87cc97a8f62bd4e1c2e46a29daa59c5e23fa9bbb073a6da-03c0-48c6-a249-213a12d814b3"
Invoke-RestMethod -Method POST -Uri "https://sandbox.api.pagseguro.com/orders/$orderId/pay" -Headers @{"Authorization"="Bearer $token";"Content-Type"="application/json"} -Body '{}'
```

### **3. Ver logs detalhados do webhook**

**Backend agora vai mostrar:**

```
✅ PAGAMENTO APROVADO! ID: ORDE_...
💳 Método: PIX
🔑 Transaction ID: QRCO_...
💰 Valor total da ordem: R$ 45
✅ Order atualizado para paid: xxx

🔍 Buscando transactions pendentes para order_id: xxx
🔍 Transactions existentes: 1  ← Quantas encontrou
   - ID: yyy, Status: pending, Amount: R$ 40.00, PagBank ID: QRCO_...  ← Detalhes
   
✅ 1 transactions atualizadas para completed  ← Se funcionou
   - Atualizada: ID yyy, Amount: R$ 40.00
   
✅ 1 tickets gerados automaticamente pelo webhook!  ← Se funcionou
```

---

## 🔍 SE DER ERRO:

### **Erro 1: `✅ 0 transactions atualizadas`**

Significa que não encontrou transactions com:
- `order_id` = correto
- `status` = 'pending'

**Causas possíveis:**
- Transaction não foi criada
- Transaction já está como 'completed'
- order_id diferente

**Solução:** Me envie os logs completos que mostram "Transactions existentes"

---

### **Erro 2: `❌ new row violates row-level security policy for table "tickets"`**

Significa que a policy RLS ainda está bloqueando.

**Solução:** Execute o SQL `CORRIGIR_RLS_TICKETS.sql` no Supabase

---

## 📋 CHECKLIST:

- [ ] Executar `CORRIGIR_RLS_TICKETS.sql` no Supabase
- [ ] Reiniciar backend
- [ ] Criar novo pedido PIX
- [ ] Simular pagamento
- [ ] Ver logs detalhados no backend
- [ ] Me enviar logs completos se tiver problema

---

**Execute o SQL primeiro, depois reinicie o backend e teste! Os logs vão mostrar exatamente o que está acontecendo. 🔍**

