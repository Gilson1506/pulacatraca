# Opções de Status para Eventos

## 🎯 **Opção 1: Eventos Aprovados Automaticamente (ATUAL)**
```typescript
status: 'approved', // Criar eventos já aprovados
```
**Resultado:** Eventos aparecem imediatamente como ativos/aprovados

## 🎯 **Opção 2: Eventos Pendentes de Aprovação**
```typescript
status: 'pending', // Criar eventos pendentes de aprovação
```
**Resultado:** Eventos precisam ser aprovados por um admin

## 🎯 **Opção 3: Sistema Baseado no Papel do Usuário**
```typescript
// No handleSubmitEvent, linha ~350
const userRole = await getCurrentUserRole(); // Implementar função
const eventStatus = userRole === 'admin' ? 'approved' : 'pending';

status: eventStatus,
```

## 🎯 **Opção 4: Remover Status de Rascunho Completamente**

### No filtro (linha ~380):
```typescript
<option value="approved">Aprovados</option>
<option value="pending">Aguardando Aprovação</option>
<option value="cancelled">Cancelados</option>
// Remover: <option value="draft">Rascunho</option>
```

### No getStatusColor (linha ~440):
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};
```

## 📝 **Recomendação:**
- **Para organizadores confiáveis**: Use `'approved'` (Opção 1)
- **Para sistema com moderação**: Use `'pending'` (Opção 2)
- **Para sistema multi-nível**: Use Opção 3 baseada no papel