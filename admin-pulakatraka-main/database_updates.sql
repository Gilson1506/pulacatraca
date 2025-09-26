-- Atualizações necessárias para a tabela events no Supabase
-- Execute estes comandos no SQL Editor do Supabase

-- 1. Adicionar colunas para funcionalidades de carrossel (se não existirem)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS carousel_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS carousel_priority INTEGER DEFAULT 0;

-- 2. Adicionar colunas para moderação (se não existirem)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Atualizar RLS policies para permitir que admins modifiquem eventos
-- Primeiro, remover políticas existentes se necessário
DROP POLICY IF EXISTS "Admins can update events" ON events;

-- Criar nova política para admins
CREATE POLICY "Admins can update events" ON events
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 4. Verificar se a política de leitura existe
DROP POLICY IF EXISTS "Admins can read all events" ON events;

CREATE POLICY "Admins can read all events" ON events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 5. Habilitar RLS na tabela events (se não estiver habilitado)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 6. CORREÇÃO: Políticas RLS para a tabela profiles (sem recursão infinita)
-- Primeiro, remover todas as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Política simples para permitir que usuários vejam seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Política simples para permitir que usuários atualizem seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Política para permitir inserção de novos perfis (durante registro)
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Habilitar RLS na tabela profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 8. Criar uma função para verificar se o usuário é admin (sem recursão)
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

-- 9. Criar políticas para admins usando a função
CREATE POLICY "Admins can read all profiles" ON profiles
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete all profiles" ON profiles
FOR DELETE USING (is_admin());

CREATE POLICY "Admins can insert all profiles" ON profiles
FOR INSERT WITH CHECK (is_admin());

-- 10. ATUALIZAR TABELA TICKETS - Sistema de Ingressos com Usuário Opcional
-- Adicionar colunas necessárias para o sistema de ingressos
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_user_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_user_email TEXT,
ADD COLUMN IF NOT EXISTS assigned_user_phone TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS check_in_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS check_in_location TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES profiles(id);

-- 11. Criar tabela de histórico de ingressos
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'purchased', 'assigned', 'unassigned', 'checked_in', 'used', 'cancelled'
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_email TEXT,
  action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_user_id ON tickets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_action_date ON ticket_history(action_date);

-- 13. Criar função para registrar histórico de ingressos
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

-- 14. Criar trigger para registrar histórico automaticamente
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

-- Criar trigger
DROP TRIGGER IF EXISTS ticket_changes_trigger ON tickets;
CREATE TRIGGER ticket_changes_trigger
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_ticket_changes();

-- 15. RLS Policies para tickets
DROP POLICY IF EXISTS "Admins can read all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON tickets;

-- Políticas para admins
CREATE POLICY "Admins can read all tickets" ON tickets
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all tickets" ON tickets
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can insert all tickets" ON tickets
FOR INSERT WITH CHECK (is_admin());

-- Políticas para usuários
CREATE POLICY "Users can view own tickets" ON tickets
FOR SELECT USING (
  user_id = auth.uid() OR assigned_user_id = auth.uid()
);

CREATE POLICY "Users can update own tickets" ON tickets
FOR UPDATE USING (
  user_id = auth.uid() OR assigned_user_id = auth.uid()
);

-- 16. RLS Policies para ticket_history
DROP POLICY IF EXISTS "Admins can read all ticket history" ON ticket_history;
DROP POLICY IF EXISTS "Users can view own ticket history" ON ticket_history;

CREATE POLICY "Admins can read all ticket history" ON ticket_history
FOR SELECT USING (is_admin());

CREATE POLICY "Users can view own ticket history" ON ticket_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_history.ticket_id 
    AND (tickets.user_id = auth.uid() OR tickets.assigned_user_id = auth.uid())
  )
);

-- 17. Habilitar RLS nas tabelas
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- 18. Verificar estrutura das tabelas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position; 