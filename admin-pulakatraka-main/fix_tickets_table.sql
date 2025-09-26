-- Script para adicionar colunas faltantes na tabela tickets
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA TICKETS
-- =====================================================

-- Verificar quais colunas existem atualmente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- =====================================================
-- 2. ADICIONAR COLUNAS FALTANTES NA TABELA TICKETS
-- =====================================================

-- Adicionar colunas para usuário atribuído (se não existirem)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_user_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_user_email TEXT,
ADD COLUMN IF NOT EXISTS assigned_user_phone TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id);

-- Adicionar colunas para check-in (se não existirem)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS check_in_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS check_in_location TEXT;

-- Adicionar colunas para uso (se não existirem)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES profiles(id);

-- Adicionar coluna para notas (se não existir)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 3. VERIFICAR E CRIAR TABELA TICKET_HISTORY
-- =====================================================

-- Criar tabela de histórico se não existir
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('purchased', 'assigned', 'unassigned', 'checked_in', 'used', 'cancelled', 'status_changed')),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_email TEXT,
  action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CRIAR ÍNDICES FALTANTES
-- =====================================================

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_user_id ON tickets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);

-- Índices para ticket_history
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_action_date ON ticket_history(action_date);

-- =====================================================
-- 5. CRIAR FUNÇÕES FALTANTES
-- =====================================================

-- Função para registrar histórico de ingressos
CREATE OR REPLACE FUNCTION log_ticket_action(
  p_ticket_id UUID,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ticket_history (
    ticket_id, action, user_id, user_name, user_email, details
  ) VALUES (
    p_ticket_id, p_action, p_user_id, p_user_name, p_user_email, p_details
  );
END;
$$ LANGUAGE plpgsql;

-- Função para trigger de mudanças em ingressos
CREATE OR REPLACE FUNCTION trigger_log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar mudanças no status
  IF OLD.status != NEW.status THEN
    PERFORM log_ticket_action(
      NEW.id,
      'status_changed',
      auth.uid(),
      (SELECT name FROM profiles WHERE id = auth.uid()),
      (SELECT email FROM profiles WHERE id = auth.uid()),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  -- Registrar atribuição de usuário
  IF OLD.assigned_user_id IS NULL AND NEW.assigned_user_id IS NOT NULL THEN
    PERFORM log_ticket_action(
      NEW.id,
      'assigned',
      NEW.assigned_user_id,
      NEW.assigned_user_name,
      NEW.assigned_user_email,
      jsonb_build_object(
        'assigned_by', auth.uid(),
        'assigned_at', NEW.assigned_at
      )
    );
  END IF;
  
  -- Registrar check-in
  IF OLD.check_in_date IS NULL AND NEW.check_in_date IS NOT NULL THEN
    PERFORM log_ticket_action(
      NEW.id,
      'checked_in',
      NEW.assigned_user_id,
      NEW.assigned_user_name,
      NEW.assigned_user_email,
      jsonb_build_object(
        'check_in_by', NEW.check_in_by,
        'check_in_location', NEW.check_in_location
      )
    );
  END IF;
  
  -- Registrar uso
  IF OLD.is_used = false AND NEW.is_used = true THEN
    PERFORM log_ticket_action(
      NEW.id,
      'used',
      NEW.assigned_user_id,
      NEW.assigned_user_name,
      NEW.assigned_user_email,
      jsonb_build_object(
        'used_by', NEW.used_by,
        'used_at', NEW.used_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CRIAR TRIGGER
-- =====================================================

-- Trigger para registrar mudanças em ingressos
DROP TRIGGER IF EXISTS ticket_changes_trigger ON tickets;
CREATE TRIGGER ticket_changes_trigger
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_ticket_changes();

-- =====================================================
-- 7. HABILITAR RLS E CRIAR POLÍTICAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Políticas para tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can read all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can insert all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete all tickets" ON tickets;

-- Políticas para usuários comuns
CREATE POLICY "Users can view own tickets" ON tickets
FOR SELECT USING (
  user_id = auth.uid() OR assigned_user_id = auth.uid()
);

CREATE POLICY "Users can update own tickets" ON tickets
FOR UPDATE USING (
  user_id = auth.uid() OR assigned_user_id = auth.uid()
);

-- Políticas para admins
CREATE POLICY "Admins can read all tickets" ON tickets
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all tickets" ON tickets
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can insert all tickets" ON tickets
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can delete all tickets" ON tickets
FOR DELETE USING (is_admin());

-- Políticas para ticket_history
DROP POLICY IF EXISTS "Users can view own ticket history" ON ticket_history;
DROP POLICY IF EXISTS "Admins can read all ticket history" ON ticket_history;

CREATE POLICY "Users can view own ticket history" ON ticket_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_history.ticket_id 
    AND (tickets.user_id = auth.uid() OR tickets.assigned_user_id = auth.uid())
  )
);

CREATE POLICY "Admins can read all ticket history" ON ticket_history
FOR SELECT USING (is_admin());

-- =====================================================
-- 8. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar estrutura final da tabela tickets
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- Verificar se a tabela ticket_history foi criada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_history' 
ORDER BY ordinal_position;

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('tickets', 'ticket_history')
ORDER BY tablename, policyname;

-- Testar se tudo está funcionando
SELECT 'Tickets table structure updated successfully' as status; 