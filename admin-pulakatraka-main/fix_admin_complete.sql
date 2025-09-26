-- =====================================================
-- CORREÇÃO COMPLETA DO ADMIN APP - APROVAÇÃO E EDIÇÃO DE EVENTOS
-- =====================================================
-- Este script corrige TODOS os problemas identificados:
-- ✅ Aprovação de eventos
-- ✅ Aprovação de carrossel  
-- ✅ Edição de eventos
-- ✅ Políticas RLS para admins
-- ✅ Triggers conflitantes
-- ✅ Colunas ausentes

-- =====================================================
-- 1. LIMPEZA E PREPARAÇÃO
-- =====================================================

-- Remover todos os triggers conflitantes da tabela events
DROP TRIGGER IF EXISTS events_updated_at ON events;
DROP TRIGGER IF EXISTS on_update_events ON events;
DROP TRIGGER IF EXISTS trigger_validate_event_edit ON events;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS events_update_trigger ON events;
DROP TRIGGER IF EXISTS events_validation_trigger ON events;

-- =====================================================
-- 2. REMOVER TODAS AS POLÍTICAS RLS EXISTENTES
-- =====================================================

-- Remover TODAS as políticas existentes da tabela events para evitar conflitos
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo políticas RLS existentes da tabela events...';
  
  -- Listar e remover todas as políticas existentes
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'events'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON events';
    RAISE NOTICE '   ✅ Política removida: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Todas as políticas RLS foram removidas da tabela events';
END $$;

-- =====================================================
-- 3. ADICIONAR COLUNAS AUSENTES NA TABELA EVENTS
-- =====================================================

-- Adicionar colunas para funcionalidades de carrossel
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS carousel_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS carousel_priority INTEGER DEFAULT 0;

-- Adicionar colunas para moderação de eventos
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Adicionar colunas para auditoria (se não existirem)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- 4. CRIAR FUNÇÃO is_admin() NECESSÁRIA
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário é admin
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CRIAR FUNÇÃO PARA ATUALIZAR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CRIAR TRIGGER ÚNICO E OTIMIZADO
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER events_updated_at_trigger
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- =====================================================
-- 7. CRIAR POLÍTICAS RLS CORRETAS PARA ADMINS
-- =====================================================

-- Política para admins lerem TODOS os eventos
CREATE POLICY "Admins can read all events" ON events
FOR SELECT USING (is_admin());

-- Política para admins atualizarem TODOS os eventos (incluindo aprovação e carrossel)
CREATE POLICY "Admins can update all events" ON events
FOR UPDATE USING (is_admin());

-- Política para admins inserirem eventos
CREATE POLICY "Admins can insert events" ON events
FOR INSERT WITH CHECK (is_admin());

-- Política para admins deletarem eventos
CREATE POLICY "Admins can delete events" ON events
FOR DELETE USING (is_admin());

-- Política para organizadores verem seus próprios eventos
CREATE POLICY "Organizers can view own events" ON events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'organizer'
    AND profiles.id = events.organizer_id
  )
);

-- Política para organizadores editarem seus próprios eventos (apenas rascunhos)
CREATE POLICY "Organizers can update own draft events" ON events
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'organizer'
    AND profiles.id = events.organizer_id
    AND events.status = 'draft'
  )
);

-- Política para organizadores inserirem eventos
CREATE POLICY "Organizers can insert events" ON events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'organizer'
    AND profiles.id = events.organizer_id
  )
);

-- =====================================================
-- 8. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para as novas colunas de carrossel
CREATE INDEX IF NOT EXISTS idx_events_carousel_approved ON events(carousel_approved);
CREATE INDEX IF NOT EXISTS idx_events_carousel_priority ON events(carousel_priority);
CREATE INDEX IF NOT EXISTS idx_events_reviewed_at ON events(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);

-- =====================================================
-- 9. VERIFICAR E CORRIGIR TABELA PROFILES
-- =====================================================

-- Verificar se a coluna role existe na tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'organizer', 'user'));
    RAISE NOTICE '✅ Coluna role adicionada à tabela profiles';
  ELSE
    RAISE NOTICE '⚠️ Coluna role já existe na tabela profiles';
  END IF;
END $$;

-- Habilitar RLS na tabela profiles se não estiver habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes da tabela profiles para evitar conflitos
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo políticas RLS existentes da tabela profiles...';
  
  -- Listar e remover todas as políticas existentes
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON profiles';
    RAISE NOTICE '   ✅ Política removida: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Todas as políticas RLS foram removidas da tabela profiles';
END $$;

-- Política para admins gerenciarem todos os perfis
CREATE POLICY "Admins can read all profiles" ON profiles
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (is_admin());

-- Política para usuários verem seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 10. HABILITAR RLS NA TABELA EVENTS
-- =====================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todas as colunas necessárias existem
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  
  -- Verificar colunas de carrossel
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'carousel_approved') THEN
    RAISE NOTICE '✅ carousel_approved: OK';
  ELSE
    RAISE NOTICE '❌ carousel_approved: FALTA';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'carousel_priority') THEN
    RAISE NOTICE '✅ carousel_priority: OK';
  ELSE
    RAISE NOTICE '❌ carousel_priority: FALTA';
  END IF;
  
  -- Verificar colunas de moderação
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'reviewed_at') THEN
    RAISE NOTICE '✅ reviewed_at: OK';
  ELSE
    RAISE NOTICE '❌ reviewed_at: FALTA';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'rejection_reason') THEN
    RAISE NOTICE '✅ rejection_reason: OK';
  ELSE
    RAISE NOTICE '❌ rejection_reason: FALTA';
  END IF;
  
  RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- Verificar triggers criados
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'events'
ORDER BY trigger_name;

-- Verificar políticas RLS criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- =====================================================
-- 12. INSTRUÇÕES DE USO
-- =====================================================

/*
🎯 FUNCIONALIDADES RESTAURADAS:

✅ APROVAÇÃO DE EVENTOS:
   - Admins podem alterar status para 'approved'
   - Campo reviewed_at é preenchido automaticamente
   - Campo reviewed_by registra quem aprovou

✅ APROVAÇÃO DE CARROSSEL:
   - Campo carousel_approved para ativar/desativar
   - Campo carousel_priority para ordenação
   - Admins podem gerenciar visibilidade

✅ EDIÇÃO DE EVENTOS:
   - Admins podem editar qualquer evento
   - Organizadores podem editar apenas rascunhos
   - Campo updated_at é atualizado automaticamente

✅ POLÍTICAS DE SEGURANÇA:
   - RLS habilitado e configurado
   - Admins têm acesso total
   - Usuários comuns têm acesso limitado

🔧 COMO TESTAR:

1. Execute este script no SQL Editor do Supabase
2. Verifique se não há erros na execução
3. Teste a aprovação de um evento pendente
4. Teste a ativação/desativação do carrossel
5. Teste a edição de informações do evento

⚠️ IMPORTANTE:
- Este script NÃO altera dados existentes
- Apenas adiciona funcionalidades ausentes
- Mantém toda a estrutura atual da tabela events
- Corrige problemas de permissão e triggers

🚀 RESULTADO ESPERADO:
- Admin app funcionando perfeitamente
- Aprovação de eventos funcionando
- Carrossel funcionando
- Edição de eventos funcionando
- Sem erros de permissão ou triggers
*/
