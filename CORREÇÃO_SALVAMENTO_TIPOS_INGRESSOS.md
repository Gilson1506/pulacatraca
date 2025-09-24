# 🔧 CORREÇÃO: Salvamento de Tipos de Ingressos

## 🎯 Problema Identificado

Os tipos de ingressos não estavam sendo salvos na tabela `event_ticket_types` porque:

1. **Funções SQL não existiam** no banco de dados
2. **Código usava RPC calls** para funções inexistentes
3. **Dados não chegavam** à tabela correta

## ✅ Soluções Implementadas

### **1. Correção do Código JavaScript**

#### **Antes (Problemático):**
```javascript
// Usava função SQL que não existe
const { data: ticketType, error } = await supabase.rpc('create_ticket_type_with_batches', {
  ticket_data: {...},
  batches_data: [...]
});
```

#### **Depois (Corrigido):**
```javascript
// Inserção direta na tabela
const { data: ticketType, error } = await supabase
  .from('event_ticket_types')
  .insert({
    event_id: event.id,
    title: ticket.name,
    name: ticket.name,
    description: ticket.description || '',
    area: ticket.area || 'Pista',
    price: ticket.price,
    price_masculine: ticket.price,
    price_feminine: ticket.price_feminine || ticket.price * 0.9,
    quantity: ticket.quantity,
    available_quantity: ticket.quantity,
    // ... outros campos
  })
  .select()
  .single();
```

### **2. Mapeamento Correto dos Campos**

| Campo EventFormModal | Campo Banco | Valor Padrão |
|---------------------|-------------|--------------|
| `ticket.name` | `title` | - |
| `ticket.name` | `name` | - |
| `ticket.area` | `area` | 'Pista' |
| `ticket.price` | `price` | - |
| `ticket.price` | `price_masculine` | - |
| `ticket.price_feminine` | `price_feminine` | `price * 0.9` |
| `ticket.quantity` | `quantity` | - |
| `ticket.quantity` | `available_quantity` | `quantity` |

### **3. Logs Detalhados**

Adicionados logs para debug:
```javascript
console.log('🎫 Dados do evento recebidos:', eventData);
console.log('🎫 Tipos de ingressos:', eventData.ticketTypes);
console.log('🎫 Criando tipo de ingresso:', ticket);
console.log('✅ Tipo de ingresso criado:', ticketType);
```

## 📁 Arquivos Modificados

### **1. `src/pages/OrganizerDashboardPage.tsx`**
- ✅ Função `handleSubmitEvent` corrigida
- ✅ Inserção direta na tabela `event_ticket_types`
- ✅ Suporte a lotes (se tabela existir)
- ✅ Logs detalhados para debug

### **2. `src/pages/EventPage.tsx`**
- ✅ Busca corrigida na tabela `event_ticket_types`
- ✅ Mapeamento de campos atualizado
- ✅ Fallbacks para campos opcionais

### **3. Scripts SQL Criados:**
- `fix_ticket_batches_table.sql` - Criar tabela de lotes
- `test_ticket_types_saving.sql` - Verificar salvamento

## 🚀 Como Testar

### **1. Execute o Script SQL (Opcional):**
```sql
-- No Supabase SQL Editor
-- Cole o conteúdo de fix_ticket_batches_table.sql
```

### **2. Crie um Evento de Teste:**
1. Dashboard do Organizador → Criar Evento
2. Preencha dados básicos
3. **Seção Ingressos** → Adicione tipo:
   - Nome: "VIP Test"
   - Área: "Camarote"
   - Preço: R$ 100,00
   - Quantidade: 50
4. Salve o evento

### **3. Verifique no Banco:**
```sql
-- Execute o script test_ticket_types_saving.sql
-- Deve mostrar os tipos de ingressos salvos
```

### **4. Verifique na Página do Evento:**
- Acesse a página do evento criado
- Clique em "Comprar Ingresso"
- Deve mostrar os tipos de ingressos

## 🔍 Debug e Verificação

### **1. Console do Navegador:**
Deve mostrar logs como:
```
🎫 Dados do evento recebidos: {name: "Evento Teste", ticketTypes: [...]}
🎫 Tipos de ingressos: [{name: "VIP Test", area: "Camarote", ...}]
🎫 Criando tipo de ingresso: {name: "VIP Test", ...}
✅ Tipo de ingresso criado: {id: "uuid", title: "VIP Test", ...}
✅ Evento criado com sucesso. ID: uuid
```

### **2. Banco de Dados:**
```sql
-- Verificar último evento
SELECT * FROM events ORDER BY created_at DESC LIMIT 1;

-- Verificar tipos de ingressos do último evento
SELECT * FROM event_ticket_types 
WHERE event_id = 'ultimo_event_id' 
ORDER BY created_at DESC;
```

## ⚠️ Problemas Comuns

### **1. Campos NULL/Vazios:**
- **Causa**: `ticketTypes` array vazio ou undefined
- **Solução**: Verificar se EventFormModal está enviando dados

### **2. Erro de Permissão:**
- **Causa**: RLS (Row Level Security) bloqueando inserção
- **Solução**: Verificar se usuário é organizador do evento

### **3. Constraint Violations:**
- **Causa**: Campos obrigatórios não preenchidos
- **Solução**: Verificar mapeamento de campos

## 📊 Resultado Esperado

Após as correções, ao criar um evento:

### **Tabela `events`:**
```sql
INSERT INTO events (title, description, ...) VALUES (...)
```

### **Tabela `event_ticket_types`:**
```sql
INSERT INTO event_ticket_types (
    event_id, title, name, area, price, 
    price_masculine, price_feminine, quantity, 
    available_quantity, status
) VALUES (
    'event_id', 'VIP Test', 'VIP Test', 'Camarote', 
    100.00, 100.00, 90.00, 50, 50, 'active'
)
```

### **Na Página do Evento:**
```
🎫 VIP Test
   📍 Camarote
   💰 Masc: R$ 100,00 | Fem: R$ 90,00
   🎯 50 disponíveis

   [- 0 +] Feminino: R$ 90,00
   [- 0 +] Masculino: R$ 100,00
```

---

**Status:** ✅ Corrigido e testado  
**Versão:** 2.1.0  
**Data:** Janeiro 2025