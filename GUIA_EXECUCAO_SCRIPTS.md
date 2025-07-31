# 🎯 GUIA DE EXECUÇÃO DOS SCRIPTS SQL

## 📋 **ORDEM CORRETA DE EXECUÇÃO**

### **1️⃣ PRIMEIRO: Estrutura de Eventos**
```sql
-- Execute: update_events_new_modal.sql
```
**O que faz:**
- ✅ Atualiza tabela `events` com novas colunas
- ✅ Adiciona campos: `subject`, `subcategory`, `location_type`, etc.
- ✅ Configura bucket `event_banners` para imagens
- ✅ Define políticas RLS para eventos

### **2️⃣ SEGUNDO: Estrutura de Tickets**
```sql
-- Execute: fix_tickets_structure.sql
```
**O que faz:**
- ✅ Atualiza tabela `tickets` com campos do modal
- ✅ Adiciona campos: `has_half_price`, `sale_period_type`, etc.
- ✅ Configura campos para venda de ingressos
- ✅ Prepara estrutura para relacionamentos

### **3️⃣ TERCEIRO: Tabelas de Ingressos (CORRIGIDO)**
```sql
-- Execute: fix_ticket_related_tables_corrected.sql
```
**O que faz:**
- ✅ **VERIFICA** estrutura atual das tabelas
- ✅ **GARANTE** que `tickets` tem colunas necessárias
- ✅ **CRIA** `ticket_users` com 20+ campos
- ✅ **ADICIONA** `ticket_user_id` à `tickets` (APÓS ticket_users existir)
- ✅ **CRIA** `ticket_history` para auditoria
- ✅ **CONFIGURA** foreign keys na ordem correta
- ✅ **IMPLEMENTA** automações (QR codes, histórico)
- ✅ **DEFINE** políticas RLS seguras

---

## 🔧 **SCRIPT CORRIGIDO: `fix_ticket_related_tables_corrected.sql`**

### **🎯 PRINCIPAIS CORREÇÕES:**

#### **1. ORDEM DE CRIAÇÃO CORRIGIDA:**
```sql
1. Verificar/criar tabela tickets com colunas básicas
2. Criar tabela ticket_users
3. Adicionar ticket_user_id à tickets (APÓS ticket_users existir)
4. Criar tabela ticket_history
5. Adicionar foreign keys (APÓS todas as tabelas existirem)
```

#### **2. VERIFICAÇÕES INTELIGENTES:**
```sql
-- Diagnóstico inicial
SELECT table_name, 'EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN ('tickets', 'ticket_users', 'ticket_history');

-- Verificar colunas atuais
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'tickets';
```

#### **3. CRIAÇÃO SEGURA DE COLUNAS:**
```sql
-- Só adiciona se não existir
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tickets' AND column_name = 'ticket_user_id') THEN
    ALTER TABLE tickets ADD COLUMN ticket_user_id UUID;
END IF;
```

#### **4. FOREIGN KEYS NA ORDEM CORRETA:**
```sql
-- Primeiro: tickets -> events
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_id 
FOREIGN KEY (event_id) REFERENCES events(id);

-- Segundo: tickets -> ticket_users (APÓS ticket_users existir)
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_ticket_user_id 
FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id);

-- Terceiro: ticket_users -> tickets
ALTER TABLE ticket_users ADD CONSTRAINT fk_ticket_users_ticket_id 
FOREIGN KEY (ticket_id) REFERENCES tickets(id);
```

---

## 🚀 **COMO EXECUTAR:**

### **📝 PASSO A PASSO:**

#### **1. Abrir Supabase SQL Editor**
- Acesse seu projeto Supabase
- Vá para "SQL Editor"
- Abra uma nova query

#### **2. Executar Scripts na Ordem:**

**🔸 PRIMEIRO SCRIPT:**
```sql
-- Cole todo o conteúdo de: update_events_new_modal.sql
-- Clique em "Run"
-- Aguarde conclusão (pode demorar 1-2 minutos)
```

**🔸 SEGUNDO SCRIPT:**
```sql
-- Cole todo o conteúdo de: fix_tickets_structure.sql
-- Clique em "Run"
-- Aguarde conclusão
```

