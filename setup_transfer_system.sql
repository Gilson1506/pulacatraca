-- 🎫 Sistema de Transferência de Ingressos - PulaKatraca
-- SQL para configuração completa do banco de dados

-- =====================================================
-- 1. CRIAR TABELA DE LOG DE TRANSFERÊNCIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS ticket_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transfer_reason TEXT DEFAULT 'Transferência voluntária',
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ADICIONAR COLUNAS NECESSÁRIAS NAS TABELAS EXISTENTES
-- =====================================================

-- Adicionar colunas na tabela tickets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS transferred_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS max_transfers INTEGER DEFAULT 1;

-- Adicionar colunas na tabela event_ticket_types
ALTER TABLE event_ticket_types 
ADD COLUMN IF NOT EXISTS transferable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_transfers INTEGER DEFAULT 1;

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_ticket_id ON ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_from_user_id ON ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_user_id ON ticket_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_transferred_at ON ticket_transfers(transferred_at);
CREATE INDEX IF NOT EXISTS idx_tickets_transfer_count ON tickets(transfer_count);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- =====================================================
-- 4. FUNÇÃO PARA VERIFICAR SE INGRESSO PODE SER TRANSFERIDO
-- =====================================================

CREATE OR REPLACE FUNCTION can_transfer_ticket(
  p_ticket_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_record RECORD;
  v_result JSON;
BEGIN
  -- Buscar informações do ingresso
  SELECT 
    t.id,
    t.event_id,
    t.user_id,
    t.ticket_user_id,
    t.status,
    t.transfer_count,
    COALESCE(ett.max_transfers, 1) as max_transfers,
    COALESCE(ett.transferable, true) as transferable,
    e.title as event_title,
    e.start_date,
    e.status as event_status
  INTO v_ticket_record
  FROM tickets t
  LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
  JOIN events e ON t.event_id = e.id
  WHERE t.id = p_ticket_id;
  
  -- Verificar se o ingresso existe
  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Ingresso não encontrado'
    );
  END IF;
  
  -- Verificar se o ingresso tem um proprietário definido (ticket_user_id)
  IF v_ticket_record.ticket_user_id IS NULL THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Este ingresso não pode ser transferido pois não possui proprietário definido'
    );
  END IF;
  
  -- Verificar se o ingresso pertence ao usuário atual (user_id)
  IF v_ticket_record.user_id != p_user_id THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Você não possui este ingresso'
    );
  END IF;
  
  -- Verificar se o tipo de ingresso permite transferência
  IF NOT v_ticket_record.transferable THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Este tipo de ingresso não permite transferência'
    );
  END IF;
  
  -- Verificar se o ingresso já foi transferido o máximo de vezes
  IF v_ticket_record.transfer_count >= v_ticket_record.max_transfers THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Este ingresso já atingiu o limite máximo de transferências'
    );
  END IF;
  
  -- Verificar se o evento ainda não começou
  IF v_ticket_record.start_date <= NOW() THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Não é possível transferir ingressos para eventos que já começaram'
    );
  END IF;
  
  -- Verificar se o evento está aprovado
  IF v_ticket_record.event_status != 'approved' THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Evento não está disponível para transferência'
    );
  END IF;
  
  -- Verificar se o ingresso tem status válido
  IF v_ticket_record.status NOT IN ('active', 'confirmed') THEN
    RETURN json_build_object(
      'can_transfer', false,
      'message', 'Este ingresso não pode ser transferido no momento'
    );
  END IF;
  
  -- Se chegou até aqui, pode transferir
  RETURN json_build_object(
    'can_transfer', true,
    'message', 'Ingresso pode ser transferido',
    'data', json_build_object(
      'ticket_id', p_ticket_id,
      'current_transfers', v_ticket_record.transfer_count,
      'max_transfers', v_ticket_record.max_transfers,
      'remaining_transfers', v_ticket_record.max_transfers - v_ticket_record.transfer_count
    )
  );
END;
$$;

-- =====================================================
-- 5. FUNÇÃO PARA REALIZAR A TRANSFERÊNCIA
-- =====================================================

