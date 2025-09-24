# CORREÇÕES NECESSÁRIAS NO FRONTEND

## Problemas Identificados

### 1. **Mapeamento Incorreto de Campos**

O frontend está enviando campos com nomes diferentes dos que o banco espera:

| Frontend Envia | Banco Espera | Problema |
|----------------|---------------|----------|
| `name` | `title` | ❌ Campo incorreto |
| `date` | `start_date` | ❌ Campo incorreto |
| `time` | `start_time` | ❌ Campo incorreto |
| `endDate` | `end_date` | ❌ Campo incorreto |
| `endTime` | `end_time` | ❌ Campo incorreto |
| `location` | `location` | ✅ Correto |
| `description` | `description` | ✅ Correto |
| `category` | `category` | ✅ Correto |

### 2. **Campos Obrigatórios Não Sendo Preenchidos**

- `description`: Deve ter valor padrão se não informado
- `location`: Deve ter valor padrão se não informado  
- `price`: Deve ser 0 se não informado
- `category`: Deve ter valor padrão se não informado
- `status`: Deve ser 'pending' se não informado

### 3. **Campos Adicionais Não Sendo Preenchidos**

- `location_city`, `location_state`, `location_type`
- `classification`, `subject`, `subcategory`
- `important_info`, `attractions`, `tags`
- `ticket_type`, `available_tickets`, `total_tickets`

## Soluções Implementadas

### 1. **Correção no EventFormModal.tsx**

```typescript
// ANTES (INCORRETO)
const payload = {
  name: formData.title.trim(),           // ❌ Deveria ser 'title'
  date: formData.start_date,             // ❌ Deveria ser 'start_date'
  time: formData.start_time,             // ❌ Deveria ser 'start_time'
  endDate: formData.end_date,            // ❌ Deveria ser 'end_date'
  endTime: formData.end_time,            // ❌ Deveria ser 'end_time'
  // ... outros campos
};

// DEPOIS (CORRETO)
const payload = {
  title: formData.title.trim(),          // ✅ Campo correto
  start_date: formData.start_date,       // ✅ Campo correto
  start_time: formData.start_time,       // ✅ Campo correto
  end_date: formData.end_date,           // ✅ Campo correto
  end_time: formData.end_time,           // ✅ Campo correto
  // ... outros campos
};
```

### 2. **Correção no OrganizerDashboardPage.tsx**

```typescript
// ANTES (INCORRETO)
const { data: event, error: eventError } = await supabase
  .from('events')
  .insert({
    title: eventData.name,               // ❌ Deveria ser eventData.title
    start_date: `${eventData.date}T${eventData.time}:00`,  // ❌ Campos incorretos
    end_date: `${eventData.endDate}T${eventData.endTime}:00`, // ❌ Campos incorretos
    // ... outros campos
  });

// DEPOIS (CORRETO)
const { data: event, error: eventError } = await supabase
  .from('events')
  .insert({
    title: eventData.title,              // ✅ Campo correto
    start_date: `${eventData.start_date}T${eventData.start_time}:00`, // ✅ Campos corretos
    end_date: `${eventData.end_date}T${eventData.end_time}:00`,       // ✅ Campos corretos
    // ... outros campos
  });
```

### 3. **Correção na Interface Event**

```typescript
// ANTES (INCORRETO)
interface Event {
  name: string;                          // ❌ Deveria ser 'title'
  date: string;                          // ❌ Deveria ser 'start_date'
  time: string;                          // ❌ Deveria ser 'start_time'
  endDate: string;                       // ❌ Deveria ser 'end_date'
  endTime: string;                       // ❌ Deveria ser 'end_time'
  // ... outros campos
}

// DEPOIS (CORRETO)
interface Event {
  title: string;                         // ✅ Campo correto
  start_date: string;                    // ✅ Campo correto
  start_time: string;                    // ✅ Campo correto
  end_date: string;                      // ✅ Campo correto
  end_time: string;                      // ✅ Campo correto
  // ... outros campos
}
```

### 4. **Valores Padrão para Campos Obrigatórios**

```typescript
const eventData = {
  // Campos obrigatórios com valores padrão
  title: formData.title.trim() || 'Evento sem título',
  description: formData.description || 'Descrição não disponível',
  location: formData.location_name || formData.location_address || 'Local não informado',
  price: formData.tickets.length > 0 ? Math.min(...formData.tickets.map(t => t.price || 0)) : 0,
  category: formData.category || 'evento',
  status: 'pending',
  
  // Campos de localização com valores padrão
  location_city: formData.location_city || 'Cidade não informada',
  location_state: formData.location_state || 'Estado não informado',
  location_type: formData.location_type || 'physical',
  
  // Campos de classificação com valores padrão
  classification: formData.classification || 'Livre',
  subject: formData.subject || 'Evento',
  subcategory: formData.subcategory || formData.category,
  
  // Campos de arrays com valores padrão
  important_info: formData.important_info?.length > 0 
    ? formData.important_info.filter(info => info.trim() !== '')
    : ['Chegue com antecedência', 'Documento obrigatório'],
  attractions: formData.attractions?.length > 0
    ? formData.attractions.filter(a => a.trim() !== '')
    : ['Programação especial'],
    
  // ... outros campos
};
```

## Arquivos que Precisam ser Corrigidos

1. **src/components/EventFormModal.tsx**
   - Linha ~620: Correção do payload
   - Linha ~650: Correção dos dados do evento

2. **src/pages/OrganizerDashboardPage.tsx**
   - Linha ~560: Correção do mapeamento de eventos
   - Linha ~620: Correção da inserção de eventos

3. **src/pages/OrganizerDashboardPage.tsx.backup**
   - Mesmas correções do arquivo principal

4. **Interfaces TypeScript**
   - Todas as interfaces que usam nomes de campos incorretos

## Passos para Implementar as Correções

1. **Execute o script SQL** `fix_rls_permissions.sql` para corrigir dados existentes
2. **Corrija o mapeamento de campos** no frontend
3. **Atualize as interfaces** TypeScript
4. **Teste a criação/edição** de eventos
5. **Verifique se os campos** não estão mais sendo salvos como NULL

## Verificação Final

Após as correções, execute esta query para verificar se os problemas foram resolvidos:

```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as with_description,
  COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as with_location,
  COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as with_price,
  COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as with_category
FROM events;
```

Se todos os campos retornarem o mesmo número, significa que não há mais campos NULL em campos obrigatórios.
