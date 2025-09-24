# 🔐 Configurar Admin para Buscar Dados de Transferências no Supabase

## 📋 O que você precisa fazer

Você precisa configurar um usuário administrador no Supabase que possa visualizar e buscar todos os dados de transferências de ingressos, mesmo que não sejam dele próprio.

## 🎯 Por que isso é necessário

Atualmente, as políticas de segurança (RLS) impedem que usuários vejam dados de outros usuários. Para administradores e suporte técnico, isso é um problema porque eles precisam:
- Investigar problemas de transferência
- Auditar histórico de transferências
- Resolver conflitos entre usuários
- Gerar relatórios administrativos

## 🛠️ Como configurar (Passo a Passo)

### 1. Acessar o Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Faça login na sua conta
- Selecione o projeto "pulacatraca"

### 2. Ir para Authentication > Users
- No menu lateral esquerdo, clique em "Authentication"
- Clique em "Users"
- Aqui você verá todos os usuários cadastrados

### 3. Identificar ou Criar o Usuário Admin
**Opção A: Usar usuário existente**
- Procure por um usuário que será o administrador
- Anote o UUID deste usuário (é uma string longa como: `123e4567-e89b-12d3-a456-426614174000`)

**Opção B: Criar novo usuário admin**
- Clique em "Add User"
- Preencha:
  - Email: `admin@pulacatraca.com` (ou outro email de sua escolha)
  - Password: `Admin123!` (ou senha forte de sua escolha)
  - Marque "Auto-confirm user"
- Clique em "Create User"
- Anote o UUID do usuário criado

### 4. Executar Script SQL para Configurar Admin
No Supabase, vá para "SQL Editor" e execute este script:

