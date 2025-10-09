-- =====================================================
-- CRIAR USUÁRIO ADMIN NECESSÁRIO
-- =====================================================
-- Este script garante que existe um usuário admin no sistema
-- Execute APÓS executar o fix_admin_complete.sql

-- =====================================================
-- 1. VERIFICAR SE EXISTE USUÁRIO ADMIN
-- =====================================================

DO $$
DECLARE
  admin_count INTEGER;
  user_email TEXT;
BEGIN
  -- Verificar se existe pelo menos um admin
  SELECT COUNT(*) INTO admin_count
  FROM profiles 
  WHERE role = 'admin';
  
  IF admin_count = 0 THEN
    RAISE NOTICE '❌ Nenhum usuário admin encontrado!';
    RAISE NOTICE '⚠️ É necessário criar um usuário admin para o sistema funcionar';
    
    -- Verificar se existe algum usuário na tabela profiles
    SELECT COUNT(*) INTO admin_count
    FROM profiles;
    
    IF admin_count > 0 THEN
      RAISE NOTICE '📋 Usuários existentes na tabela profiles:';
      
      -- Listar usuários existentes
      FOR user_email IN 
        SELECT email FROM profiles ORDER BY created_at DESC LIMIT 5
      LOOP
        RAISE NOTICE '   - %', user_email;
      END LOOP;
      
      RAISE NOTICE '';
      RAISE NOTICE '🔧 Para criar um admin, execute:';
      RAISE NOTICE '   UPDATE profiles SET role = ''admin'' WHERE email = ''SEU_EMAIL_AQUI'';';
      
    ELSE
      RAISE NOTICE '📋 Tabela profiles está vazia';
      RAISE NOTICE '🔧 Crie um usuário primeiro através do sistema de registro';
    END IF;
    
  ELSE
    RAISE NOTICE '✅ % usuário(s) admin encontrado(s)', admin_count;
    
    -- Listar admins existentes
    RAISE NOTICE '📋 Admins ativos:';
    FOR user_email IN 
      SELECT email FROM profiles WHERE role = 'admin' ORDER BY created_at DESC
    LOOP
      RAISE NOTICE '   - %', user_email;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- 2. VERIFICAR ESTRUTURA DA TABELA PROFILES
-- =====================================================

-- Verificar se a coluna role existe e tem os valores corretos
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- =====================================================
-- 3. VERIFICAR DISTRIBUIÇÃO DE ROLES
-- =====================================================

SELECT 
  role,
  COUNT(*) as user_count,
  CASE 
    WHEN role = 'admin' THEN '👑 Administradores'
    WHEN role = 'organizer' THEN '🎪 Organizadores'
    WHEN role = 'user' THEN '👤 Usuários comuns'
    ELSE '❓ Role desconhecido: ' || role
  END as role_description
FROM profiles 
GROUP BY role
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'organizer' THEN 2
    WHEN 'user' THEN 3
    ELSE 4
  END;

-- =====================================================
-- 4. INSTRUÇÕES PARA CRIAR ADMIN
-- =====================================================

/*
🔧 COMO CRIAR UM USUÁRIO ADMIN:

OPÇÃO 1 - Atualizar usuário existente:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'seu_email@exemplo.com';

OPÇÃO 2 - Criar novo usuário admin:
INSERT INTO profiles (id, email, name, role, created_at)
VALUES (
  gen_random_uuid(),
  'admin@exemplo.com',
  'Administrador',
  'admin',
  NOW()
);

OPÇÃO 3 - Atualizar primeiro usuário registrado:
UPDATE profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

⚠️ IMPORTANTE:
- Apenas usuários com role = 'admin' podem acessar o admin app
- Sem um admin, as funcionalidades de aprovação não funcionarão
- Execute este script APÓS o fix_admin_complete.sql
- Verifique se não há erros na execução

✅ APÓS CRIAR O ADMIN:
1. Faça login no admin app com o usuário admin
2. Teste a aprovação de um evento
3. Teste a funcionalidade de carrossel
4. Teste a edição de eventos
*/
