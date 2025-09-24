# 🐛 DEBUG: Salvamento de Tipos de Ingressos

## 🎯 Problema Identificado

Os tipos de ingressos não estavam sendo salvos porque:

1. **EventFormModal** estava inserindo na tabela `tickets` (errada)
2. **formData.tickets** estava vazio por padrão
3. **Mapeamento de campos** estava incorreto

## ✅ Correções Aplicadas

### **1. Tabela Corrigida:**
```javascript
// ANTES (Errado):
await supabase.from('tickets').insert(ticketsData);

// DEPOIS (Correto):
await supabase.from('event_ticket_types').insert(ticketsData);
```

### **2. Ticket Padrão Adicionado:**
```javascript
// ANTES: tickets: []
// DEPOIS: tickets: [{ id: 'ticket_default', title: 'Ingresso Geral', ... }]
```

### **3. Mapeamento de Campos Corrigido:**
```javascript
const ticketsData = formData.tickets.map(ticket => ({
  event_id: event.id,
  title: ticket.title,           // ✅ Título
  name: ticket.title,            // ✅ Nome
  price: ticket.price,           // ✅ Preço base
  price_masculine: ticket.price, // ✅ Preço masculino
  price_feminine: ticket.price_feminine || ticket.price * 0.9, // ✅ Preço feminino
  area: ticket.area || 'Pista',  // ✅ Área
  quantity: ticket.quantity,     // ✅ Quantidade
  available_quantity: ticket.quantity, // ✅ Disponível
  // ... outros campos
}));
```

### **4. Logs de Debug Adicionados:**
```javascript
console.log('🎫 EventFormModal - handleSubmit iniciado');
console.log('🎫 EventFormModal - formData completo:', formData);
console.log('🎫 EventFormModal - Tickets no formData:', formData.tickets);
console.log('🎫 EventFormModal - Dados dos tickets para inserir:', ticketsData);
console.log('✅ EventFormModal - Ingressos criados com sucesso:', insertedTickets);
```

## 🚀 Como Testar

### **1. Criar Evento:**
1. Dashboard do Organizador → Criar Evento
2. Preencha as 4 primeiras seções
3. **Seção 5 - Ingressos:**
   - Deve aparecer "Ingresso Geral" por padrão
   - Modifique nome, preço, quantidade
   - Adicione mais tipos se necessário
4. Finalize o evento

### **2. Verificar Logs no Console:**
Abra o Console do navegador (F12) e deve ver:
```
🎫 EventFormModal - handleSubmit iniciado
🎫 EventFormModal - formData completo: {title: "...", tickets: [...]}
🎫 EventFormModal - Tickets no formData: [{title: "Ingresso VIP", ...}]
🎫 EventFormModal - Dados dos tickets para inserir: [{event_id: "...", title: "Ingresso VIP", ...}]
✅ EventFormModal - Ingressos criados com sucesso: [{id: "...", title: "Ingresso VIP", ...}]
```

### **3. Verificar no Banco:**
```sql
-- Verificar último evento
SELECT id, title, created_at FROM events ORDER BY created_at DESC LIMIT 1;

-- Verificar tipos de ingressos do último evento
SELECT 
    title, name, area, price, price_masculine, price_feminine, 
    quantity, available_quantity, status
FROM event_ticket_types 
WHERE event_id = 'SEU_EVENT_ID'
ORDER BY created_at DESC;
```

### **4. Verificar na Página do Evento:**
- Acesse a página do evento
- Clique em "Comprar Ingresso"
- Deve mostrar os tipos de ingressos criados

## ⚠️ Possíveis Problemas

### **1. Logs não aparecem:**
- Verifique se está na seção 5 (Ingressos)
- Confirme se preencheu título e preço

### **2. Erro de inserção:**
- Verifique permissões RLS
- Confirme se campos obrigatórios estão preenchidos

### **3. Tickets não aparecem na página:**
- Verifique se evento foi aprovado
- Confirme se EventPage está buscando da tabela correta

## 📊 Resultado Esperado

### **No Console:**
```
🎫 EventFormModal - Tickets no formData: [
  {
    id: "ticket_default",
    title: "Ingresso VIP",
    price: 100,
    quantity: 50,
    area: "Camarote"
  }
]
```

### **No Banco:**
```sql
INSERT INTO event_ticket_types (
    event_id, title, name, area, price, 
    price_masculine, price_feminine, quantity, 
    available_quantity, status
) VALUES (
    'uuid', 'Ingresso VIP', 'Ingresso VIP', 'Camarote',
    100.00, 100.00, 90.00, 50, 50, 'active'
);
```

### **Na Página do Evento:**
```
🎫 Ingresso VIP
   📍 Camarote
   💰 Masc: R$ 100,00 | Fem: R$ 90,00
   🎯 50 disponíveis
```

---

**Status:** ✅ Corrigido  
**Teste:** Pendente  
**Próximo:** Verificar funcionamento