```sql
-- =====================================================
-- CONFIGURAR ADMIN PARA ACESSAR TODAS AS TRANSFERÊNCIAS
-- =====================================================

-- 1. Criar função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Lista de UUIDs de usuários admin (substitua pelos seus)
  RETURN p_user_id IN (
    'UUID_DO_ADMIN_1_AQUI',  -- Substitua pelo UUID real
    'UUID_DO_ADMIN_2_AQUI'   -- Adicione mais admins se necessário
  );
END;
$$;

-- 2. Atualizar política de tickets para permitir acesso admin
DROP POLICY IF EXISTS "Users can only access their own tickets" ON tickets;
CREATE POLICY "Users can access their own tickets or are admin" ON tickets
  FOR ALL USING (
    auth.uid() = user_id OR 
    is_admin_user(auth.uid())
  );

-- 3. Atualizar política de transferências para permitir acesso admin
DROP POLICY IF EXISTS "Users can view transfers they're involved in" ON ticket_transfers;
CREATE POLICY "Users can view transfers they're involved in or are admin" ON ticket_transfers
  FOR SELECT USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id OR
    is_admin_user(auth.uid())
  );

-- 4. Criar função para admin buscar todas as transferências
CREATE OR REPLACE FUNCTION admin_get_all_transfers(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_where_conditions TEXT := '';
  v_query TEXT;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT is_admin_user(auth.uid()) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Acesso negado. Apenas administradores podem usar esta função.'
    );
  END IF;
  
  -- Construir condições WHERE dinamicamente
  IF p_status IS NOT NULL THEN
    v_where_conditions := v_where_conditions || ' AND tt.status = ''' || p_status || '''';
  END IF;
  
  IF p_date_from IS NOT NULL THEN
    v_where_conditions := v_where_conditions || ' AND DATE(tt.transferred_at) >= ''' || p_date_from || '''';
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    v_where_conditions := v_where_conditions || ' AND DATE(tt.transferred_at) <= ''' || p_date_to || '''';
  END IF;
  
  -- Query principal
  v_query := '
    SELECT json_build_object(
      ''success'', true,
      ''data'', json_build_object(
        ''transfers'', COALESCE(
          array_agg(
            json_build_object(
              ''id'', tt.id,
              ''ticket_id'', tt.ticket_id,
              ''transferred_at'', tt.transferred_at,
              ''transfer_reason'', tt.transfer_reason,
              ''status'', tt.status,
              ''from_user'', json_build_object(
                ''id'', tt.from_user_id,
                ''email'', fu.email,
                ''full_name'', COALESCE(fu.raw_user_meta_data->>''full_name'', fu.email)
              ),
              ''to_user'', json_build_object(
                ''id'', tt.to_user_id,
                ''email'', tu.email,
                ''full_name'', COALESCE(tu.raw_user_meta_data->>''full_name'', tu.email)
              ),
              ''ticket_info'', json_build_object(
                ''event_title'', e.title,
                ''ticket_type'', COALESCE(ett.title, ''Padrão''),
                ''ticket_status'', t.status
              )
            )
          ), 
          ''[]''::json[]
        ),
        ''total_count'', COUNT(*),
        ''limit'', ' || p_limit || ',
        ''offset'', ' || p_offset || '
      )
    )
    FROM ticket_transfers tt
    JOIN auth.users fu ON tt.from_user_id = fu.id
    JOIN auth.users tu ON tt.to_user_id = tu.id
    JOIN tickets t ON tt.ticket_id = t.id
    JOIN events e ON t.event_id = e.id
    LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
    WHERE 1=1' || v_where_conditions || '
    ORDER BY tt.transferred_at DESC
    LIMIT ' || p_limit || ' OFFSET ' || p_offset;
  
  EXECUTE v_query INTO v_result;
  RETURN v_result;
END;
$$;

-- 5. Criar função para admin buscar transferências de um usuário específico
CREATE OR REPLACE FUNCTION admin_get_user_transfers(p_user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT is_admin_user(auth.uid()) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Acesso negado. Apenas administradores podem usar esta função.'
    );
  END IF;
  
  -- Buscar todas as transferências relacionadas ao usuário
  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'user_email', p_user_email,
      'transfers_as_sender', COALESCE(
        array_agg(
          CASE WHEN tt.from_user_id = u.id THEN
            json_build_object(
              'id', tt.id,
              'ticket_id', tt.ticket_id,
              'transferred_at', tt.transferred_at,
              'to_user_email', tu.email,
              'to_user_name', COALESCE(tu.raw_user_meta_data->>'full_name', tu.email),
              'event_title', e.title
            )
          END
        ) FILTER (WHERE tt.from_user_id = u.id), 
        '[]'::json[]
      ),
      'transfers_as_receiver', COALESCE(
        array_agg(
          CASE WHEN tt.to_user_id = u.id THEN
            json_build_object(
              'id', tt.id,
              'ticket_id', tt.ticket_id,
              'transferred_at', tt.transferred_at,
              'from_user_email', fu.email,
              'from_user_name', COALESCE(fu.raw_user_meta_data->>'full_name', fu.email),
              'event_title', e.title
            )
          END
        ) FILTER (WHERE tt.to_user_id = u.id), 
        '[]'::json[]
      )
    )
  )
  INTO v_result
  FROM auth.users u
  LEFT JOIN ticket_transfers tt ON (tt.from_user_id = u.id OR tt.to_user_id = u.id)
  LEFT JOIN auth.users fu ON tt.from_user_id = fu.id
  LEFT JOIN auth.users tu ON tt.to_user_id = tu.id
  LEFT JOIN tickets t ON tt.ticket_id = t.id
  LEFT JOIN events e ON t.event_id = e.id
  WHERE u.email = p_user_email
  GROUP BY u.id, u.email;
  
  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuário não encontrado'
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- 6. Criar função para admin buscar estatísticas de transferências
CREATE OR REPLACE FUNCTION admin_get_transfer_statistics(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_where_conditions TEXT := '';
BEGIN
  -- Verificar se o usuário é admin
  IF NOT is_admin_user(auth.uid()) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Acesso negado. Apenas administradores podem usar esta função.'
    );
  END IF;
  
  -- Construir condições WHERE dinamicamente
  IF p_date_from IS NOT NULL THEN
    v_where_conditions := v_where_conditions || ' AND DATE(tt.transferred_at) >= ''' || p_date_from || '''';
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    v_where_conditions := v_where_conditions || ' AND DATE(tt.transferred_at) <= ''' || p_date_to || '''';
  END IF;
  
  -- Buscar estatísticas
  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'total_transfers', COUNT(*),
      'completed_transfers', COUNT(*) FILTER (WHERE tt.status = 'completed'),
      'failed_transfers', COUNT(*) FILTER (WHERE tt.status = 'failed'),
      'cancelled_transfers', COUNT(*) FILTER (WHERE tt.status = 'cancelled'),
      'transfers_today', COUNT(*) FILTER (WHERE DATE(tt.transferred_at) = CURRENT_DATE),
      'transfers_this_week', COUNT(*) FILTER (WHERE tt.transferred_at >= CURRENT_DATE - INTERVAL '7 days'),
      'transfers_this_month', COUNT(*) FILTER (WHERE tt.transferred_at >= CURRENT_DATE - INTERVAL '30 days'),
      'top_events', (
        SELECT json_agg(
          json_build_object(
            'event_title', e.title,
            'transfer_count', COUNT(*)
          )
        )
        FROM ticket_transfers tt2
        JOIN tickets t2 ON tt2.ticket_id = t2.id
        JOIN events e ON t2.event_id = e.id
        WHERE 1=1 || v_where_conditions
        GROUP BY e.id, e.title
        ORDER BY COUNT(*) DESC
        LIMIT 5
      )
    )
  )
  INTO v_result
  FROM ticket_transfers tt
  WHERE 1=1 || v_where_conditions;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- ✅ ADMIN CONFIGURADO COM SUCESSO!
-- =====================================================

-- Para usar as funções admin:
-- 1. admin_get_all_transfers(100, 0, 'completed', '2024-01-01', '2024-12-31')
-- 2. admin_get_user_transfers('usuario@exemplo.com')
-- 3. admin_get_transfer_statistics('2024-01-01', '2024-12-31')
```