CREATE OR REPLACE FUNCTION transfer_ticket(
  p_ticket_id UUID,
  p_new_user_email TEXT,
  p_current_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_record RECORD;
  v_new_user_record RECORD;
  v_result JSON;
  v_transfer_log_id UUID;
BEGIN
  -- Verificar se o ingresso existe e pode ser transferido
  SELECT 
    t.id,
    t.event_id,
    t.ticket_type_id,
    t.user_id,
    t.ticket_user_id,
    t.status,
    t.transfer_count,
    COALESCE(ett.max_transfers, 1) as max_transfers,
    e.title as event_title,
    e.start_date
  INTO v_ticket_record
  FROM tickets t
  LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
  JOIN events e ON t.event_id = e.id
  WHERE t.id = p_ticket_id;
  
  -- Verificar se o ingresso existe
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Ingresso não encontrado'
    );
  END IF;
  
  -- Verificar se o ingresso tem um proprietário definido (ticket_user_id)
  IF v_ticket_record.ticket_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Este ingresso não pode ser transferido pois não possui proprietário definido'
    );
  END IF;
  
  -- Verificar se o ingresso pertence ao usuário atual
  IF v_ticket_record.user_id != p_current_user_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não pode transferir este ingresso'
    );
  END IF;
  
  -- Verificar se o ingresso já foi transferido o máximo de vezes
  IF v_ticket_record.transfer_count >= v_ticket_record.max_transfers THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Este ingresso já atingiu o limite máximo de transferências'
    );
  END IF;
  
  -- Verificar se o evento ainda não começou
  IF v_ticket_record.start_date <= NOW() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Não é possível transferir ingressos para eventos que já começaram'
    );
  END IF;
  
  -- Verificar se o ingresso tem status válido
  IF v_ticket_record.status NOT IN ('active', 'confirmed') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Este ingresso não pode ser transferido no momento'
    );
  END IF;
  
  -- Buscar o novo usuário pelo email
  SELECT id, email, raw_user_meta_data->>'full_name' as full_name
  INTO v_new_user_record
  FROM auth.users
  WHERE email = p_new_user_email;
  
  -- Verificar se o novo usuário existe
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuário não encontrado com este email'
    );
  END IF;
  
  -- Verificar se não está tentando transferir para si mesmo
  IF v_new_user_record.id = p_current_user_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Não é possível transferir o ingresso para você mesmo'
    );
  END IF;
  
  -- Iniciar transação
  BEGIN
    -- Atualizar o ingresso com o novo usuário
    UPDATE tickets 
    SET 
      user_id = v_new_user_record.id,
      transfer_count = transfer_count + 1,
      transferred_at = NOW(),
      transferred_by = p_current_user_id,
      updated_at = NOW()
    WHERE id = p_ticket_id;
    
    -- Registrar o log da transferência
    INSERT INTO ticket_transfers (
      id,
      ticket_id,
      from_user_id,
      to_user_id,
      transferred_at,
      transfer_reason,
      status
    ) VALUES (
      gen_random_uuid(),
      p_ticket_id,
      p_current_user_id,
      v_new_user_record.id,
      NOW(),
      'Transferência voluntária',
      'completed'
    );
    
    -- Retornar sucesso
    v_result := json_build_object(
      'success', true,
      'message', format('Ingresso transferido com sucesso para %s', 
        COALESCE(v_new_user_record.full_name, v_new_user_record.email)),
      'data', json_build_object(
        'ticket_id', p_ticket_id,
        'new_user_id', v_new_user_record.id,
        'new_user_name', COALESCE(v_new_user_record.full_name, v_new_user_record.email),
        'new_user_email', v_new_user_record.email,
        'transfer_count', v_ticket_record.transfer_count + 1,
        'max_transfers', v_ticket_record.max_transfers
      )
    );
    
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, fazer rollback
    RETURN json_build_object(
      'success', false,
      'message', 'Erro interno ao processar a transferência: ' || SQLERRM
    );
  END;
END;
$$;

-- =====================================================
-- 6. FUNÇÃO PARA BUSCAR USUÁRIO POR EMAIL
-- =====================================================

