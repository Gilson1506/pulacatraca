# Sistema de Operadores de Entrada

## 📋 Visão Geral

Sistema completo para gerenciar operadores que realizam check-in nos eventos, sem acesso ao dashboard completo do organizador.

## 🎯 Funcionalidades Implementadas

### ✅ Backend (Supabase)

- **3 Tabelas criadas:**
  - `event_operators` - Dados dos operadores
  - `operator_activity_log` - Log de atividades
  - `operator_checkins` - Relacionamento check-in ↔ operador

- **9 Funções RPC:**
  - `generate_operator_access_code()` - Gera código de 6 dígitos único
  - `create_event_operator()` - Cria novo operador
  - `get_organizer_operators()` - Lista operadores do organizador
  - `authenticate_operator()` - Autentica operador por código
  - `update_event_operator()` - Atualiza dados do operador
  - `delete_event_operator()` - Remove operador
  - `get_operator_statistics()` - Estatísticas de atividade

- **Segurança (RLS):**
  - Políticas de acesso por organizador
  - Logs automáticos de atividades
  - Códigos de acesso únicos

### ✅ Frontend (Dashboard Organizador)

- **Componente `OperatorsManagement`:**
  - Listagem de operadores
  - Criação de novos operadores
  - Edição de dados
  - Ativação/desativação
  - Exclusão
  - Cópia de código de acesso
  - Estatísticas em tempo real

- **Integração no Dashboard:**
  - Nova aba "Operadores" no menu
  - Interface responsiva
  - Toasts de feedback
  - Modais de criação/edição

## 🚀 Instalação

### 1. Executar Migration no Supabase

```bash
# No SQL Editor do Supabase, execute:
supabase/migrations/002_create_event_operators.sql
```

Ou via CLI:
```bash
supabase db push
```

### 2. Verificar Instalação

Execute no SQL Editor:
```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%operator%';

-- Verificar funções
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%operator%';
```

Deve retornar:
- **Tabelas:** `event_operators`, `operator_activity_log`, `operator_checkins`
- **Funções:** 9 funções RPC

## 📱 Como Usar (Organizador)

### 1. Acessar Gestão de Operadores

1. Login como organizador
2. Dashboard → Menu lateral → **"Operadores"**

### 2. Criar Novo Operador

1. Clique em **"Novo Operador"**
2. Preencha os dados:
   - **Nome** (obrigatório)
   - **Email** (opcional)
   - **Telefone** (opcional)
   - **Evento** (opcional - deixe em branco para todos os eventos)
   - **Observações** (opcional)
3. Clique em **"Criar Operador"**
4. **Código de acesso** será gerado automaticamente (6 dígitos)

### 3. Compartilhar Código com Operador

- Copie o código clicando no ícone de cópia
- Envie para o operador via WhatsApp, email, etc.
- O operador usará este código no app móvel

### 4. Gerenciar Operadores

- **Ativar/Desativar:** Clique no status (verde/cinza)
- **Editar:** Clique no ícone de lápis
- **Remover:** Clique no ícone de lixeira
- **Ver estatísticas:** Total de check-ins realizados

## 🔐 Segurança

### Permissões do Operador

✅ **Pode:**
- Fazer login com código de 6 dígitos
- Realizar check-in via QR Code
- Ver estatísticas básicas (contador)
- Acessar apenas eventos autorizados

❌ **Não pode:**
- Ver dados financeiros
- Acessar lista completa de participantes
- Modificar eventos
- Ver dados de outros organizadores
- Acessar configurações

### Auditoria

Todas as ações são registradas em `operator_activity_log`:
- Login/Logout
- Check-ins realizados
- Tentativas de acesso negado
- IP e User Agent

## 📊 Estrutura de Dados

### Tabela `event_operators`

```sql
id                UUID PRIMARY KEY
organizer_id      UUID (FK → profiles)
event_id          UUID (FK → events) NULL = todos os eventos
name              TEXT
email             TEXT
phone             TEXT
access_code       TEXT UNIQUE (6 dígitos)
is_active         BOOLEAN
can_checkin       BOOLEAN
can_view_stats    BOOLEAN
total_checkins    INTEGER
last_access       TIMESTAMP
created_at        TIMESTAMP
updated_at        TIMESTAMP
notes             TEXT
```

### Fluxo de Autenticação

```
1. Operador insere código de 6 dígitos
   ↓
2. authenticate_operator(p_access_code)
   ↓
3. Verifica se código existe e está ativo
   ↓
4. Retorna dados do operador + eventos disponíveis
   ↓
5. Registra login em operator_activity_log
   ↓
6. Atualiza last_access
```

## 🔄 Próximos Passos (App Operador)

Quando você estiver pronto para desenvolver o app móvel, ele deve:

### 1. Tela de Login
```typescript
// Exemplo de chamada
const { data, error } = await supabase.rpc('authenticate_operator', {
  p_access_code: '123456',
  p_ip_address: deviceIP,
  p_user_agent: deviceInfo
});

if (data.success) {
  // Salvar dados do operador
  // Mostrar lista de eventos
}
```

### 2. Tela de Check-in
```typescript
// Usar a função existente checkin_by_qr_code
const { data, error } = await supabase.rpc('checkin_by_qr_code', {
  p_qr_code: scannedCode,
  p_event_id: selectedEventId,
  p_organizer_id: operator.organizer_id
});

// Registrar que foi o operador que fez
await supabase.from('operator_checkins').insert({
  checkin_id: data.checkin_id,
  operator_id: operator.id
});
```

### 3. Estatísticas Básicas
```typescript
const { data } = await supabase.rpc('get_operator_statistics', {
  p_operator_id: operator.id
});

// Mostrar: total_checkins, checkins_today, etc.
```

## 🐛 Troubleshooting

### Erro: "Função não encontrada"
```sql
-- Verificar se migration foi executada
SELECT * FROM pg_proc WHERE proname LIKE '%operator%';
```

### Erro: "Permissão negada"
```sql
-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename LIKE '%operator%';
```

### Código de acesso não funciona
```sql
-- Verificar se operador está ativo
SELECT * FROM event_operators WHERE access_code = '123456';
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs em `operator_activity_log`
2. Confirme que a migration foi executada
3. Teste as funções RPC manualmente no SQL Editor

---

**Desenvolvido para Pulacatraca** 🎉
