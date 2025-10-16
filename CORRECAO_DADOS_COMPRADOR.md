# ✅ CORREÇÃO: DADOS DO COMPRADOR AGORA APARECEM NAS VENDAS PENDENTES

## 🐛 PROBLEMA IDENTIFICADO

Nas vendas pendentes, os dados do comprador apareciam como:
- ❌ **Nome:** `Nome não informado`
- ❌ **Email:** `Email não informado`

### **Causa Raiz:**
A busca de perfis de usuários (linha 1637-1661) só incluía IDs relacionados a **tickets**, mas não incluía os IDs das **transactions pendentes** que foram adicionadas posteriormente no código.

**Resultado:** Perfis dos compradores de vendas pendentes não eram buscados, então apareciam como "não informado".

---

## ✅ SOLUÇÃO IMPLEMENTADA

Modificado a coleta de `userIds` para incluir **TODAS as transactions do evento** (incluindo pendentes):

### **Código Adicionado (linhas 1644-1646):**

```typescript
// 4. Buscar dados dos usuários separadamente (compradores)
const userIds = [...new Set([
  ...((ticketsData || []).map((t: any) => t.buyer_id).filter(Boolean)),
  ...((ticketsData || []).map((t: any) => txById[t.transaction_id]?.buyer_id).filter(Boolean)),
  ...((ticketsData || []).map((t: any) => txById[t.transaction_id]?.user_id).filter(Boolean)),
  ...((ticketsData || []).map((t: any) => txByTicketId[t.id]?.buyer_id).filter(Boolean)),
  ...((ticketsData || []).map((t: any) => txByTicketId[t.id]?.user_id).filter(Boolean)),
  ...((ticketsData || []).map((t: any) => t.user_id).filter(Boolean)),
  
  // ✅ NOVO: INCLUIR user_ids e buyer_ids de TODAS as transactions (incluindo pendentes)
  ...((transactionsByEvent || []).map((tx: any) => tx.buyer_id).filter(Boolean)),
  ...((transactionsByEvent || []).map((tx: any) => tx.user_id).filter(Boolean)),
  
  // incluir buyer_id de fallback por correlação
  ...
])];
```

---

## 📊 RESULTADO ESPERADO

### **Antes (BUGADO):**
```
Venda Pendente:
- Nome: Nome não informado  ❌
- Email: Email não informado  ❌
- Status: Pendente
```

### **Depois (CORRIGIDO):**
```
Venda Pendente:
- Nome: João Silva  ✅
- Email: joao@email.com  ✅
- Status: Pendente
```

---

## 🧪 COMO TESTAR

### 1. Reiniciar Frontend
```bash
npm run dev
```

### 2. Limpar Cache do Navegador
- Abrir em **modo anônimo** (`Ctrl+Shift+N`)
- Ou limpar cache (`Ctrl+Shift+Delete`)

### 3. Criar Venda Pendente (PIX)
1. Login como usuário normal (ex: João Silva)
2. Comprar ingresso com **PIX**
3. **NÃO pagar** (deixar pendente)

### 4. Verificar no Painel do Organizador
1. Login como organizador
2. Ir para **"Vendas"**
3. Filtrar por **"Pendentes"**
4. ✅ **Deve mostrar nome e email do comprador!**

---

## 📋 LOGS ESPERADOS NO CONSOLE

```javascript
🔄 Buscando vendas/ingressos...
✅ Eventos do organizador encontrados: 1
✅ Tickets encontrados: 2
🔍 Buscando perfis de 3 usuários únicos...  ← AGORA INCLUI PENDENTES
✅ Perfis encontrados: 3  ← TODOS OS PERFIS ENCONTRADOS
🔍 Buscando transactions pendentes sem tickets...
✅ Transactions pendentes encontradas: 1
✅ Total de vendas (confirmadas + pendentes): 3
```

---

## 🔧 FLUXO DE BUSCA DE DADOS

### **1. Buscar Tickets (vendas confirmadas)**
```sql
SELECT * FROM tickets WHERE event_id IN (eventos do organizador)
```

### **2. Buscar Transactions (todas - confirmadas + pendentes)**
```sql
SELECT * FROM transactions 
WHERE event_id IN (eventos do organizador) 
AND status IN ('completed', 'pending')
```

### **3. Coletar IDs de Usuários**
- IDs de tickets
- IDs de transactions vinculadas a tickets
- **✅ NOVO: IDs de TODAS as transactions** (incluindo pendentes)

### **4. Buscar Perfis**
```sql
SELECT id, name, email, phone 
FROM profiles 
WHERE id IN (todos os IDs coletados)
```

### **5. Mapear Vendas**
- Tickets → Vendas confirmadas (com perfil)
- Transactions pendentes → Vendas pendentes (com perfil) ✅

---

## 📋 DIFERENÇAS ENTRE VENDAS

### **Venda Confirmada (com ticket):**
```json
{
  "id": "ticket-id",
  "buyerName": "João Silva",
  "buyerEmail": "joao@email.com",
  "ticketCode": "PLKTK_xxx",
  "status": "confirmado",
  "ticketType": "VIP"
}
```

### **Venda Pendente (sem ticket, MAS COM DADOS):**
```json
{
  "id": "transaction-id",
  "buyerName": "João Silva",  ← ✅ AGORA APARECE!
  "buyerEmail": "joao@email.com",  ← ✅ AGORA APARECE!
  "ticketCode": "Aguardando pagamento",
  "status": "pendente",
  "ticketType": "Ingresso Padrão"
}
```

---

## 🎯 ORDEM DE EXECUÇÃO NO CÓDIGO

```typescript
// 1. Buscar eventos do organizador
const eventsData = await supabase.from('events')...

// 2. Buscar tickets (confirmados)
const ticketsData = await supabase.from('tickets')...

// 3. Buscar transactions (confirmadas + pendentes)
const transactionsByEvent = await supabase.from('transactions')
  .in('event_id', eventIds)
  .in('status', ['completed', 'pending']);  ← TODAS!

// 4. Coletar IDs de usuários (tickets + transactions) ← CORRIGIDO!
const userIds = [
  ...tickets IDs,
  ...transactionsByEvent.buyer_id,  ← ✅ NOVO!
  ...transactionsByEvent.user_id    ← ✅ NOVO!
];

// 5. Buscar perfis
const profiles = await supabase.from('profiles').in('id', userIds);

// 6. Formatar vendas confirmadas (tickets)
const formattedSales = ticketsData.map(ticket => ...)

// 7. Adicionar vendas pendentes (transactions sem tickets)
const pendingSales = transactionsByEvent
  .filter(tx => tx.status === 'pending')
  .map(tx => {
    const buyer = usersData[tx.buyer_id || tx.user_id];  ← ✅ AGORA ENCONTRA!
    return { buyerName: buyer.name, ... }
  });

// 8. Combinar tudo
setSales([...formattedSales, ...pendingSales]);
```

---

## 🔧 ARQUIVO MODIFICADO

- `src/pages/OrganizerDashboardPage.tsx` (linhas 1644-1646 e 1665-1673)

---

## ✅ STATUS

**Problema resolvido!** Agora os dados do comprador aparecem corretamente em:
- ✅ Vendas confirmadas (tickets)
- ✅ **Vendas pendentes (transactions)** ← CORRIGIDO!

**Teste e confirme que nome e email aparecem corretamente!** 🚀

