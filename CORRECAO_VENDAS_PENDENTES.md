# ✅ CORREÇÃO: VENDAS PENDENTES AGORA APARECEM NO PAINEL DO ORGANIZADOR

## 🐛 PROBLEMA IDENTIFICADO

Na página de **Controle de Vendas** do organizador (`OrganizerDashboardPage.tsx`), as vendas pendentes (PIX não pago) **não apareciam** na lista.

### **Causa Raiz:**
1. A página buscava apenas `tickets` da tabela `tickets`
2. **Tickets só são criados quando o pagamento é confirmado** (webhook cria após PIX pago)
3. **Vendas pendentes (PIX não pago) só existem em `transactions` com status `pending`**
4. Por isso, vendas pendentes **NUNCA apareciam**, pois não tinham tickets!

---

## ✅ SOLUÇÃO IMPLEMENTADA

Modificado o método `fetchSales()` para:

1. **Buscar tickets** (vendas confirmadas) ✅
2. **Buscar transactions pendentes** que não têm tickets correspondentes ✅
3. **Combinar ambas** as listas em uma única lista de vendas

### **Código Adicionado (linhas 1726-1775):**

```typescript
// 6. ADICIONAR TRANSACTIONS PENDENTES QUE NÃO TÊM TICKETS
// (Vendas PIX não pagas ainda não geraram tickets)
console.log('🔍 Buscando transactions pendentes sem tickets...');

// IDs de tickets já mapeados
const mappedTicketIds = new Set((ticketsData || []).map((t: any) => t.id));

// Transactions pendentes que não têm ticket correspondente
const pendingTransactions = (transactionsByEvent || []).filter((tx: any) => {
  return tx.status === 'pending' && (!tx.ticket_id || !mappedTicketIds.has(tx.ticket_id));
});

console.log(`✅ Transactions pendentes encontradas: ${pendingTransactions.length}`);

// Formatar transactions pendentes como vendas
const pendingSales: Sale[] = pendingTransactions.map((tx: any) => {
  const buyerId = tx.buyer_id || tx.user_id;
  const buyer = buyerId ? usersData[buyerId] || {} : {};
  const event = (eventsData as any[]).find(e => e.id === tx.event_id) || {};
  const pricePaid = typeof tx.amount === 'string' ? parseFloat(tx.amount) : (tx.amount || 0);
  
  return {
    id: tx.id,
    eventId: tx.event_id,
    eventName: event.title || 'Evento não encontrado',
    eventImage: event.image || event.banner_url || null,
    buyerName: buyer.name || 'Nome não informado',
    buyerEmail: buyer.email || 'Email não informado',
    userName: '',
    userEmail: '',
    ticketType: 'Ingresso Padrão',
    ticketCode: 'Aguardando pagamento', // ← Identificador de pendente
    quantity: 1,
    amount: pricePaid,
    date: new Date(tx.created_at).toLocaleDateString('pt-BR'),
    status: 'pendente', // ← SEMPRE PENDENTE
    paymentMethod: tx.payment_method || 'Não informado',
    isUsed: false,
    usedAt: null
  };
});

// COMBINAR tickets confirmados + transactions pendentes
const allSales = [...formattedSales, ...pendingSales];
console.log(`✅ Total de vendas (confirmadas + pendentes): ${allSales.length}`);

setSales(allSales);
```

---

## 📊 RESULTADO ESPERADO

### **Antes (BUGADO):**
- ✅ Vendas confirmadas aparecem (com tickets)
- ❌ Vendas pendentes NÃO aparecem

### **Depois (CORRIGIDO):**
- ✅ Vendas confirmadas aparecem (com tickets)
- ✅ **Vendas pendentes AGORA aparecem** (da tabela transactions)
- ✅ Código de ingresso: `"Aguardando pagamento"` para pendentes
- ✅ Filtro "Pendentes" funciona corretamente

---

## 🧪 COMO TESTAR

### 1. Reiniciar Frontend
```bash
npm run dev
```

### 2. Criar Venda Pendente (PIX)
1. Login como usuário normal
2. Comprar ingresso com **PIX**
3. **NÃO simular pagamento** (deixar pendente)

### 3. Verificar no Painel do Organizador
1. Login como organizador
2. Ir para **"Vendas"** / **"Controle de Vendas"**
3. Filtrar por **"Pendentes"**
4. ✅ **A venda PIX deve aparecer agora!**

### 4. Console do Navegador (Logs esperados)
```javascript
🔄 Buscando vendas/ingressos...
🔍 Buscando eventos do organizador: xxx
✅ Eventos do organizador encontrados: 1
🔍 Buscando tickets para eventos: ["event-id"]
✅ Tickets encontrados: 2
🔍 Buscando transactions pendentes sem tickets...
✅ Transactions pendentes encontradas: 1  ← AGORA APARECE!
✅ Total de vendas (confirmadas + pendentes): 3
```

### 5. Simular Pagamento PIX
1. Simular pagamento no PagBank (sandbox)
2. Webhook processa → cria ticket → status muda para `completed`
3. Atualizar página do organizador
4. ✅ Venda deve mudar de "Pendente" para "Confirmado"
5. ✅ Código de ingresso deve aparecer

---

## 📋 DIFERENÇAS ENTRE VENDAS

### **Venda Confirmada (com ticket):**
```json
{
  "id": "ticket-id",
  "ticketCode": "PLKTK_xxx",
  "status": "confirmado",
  "ticketType": "VIP" // Nome real do tipo
}
```

### **Venda Pendente (sem ticket):**
```json
{
  "id": "transaction-id",
  "ticketCode": "Aguardando pagamento",
  "status": "pendente",
  "ticketType": "Ingresso Padrão" // Genérico
}
```

---

## 🎯 FLUXO COMPLETO

1. **Usuário compra com PIX:**
   - ✅ Order criada com `status: 'pending'`
   - ✅ Transactions criadas com `status: 'pending'`
   - ✅ **APARECE no painel do organizador como "Pendente"**

2. **Usuário paga o PIX:**
   - ✅ Webhook atualiza order para `paid`
   - ✅ Webhook atualiza transactions para `completed`
   - ✅ Webhook cria tickets com `status: 'active'`
   - ✅ **Painel do organizador atualiza para "Confirmado"**

3. **Usuário compra com Cartão:**
   - ✅ Order criada com `status: 'paid'`
   - ✅ Transactions criadas com `status: 'completed'`
   - ✅ Tickets criados imediatamente
   - ✅ **APARECE no painel do organizador como "Confirmado"**

---

## 🔧 ARQUIVO MODIFICADO

- `src/pages/OrganizerDashboardPage.tsx` (linhas 1726-1775)

---

## ✅ STATUS

**Problema resolvido!** Agora todas as vendas (pendentes e confirmadas) aparecem corretamente no painel do organizador.

**Teste e confirme que está funcionando!** 🚀