CREATE OR REPLACE FUNCTION find_user_by_email(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_ticket_user_record RECORD;
  v_result JSON;
BEGIN
  -- Buscar usuário na tabela auth.users
  SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name' as full_name,
    created_at
  INTO v_user_record
  FROM auth.users
  WHERE email = p_email;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'found', false,
      'message', 'Usuário não encontrado com este email'
    );
  END IF;
  
     -- Buscar dados adicionais na tabela ticket_users (se existir)
   SELECT 
     name,
     document
   INTO v_ticket_user_record
   FROM ticket_users
   WHERE email = p_email;
  
         -- Construir resposta com dados combinados
       v_result := json_build_object(
         'found', true,
         'data', json_build_object(
           'id', v_user_record.id,
           'email', v_user_record.email,
           'full_name', COALESCE(v_ticket_user_record.name, v_user_record.full_name, split_part(p_email, '@', 1)),
           'document', v_ticket_user_record.document,
           'created_at', v_user_record.created_at,
           'is_registered', v_ticket_user_record.name IS NOT NULL
         )
       );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 7. FUNÇÃO PARA OBTER HISTÓRICO DE TRANSFERÊNCIAS
-- =====================================================

CREATE OR REPLACE FUNCTION get_ticket_transfer_history(p_ticket_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Retornar histórico de transferências como JSON
  RETURN (
    SELECT json_build_object(
      'success', true,
      'data', COALESCE(
        array_agg(
          json_build_object(
            'id', tt.id,
            'transferred_at', tt.transferred_at,
            'transfer_reason', tt.transfer_reason,
            'status', tt.status,
            'from_user', json_build_object(
              'id', tt.from_user_id,
              'email', fu.email,
              'full_name', fu.raw_user_meta_data->>'full_name'
            ),
            'to_user', json_build_object(
              'id', tt.to_user_id,
              'email', tu.email,
              'full_name', tu.raw_user_meta_data->>'full_name'
            )
          )
        ), 
        '{}'::json[]
      )
    )
    FROM ticket_transfers tt
    JOIN auth.users fu ON tt.from_user_id = fu.id
    JOIN auth.users tu ON tt.to_user_id = tu.id
    WHERE tt.ticket_id = p_ticket_id
    ORDER BY tt.transferred_at DESC
  );
END;
$$;

-- =====================================================
-- 8. CONFIGURAR POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Ativar RLS nas tabelas
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can only access their own tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view transfers they're involved in" ON ticket_transfers;
DROP POLICY IF EXISTS "Authenticated users can create transfers" ON ticket_transfers;

-- Política para tickets: usuários só podem ver seus próprios ingressos
CREATE POLICY "Users can only access their own tickets" ON tickets
  FOR ALL USING (auth.uid() = user_id);

-- Política para transferências: usuários só podem ver transferências relacionadas a eles
CREATE POLICY "Users can view transfers they're involved in" ON ticket_transfers
  FOR SELECT USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id
  );

-- Política para inserção de transferências: apenas usuários autenticados
CREATE POLICY "Authenticated users can create transfers" ON ticket_transfers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 9. DADOS DE EXEMPLO (OPCIONAL)
-- =====================================================

-- Inserir tipos de ingresso com configurações de transferência
-- ATENÇÃO: Substitua 'event-uuid-1' pelo UUID real de um evento existente
-- ou comente esta seção se não quiser inserir dados de exemplo

/*
INSERT INTO event_ticket_types (id, event_id, title, price, transferable, max_transfers)
VALUES 
  (gen_random_uuid(), 'event-uuid-1', 'Ingresso Geral', 50.00, true, 1),
  (gen_random_uuid(), 'event-uuid-1', 'VIP', 100.00, true, 2),
  (gen_random_uuid(), 'event-uuid-1', 'Camarote', 200.00, false, 0)
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- 10. VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('can_transfer_ticket', 'transfer_ticket', 'find_user_by_email', 'get_ticket_transfer_history');

-- Verificar se as tabelas foram criadas
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('tickets', 'ticket_transfers', 'event_ticket_types')
ORDER BY table_name, ordinal_position;

-- Verificar se os índices foram criados
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY indexname;

-- =====================================================
-- ✅ SISTEMA CONFIGURADO COM SUCESSO!
-- =====================================================

-- Para testar, execute:
-- SELECT can_transfer_ticket('ticket-uuid', 'user-uuid');
-- SELECT transfer_ticket('ticket-uuid', 'email@exemplo.com', 'user-uuid');
-- SELECT find_user_by_email('usuario@exemplo.com');
-- SELECT get_ticket_transfer_history('ticket-uuid');
