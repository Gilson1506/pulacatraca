-- Script simples para corrigir o problema
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. CRIAR FUNÇÃO IS_ADMIN() PRIMEIRO
-- =====================================================

-- Remover função se existir
DROP FUNCTION IF EXISTS is_admin();

-- Criar função is_admin()
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário é admin usando uma consulta simples
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. ADICIONAR COLUNAS FALTANTES NA TABELA TICKETS
-- =====================================================

-- Adicionar colunas para usuário atribuído
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_user_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_user_email TEXT,
ADD COLUMN IF NOT EXISTS assigned_user_phone TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id);

-- Adicionar colunas para check-in
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS check_in_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS check_in_location TEXT;

-- Adicionar colunas para uso
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES profiles(id);

-- Adicionar coluna para notas
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 3. CRIAR TABELA TICKET_HISTORY
-- =====================================================

-- Criar tabela de histórico
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
-- 4. CRIAR ÍNDICES
-- =====================================================

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_user_id ON tickets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);

-- Índices para ticket_history
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_action_date ON ticket_history(action_date);

-- =====================================================
-- 5. HABILITAR RLS
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CRIAR POLÍTICAS RLS SIMPLES
-- =====================================================

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
-- 7. VERIFICAÇÃO
-- =====================================================

-- Testar se a função is_admin() funciona
SELECT is_admin() as is_admin_function_working;

-- Verificar estrutura da tabela tickets
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

-- Mensagem de sucesso
SELECT 'Script executado com sucesso! Tabela tickets atualizada.' as status; 