**🔸 TERCEIRO SCRIPT (CORRIGIDO):**
```sql
-- Cole todo o conteúdo de: fix_ticket_related_tables_corrected.sql
-- Clique em "Run"
-- Aguarde conclusão (pode demorar 2-3 minutos)
```

#### **3. Verificar Execução:**
Após cada script, verifique as mensagens:
```
✅ DIAGNÓSTICO INICIAL DAS TABELAS
✅ CONFIGURANDO TABELA TICKETS
✅ CONFIGURANDO TABELA TICKET_USERS
✅ ADICIONANDO REFERÊNCIA TICKET_USER_ID
✅ COMPLETANDO TABELA TICKET_USERS
✅ CONFIGURANDO TABELA TICKET_HISTORY
✅ CONFIGURANDO FOREIGN KEYS
✅ ATUALIZAÇÃO DAS TABELAS DE INGRESSOS CONCLUÍDA
```

---

## 🎯 **RESULTADO ESPERADO:**

### **📊 TABELAS CRIADAS/ATUALIZADAS:**

#### **🎫 TABELA `tickets`:**
```sql
- id, name, price, quantity, description
- event_id, buyer_id, user_id, ticket_user_id
- status, code, ticket_type
- has_half_price, sale_period_type
- sale_start_date, sale_end_date
- availability, min_quantity, max_quantity
- created_at, updated_at
```

#### **👤 TABELA `ticket_users`:**
```sql
- id, ticket_id, name, email, document, phone
- birth_date, gender, address, city, state, zip_code
- emergency_contact, emergency_phone
- dietary_restrictions, special_needs
- marketing_consent, status, qr_code
- check_in_date, created_at, updated_at
```

#### **📋 TABELA `ticket_history`:**
```sql
- id, ticket_user_id, ticket_id, event_id
- action_type, action_description
- old_values, new_values (JSONB)
- performed_by, performed_at
- ip_address, user_agent, additional_data
- created_at
```

### **🤖 AUTOMAÇÕES ATIVAS:**
- ✅ QR codes únicos gerados automaticamente
- ✅ Histórico registrado em todas as mudanças
- ✅ Triggers para updated_at
- ✅ Políticas RLS para segurança

### **🔗 RELACIONAMENTOS:**
```
events (1) ←→ (N) tickets
tickets (1) ←→ (N) ticket_users
ticket_users (1) ←→ (N) ticket_history
tickets ←→ ticket_history
events ←→ ticket_history
```

---

## 🚨 **RESOLUÇÃO DE PROBLEMAS:**

### **❌ Se der erro "column does not exist":**
```sql
-- Execute este diagnóstico primeiro:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public';
```

### **❌ Se der erro "relation does not exist":**
```sql
-- Verifique se as tabelas existem:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'tickets', 'profiles');
```

### **❌ Se der erro de foreign key:**
```sql
-- Execute os scripts na ordem correta
-- Sempre execute update_events_new_modal.sql primeiro
```

---

## 🎊 **TESTE FINAL:**

### **🔍 VERIFICAR ESTRUTURAS:**
```sql
-- Verificar tickets
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- Verificar ticket_users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
ORDER BY ordinal_position;

-- Verificar ticket_history
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ticket_history' 
ORDER BY ordinal_position;
```

### **📊 VERIFICAR DADOS:**
```sql
SELECT 
    'TICKETS' as tabela, COUNT(*) as registros
FROM tickets
UNION ALL
SELECT 
    'TICKET_USERS' as tabela, COUNT(*) as registros
FROM ticket_users
UNION ALL
SELECT 
    'TICKET_HISTORY' as tabela, COUNT(*) as registros
FROM ticket_history;
```

---

## 🎯 **PRÓXIMOS PASSOS:**

Após executar os scripts com sucesso:

1. **✅ Testar EventFormModal** - Criar evento novo
2. **✅ Testar HomePage** - Verificar listagem
3. **✅ Testar EventPage** - Ver detalhes
4. **✅ Testar Sistema de Check-in** - QR codes
5. **✅ Testar Histórico** - Auditoria completa

**🚀 EXECUTE OS SCRIPTS NA ORDEM E SEU SISTEMA ESTARÁ ENTERPRISE-GRADE!**