# Como Ativar o Sistema de Views

## ⚠️ IMPORTANTE: Aplicar Migration no Banco de Dados

O sistema de views foi implementado, mas você precisa aplicar a migration no banco de dados primeiro.

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Copie TODO o conteúdo do arquivo:
   ```
   supabase/migrations/004_create_event_views_system.sql
   ```
6. Cole no editor SQL
7. Clique em **RUN** (ou pressione Ctrl+Enter)
8. Aguarde a confirmação de sucesso ✅

### Opção 2: Via Supabase CLI

```bash
# No terminal, dentro do diretório do projeto
cd c:\Users\rigob\Documents\pulacatraca-main

# Aplicar migration
supabase db push
```

---

## 📦 Instalar Dependências

O componente de analytics usa Chart.js:

```bash
npm install chart.js react-chartjs-2
```

---

## 🧪 Como Testar

### 1. Verificar se a Migration Foi Aplicada

No Supabase Dashboard → **Table Editor**:
- Verifique se a tabela `event_views` existe
- Verifique se a tabela `events` tem as colunas: `view_count`, `unique_view_count`, `last_viewed_at`

### 2. Testar Rastreamento de Views

1. Abra um evento no navegador
2. Aguarde 2 segundos
3. Abra o **Console do Navegador** (F12)
4. Procure por: `✅ View registrada para evento:`

### 3. Verificar Contador nos Cards

1. Volte para a home
2. Os cards de eventos devem mostrar: `👁️ X` (onde X é o número de views)
3. Se não aparecer, é porque o evento ainda não tem views

### 4. Simular Views para Teste

Execute no **SQL Editor** do Supabase:

```sql
-- Adicionar views de teste para um evento
-- Substitua 'SEU_EVENT_ID' pelo ID real de um evento

INSERT INTO event_views (event_id, session_id, ip_address, user_agent)
VALUES 
  ('SEU_EVENT_ID', 'test-session-1', '192.168.1.1', 'Mozilla/5.0'),
  ('SEU_EVENT_ID', 'test-session-2', '192.168.1.2', 'Mozilla/5.0'),
  ('SEU_EVENT_ID', 'test-session-3', '192.168.1.3', 'Mozilla/5.0');

-- Atualizar contadores do evento
UPDATE events 
SET view_count = 3, unique_view_count = 3 
WHERE id = 'SEU_EVENT_ID';
```

Agora recarregue a página e você verá `👁️ 3` no card do evento!

---

## 🔧 Troubleshooting

### Não vejo os contadores

**Causa**: Migration não foi aplicada ou eventos não têm views ainda

**Solução**:
1. Verifique se aplicou a migration
2. Adicione views de teste (SQL acima)
3. Recarregue a página

### Erro "relation event_views does not exist"

**Causa**: Migration não foi aplicada

**Solução**: Aplique a migration via Supabase Dashboard (Opção 1 acima)

### Contador sempre em 0

**Causa**: Nenhuma view foi registrada ainda

**Solução**: 
1. Abra um evento e aguarde 2 segundos
2. Ou adicione views de teste via SQL

---

## 📊 Onde Ver as Views

### Para Usuários Públicos
- **Cards de Eventos** (HomePage): `👁️ 123`
- **Página de Detalhes**: View count visível

### Para Organizadores
- Use o componente `<EventAnalytics eventId="..." />` no dashboard
- Mostra gráficos, métricas e histórico completo

---

## ✅ Checklist

- [ ] Migration aplicada no Supabase
- [ ] Chart.js instalado (`npm install chart.js react-chartjs-2`)
- [ ] Servidor rodando (`npm run dev`)
- [ ] Testado visualização de evento
- [ ] Verificado contador nos cards