### 5. Substituir UUIDs no Script
**IMPORTANTE:** No script acima, você precisa substituir:
- `'UUID_DO_ADMIN_1_AQUI'` pelo UUID real do usuário admin que você anotou
- Se tiver mais de um admin, adicione mais UUIDs na lista

### 6. Testar as Funções
Após executar o script, teste se está funcionando:

```sql
-- Testar se o admin pode ver todas as transferências
SELECT admin_get_all_transfers(10, 0);

-- Testar busca por usuário específico
SELECT admin_get_user_transfers('email@exemplo.com');

-- Testar estatísticas
SELECT admin_get_transfer_statistics();
```

## 🔍 Como usar as funções admin

### Buscar todas as transferências
```sql
-- Últimas 50 transferências
SELECT admin_get_all_transfers(50, 0);

-- Transferências com filtros
SELECT admin_get_all_transfers(100, 0, 'completed', '2024-01-01', '2024-12-31');
```

### Buscar transferências de um usuário
```sql
-- Ver todas as transferências de um usuário específico
SELECT admin_get_user_transfers('usuario@exemplo.com');
```

### Ver estatísticas
```sql
-- Estatísticas gerais
SELECT admin_get_transfer_statistics();

-- Estatísticas de um período
SELECT admin_get_transfer_statistics('2024-01-01', '2024-12-31');
```

## ⚠️ Segurança

- **Mantenha os UUIDs dos admins seguros**
- **Use apenas para usuários de confiança**
- **Monitore o uso das funções admin**
- **Considere adicionar logs de auditoria**

## 🆘 Se algo der errado

1. **Verifique se o UUID está correto**
2. **Confirme se o usuário existe na tabela auth.users**
3. **Execute o script novamente**
4. **Verifique se não há erros de sintaxe**

## 📞 Suporte

Se precisar de ajuda, verifique:
- Logs do Supabase
- Console do navegador
- Mensagens de erro específicas

---

**✅ Após configurar, o admin poderá buscar e visualizar todos os dados de transferências através das funções criadas!**
