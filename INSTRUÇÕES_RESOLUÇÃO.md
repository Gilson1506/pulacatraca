# INSTRUÇÕES COMPLETAS PARA RESOLVER O PROBLEMA DOS EVENTOS

## 🚨 **PROBLEMA ATUAL**

O erro ainda está ocorrendo porque:
1. **Campo `end_date` ainda é NOT NULL** na tabela
2. **Campos obrigatórios não estão sendo preenchidos** corretamente
3. **Valores `undefined` estão sendo enviados** para o banco

### **Erro Atual:**
```
{code: '22007', message: 'invalid input syntax for type timestamp with time zone: "undefinedT00:00:00"'}
```

## 🔧 **SOLUÇÃO COMPLETA**

### **PASSO 1: EXECUTAR SCRIPT SQL (OBRIGATÓRIO)**

**⚠️ PROBLEMA DE PERMISSÃO IDENTIFICADO:**

O erro `"Você não tem permissão para editar este evento"` indica que há **RLS (Row Level Security)** ativo na tabela.

**SOLUÇÕES DISPONÍVEIS:**

#### **OPÇÃO 1: Script Simples (Recomendado)**
Execute este script **diretamente no Supabase SQL Editor**:

```sql
-- 1. Verificar status atual
SELECT 
    'STATUS ATUAL' as info,
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND column_name = 'end_date';

-- 2. Corrigir end_date (se necessário)
ALTER TABLE public.events 
ALTER COLUMN end_date DROP NOT NULL;

-- 3. Verificar se foi corrigido
SELECT 
    'VERIFICAÇÃO' as info,
    column_name,
    is_nullable,
    column_default,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ PERMITE NULL'
        ELSE '❌ AINDA NOT NULL'
    END as resultado
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND column_name = 'end_date';
```

#### **OPÇÃO 2: Script Completo (Se tiver acesso de administrador)**
Use o arquivo `fix_table_bypass_rls.sql` que contorna as permissões RLS.

#### **OPÇÃO 3: Contato com Administrador**
Se as opções acima não funcionarem, entre em contato com o administrador do banco para:
1. Desabilitar RLS temporariamente
2. Executar as correções
3. Reabilitar RLS

### **PASSO 2: VERIFICAR CÓDIGO (JÁ CORRIGIDO)**

✅ **EventFormModal.tsx** - Validação de campos implementada
✅ **OrganizerDashboardPage.tsx** - Inserção corrigida com logs de debug
✅ **OrganizerDashboardPage.tsx.backup** - Arquivo de backup corrigido

### **PASSO 3: TESTAR CRIAÇÃO DE EVENTO**

1. **Abra o dashboard do organizador**
2. **Clique em "Novo Evento"**
3. **Preencha os campos obrigatórios:**
   - ✅ Título do evento
   - ✅ Data de início
   - ✅ Hora de início
   - ✅ Local
   - ✅ Categoria
   - ✅ Preço
4. **Deixe a data de término em branco** (opcional)
5. **Clique em "Criar Evento"**

## 📋 **CAMPOS OBRIGATÓRIOS DA SUA TABELA**

Baseado na sua estrutura, estes campos são **OBRIGATÓRIOS**:

| Campo | Tipo | Status | Valor Padrão |
|-------|------|--------|---------------|
| `id` | uuid | ✅ Auto | Gerado automaticamente |
| `title` | text | ✅ Obrigatório | 'Evento sem título' |
| `organizer_id` | uuid | ✅ Obrigatório | ID do usuário logado |
| `start_date` | timestamp | ✅ Obrigatório | Data/hora informada |
| `end_date` | timestamp | ❌ NOT NULL | Mesmo valor de start_date |
| `location` | text | ✅ Obrigatório | 'Local não informado' |
| `status` | text | ✅ Obrigatório | 'pending' |
| `price` | numeric | ✅ Obrigatório | 0 |
| `category` | text | ✅ Obrigatório | 'evento' |

## 🚀 **COMO FUNCIONA AGORA**

### **1. Validação de Campos**
```typescript
// Campos obrigatórios são validados
if (!formData.start_date || !formData.start_time) {
  validationErrors.push('Data e hora de início são obrigatórias');
}

// Campos de término devem ser preenchidos juntos
if ((formData.end_date && !formData.end_time) || (!formData.end_date && formData.end_time)) {
  validationErrors.push('Data e hora de término devem ser preenchidas juntas ou deixadas em branco');
}
```

### **2. Construção Segura de Timestamps**
```typescript
// start_date sempre preenchido
start_date: `${eventData.start_date}T${eventData.start_time}:00`

// end_date com fallback seguro
end_date: eventData.end_date && eventData.end_time 
  ? `${eventData.end_date}T${eventData.end_time}:00` 
  : `${eventData.start_date}T${eventData.start_time}:00`
```

### **3. Valores Padrão para Todos os Campos**
```typescript
title: eventData.title || 'Evento sem título',
description: eventData.description || 'Descrição não disponível',
location: eventData.location || 'Local não informado',
price: eventData.price || 0,
category: eventData.category || 'evento'
```

## 🧪 **TESTES RECOMENDADOS**

### **Teste 1: Evento Mínimo**
- ✅ Título: "Teste Evento"
- ✅ Data início: Hoje
- ✅ Hora início: 20:00
- ✅ Local: "Local Teste"
- ✅ Categoria: "teste"
- ✅ Preço: 0
- ❌ Data término: Deixar em branco

**Resultado esperado**: ✅ Evento criado com sucesso

### **Teste 2: Evento Completo**
- ✅ Título: "Evento Completo"
- ✅ Data início: Hoje
- ✅ Hora início: 19:00
- ✅ Data término: Hoje
- ✅ Hora término: 23:00
- ✅ Local: "Local Completo"
- ✅ Categoria: "completo"
- ✅ Preço: 50

**Resultado esperado**: ✅ Evento criado com sucesso

### **Teste 3: Validação de Erro**
- ✅ Título: "Teste Validação"
- ✅ Data início: Hoje
- ✅ Hora início: 20:00
- ❌ Data término: Hoje
- ❌ Hora término: Deixar em branco
- ✅ Local: "Local Teste"
- ✅ Categoria: "teste"
- ✅ Preço: 0

**Resultado esperado**: ❌ Erro de validação (data e hora devem ser preenchidas juntas)

## 🔍 **VERIFICAÇÃO FINAL**

Após executar o script SQL, execute esta query:

```sql
SELECT 
  'VERIFICAÇÃO FINAL' as status,
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('end_date', 'title', 'description', 'location', 'price', 'category')
ORDER BY column_name;
```

**Resultado esperado:**
- `end_date` deve mostrar `is_nullable = YES`
- Todos os outros campos devem estar corretos

## 📊 **ARQUIVOS CRIADOS**

- `fix_table_complete.sql` - Script completo para corrigir a tabela
- `INSTRUÇÕES_RESOLUÇÃO.md` - Este arquivo com instruções detalhadas

## ⚠️ **IMPORTANTE**

**O script SQL DEVE ser executado ANTES de testar o código.** Sem isso, o erro continuará ocorrendo porque o campo `end_date` ainda será `NOT NULL`.

---

**Status**: ✅ **SOLUÇÃO COMPLETA IMPLEMENTADA**
**Próximo passo**: Executar script SQL para corrigir a tabela
**Responsável**: Assistente de IA
