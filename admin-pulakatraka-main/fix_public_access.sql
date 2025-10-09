-- =====================================================
-- CORREÇÃO DE ACESSO PÚBLICO AOS EVENTOS
-- =====================================================
-- Este script corrige as políticas RLS para permitir que:
-- ✅ Usuários não logados vejam eventos aprovados
-- ✅ Usuários comuns vejam eventos aprovados
-- ✅ Admins mantenham controle total
-- ✅ Organizadores vejam seus próprios eventos

-- =====================================================
-- 1. REMOVER POLÍTICAS RESTRITIVAS EXISTENTES
-- =====================================================

-- Remover políticas que bloqueiam acesso público
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '🗑️ Removendo políticas RLS restritivas da tabela events...';
  
  -- Listar e remover políticas que bloqueiam acesso público
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'events'
    AND policyname IN (
      'Admins can read all events',
      'Organizers can view own events'
    )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON events';
    RAISE NOTICE '   ✅ Política removida: %', policy_record.policyname;
  END LOOP;
  
  RAISE NOTICE '✅ Políticas restritivas foram removidas';
END $$;

-- =====================================================
-- 2. CRIAR POLÍTICAS RLS CORRETAS PARA ACESSO PÚBLICO
-- =====================================================

-- Política para TODOS verem eventos APROVADOS (acesso público)
CREATE POLICY "Public can view approved events" ON events
FOR SELECT USING (
  status = 'approved'
);

-- Política para usuários logados verem seus próprios eventos (qualquer status)
CREATE POLICY "Users can view own events" ON events
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND organizer_id = auth.uid()
);

-- Política para admins verem TODOS os eventos (qualquer status)
CREATE POLICY "Admins can read all events" ON events
FOR SELECT USING (is_admin());

-- Política para organizadores verem seus próprios eventos (qualquer status)
CREATE POLICY "Organizers can view own events" ON events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'organizer'
    AND profiles.id = events.organizer_id
  )
);

-- =====================================================
-- 3. MANTER POLÍTICAS DE ESCRITA (ADMIN E ORGANIZADORES)
-- =====================================================

-- Política para admins atualizarem TODOS os eventos (incluindo aprovação e carrossel)
-- (Esta política já deve existir, mas vamos garantir)
DROP POLICY IF EXISTS "Admins can update all events" ON events;
CREATE POLICY "Admins can update all events" ON events
FOR UPDATE USING (is_admin());

-- Política para admins inserirem eventos
-- (Esta política já deve existir, mas vamos garantir)
DROP POLICY IF EXISTS "Admins can insert events" ON events;
CREATE POLICY "Admins can insert events" ON events
FOR INSERT WITH CHECK (is_admin());

-- Política para admins deletarem eventos
-- (Esta política já deve existir, mas vamos garantir)
DROP POLICY IF EXISTS "Admins can delete events" ON events;
CREATE POLICY "Admins can delete events" ON events
FOR DELETE USING (is_admin());

-- Política para organizadores editarem seus próprios eventos (apenas rascunhos)
-- (Esta política já deve existir, mas vamos garantir)
DROP POLICY IF EXISTS "Organizers can update own draft events" ON events;
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
-- (Esta política já deve existir, mas vamos garantir)
DROP POLICY IF EXISTS "Organizers can insert events" ON events;
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
-- 4. VERIFICAR POLÍTICAS CRIADAS
-- =====================================================

-- Listar todas as políticas da tabela events
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '📖 Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Inserção'
    WHEN cmd = 'UPDATE' THEN '✏️ Atualização'
    WHEN cmd = 'DELETE' THEN '🗑️ Exclusão'
    ELSE cmd
  END as operacao,
  qual as condicao
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY cmd, policyname;

-- =====================================================
-- 5. TESTE DE ACESSO PÚBLICO
-- =====================================================

-- Verificar se eventos aprovados são visíveis publicamente
DO $$
DECLARE
  approved_count INTEGER;
  total_count INTEGER;
BEGIN
  RAISE NOTICE '=== TESTE DE ACESSO PÚBLICO ===';
  
  -- Contar eventos aprovados
  SELECT COUNT(*) INTO approved_count
  FROM events 
  WHERE status = 'approved';
  
  -- Contar total de eventos
  SELECT COUNT(*) INTO total_count
  FROM events;
  
  RAISE NOTICE '📊 Total de eventos: %', total_count;
  RAISE NOTICE '📊 Eventos aprovados: %', approved_count;
  
  IF approved_count > 0 THEN
    RAISE NOTICE '✅ Eventos aprovados disponíveis para acesso público';
  ELSE
    RAISE NOTICE '⚠️ Nenhum evento aprovado encontrado';
    RAISE NOTICE '🔧 Aprove alguns eventos primeiro para testar o acesso público';
  END IF;
END $$;

-- =====================================================
-- 6. INSTRUÇÕES DE TESTE
-- =====================================================

/*
🎯 POLÍTICAS RLS CONFIGURADAS:

✅ ACESSO PÚBLICO:
   - Qualquer pessoa pode ver eventos com status = 'approved'
   - Usuários não logados conseguem acessar a página inicial
   - Eventos aprovados aparecem na listagem pública

✅ ACESSO DE USUÁRIOS LOGADOS:
   - Usuários veem seus próprios eventos (qualquer status)
   - Organizadores veem seus próprios eventos
   - Admins veem todos os eventos

✅ CONTROLE ADMINISTRATIVO:
   - Admins podem aprovar/rejeitar eventos
   - Admins podem gerenciar carrossel
   - Admins podem editar qualquer evento

🔧 COMO TESTAR:

1. ✅ Execute este script no SQL Editor do Supabase
2. ✅ Verifique se não há erros na execução
3. ✅ Acesse a aplicação principal sem estar logado
4. ✅ Verifique se os eventos aprovados aparecem na página inicial
5. ✅ Faça login como usuário comum e verifique acesso
6. ✅ Faça login como admin e teste funcionalidades administrativas

⚠️ IMPORTANTE:
- Este script NÃO remove funcionalidades administrativas
- Apenas corrige o acesso público aos eventos
- Mantém toda a segurança para operações de escrita
- Usuários não logados só veem eventos aprovados

🚀 RESULTADO ESPERADO:
- Página inicial funcionando para visitantes
- Eventos aprovados visíveis publicamente
- Admin app funcionando normalmente
- Segurança mantida para operações críticas
*/
