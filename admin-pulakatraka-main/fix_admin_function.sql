-- Script para corrigir a função is_admin() e políticas RLS
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar se a função existe e removê-la se necessário
DROP FUNCTION IF EXISTS is_admin();

-- 2. Criar a função is_admin() corretamente
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

-- 3. Verificar se a função foi criada corretamente
SELECT is_admin();

-- 4. Atualizar políticas RLS para profiles (se necessário)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert all profiles" ON profiles;

-- Criar políticas para admins usando a função
CREATE POLICY "Admins can read all profiles" ON profiles
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete all profiles" ON profiles
FOR DELETE USING (is_admin());

CREATE POLICY "Admins can insert all profiles" ON profiles
FOR INSERT WITH CHECK (is_admin());

-- 5. Atualizar políticas RLS para events (se necessário)
DROP POLICY IF EXISTS "Admins can read all events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;

CREATE POLICY "Admins can read all events" ON events
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update events" ON events
FOR UPDATE USING (is_admin());

-- 6. Atualizar políticas RLS para tickets (se necessário)
DROP POLICY IF EXISTS "Admins can read all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can insert all tickets" ON tickets;

CREATE POLICY "Admins can read all tickets" ON tickets
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all tickets" ON tickets
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can insert all tickets" ON tickets
FOR INSERT WITH CHECK (is_admin());

-- 7. Atualizar políticas RLS para ticket_history (se necessário)
DROP POLICY IF EXISTS "Admins can read all ticket history" ON ticket_history;

CREATE POLICY "Admins can read all ticket history" ON ticket_history
FOR SELECT USING (is_admin());

-- 8. Verificar se todas as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'events', 'tickets', 'ticket_history')
ORDER BY tablename, policyname;

-- 9. Testar a função com um usuário admin (substitua pelo ID de um admin real)
-- SELECT is_admin(); 