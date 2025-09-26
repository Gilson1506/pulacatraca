-- Script para corrigir erros do dashboard
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. ADICIONAR COLUNAS FALTANTES EM PROFILES
-- =====================================================

-- Adicionar coluna status se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));

-- =====================================================
-- 2. ADICIONAR COLUNAS FALTANTES EM TICKETS
-- =====================================================

-- Adicionar coluna used se não existir
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false;

-- Adicionar coluna read se não existir (para notificações)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- =====================================================
-- 3. CRIAR TABELA MESSAGES SE NÃO EXISTIR
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. HABILITAR RLS PARA MESSAGES
-- =====================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS RLS PARA MESSAGES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Admins can manage all messages') THEN
    CREATE POLICY "Admins can manage all messages" ON messages FOR ALL USING (is_admin());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view own messages') THEN
    CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update own messages') THEN
    CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- 6. CORRIGIR DADOS DE EXEMPLO EM ACTIVITIES
-- =====================================================

-- Atualizar activities para ter o campo 'type' correto
UPDATE activities 
SET entity_type = 'user' 
WHERE entity_type IS NULL OR entity_type = '';

-- Inserir mais atividades de exemplo com tipos corretos
INSERT INTO activities (user_id, action, description, entity_type, entity_id)
SELECT 
  p.id,
  'event_created',
  'Novo evento criado',
  'event',
  NULL
FROM profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE action = 'event_created' AND user_id = p.id)
LIMIT 1;

INSERT INTO activities (user_id, action, description, entity_type, entity_id)
SELECT 
  p.id,
  'payment_received',
  'Pagamento recebido',
  'payment',
  NULL
FROM profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE action = 'payment_received' AND user_id = p.id)
LIMIT 1;

INSERT INTO activities (user_id, action, description, entity_type, entity_id)
SELECT 
  p.id,
  'system_alert',
  'Alerta do sistema',
  'alert',
  NULL
FROM profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE action = 'system_alert' AND user_id = p.id)
LIMIT 1;

-- =====================================================
-- 7. ATUALIZAR PROFILES COM STATUS
-- =====================================================

-- Definir status para usuários existentes
UPDATE profiles 
SET status = 'active' 
WHERE status IS NULL OR status = '';

-- =====================================================
-- 8. ATUALIZAR TICKETS COM USED
-- =====================================================

-- Definir used para tickets existentes
UPDATE tickets 
SET used = false 
WHERE used IS NULL;

-- =====================================================
-- 9. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar colunas adicionadas
SELECT 
  'Colunas adicionadas:' as info,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'tickets')
  AND column_name IN ('status', 'used', 'read')
  AND table_schema = 'public';

-- Verificar tabela messages
SELECT 
  'Tabela messages:' as info,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name = 'messages'
  AND table_schema = 'public';

-- Verificar activities com tipos corretos
SELECT 
  'Activities com tipos:' as info,
  entity_type,
  COUNT(*) as count
FROM activities 
GROUP BY entity_type;

-- Mensagem de sucesso
SELECT 'Erros do dashboard corrigidos com sucesso!' as status; 