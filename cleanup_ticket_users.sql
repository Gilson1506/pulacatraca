-- ✅ LIMPEZA DE DADOS DUPLICADOS/INVÁLIDOS - Execute no Supabase SQL Editor

-- 1. Mostrar todos os ticket_users para análise
SELECT id, name, email, document, created_at, updated_at 
FROM ticket_users 
ORDER BY created_at DESC;

-- 2. Identificar registros com dados null/empty
SELECT id, name, email, document, created_at,
       CASE 
         WHEN name IS NULL OR name = '' THEN 'Nome vazio'
         WHEN email IS NULL OR email = '' THEN 'Email vazio'
         ELSE 'Dados válidos'
       END as status
FROM ticket_users 
ORDER BY created_at DESC;

-- 3. Deletar registros com dados null/empty (CUIDADO - execute apenas se necessário)
-- DELETE FROM ticket_users 
-- WHERE name IS NULL OR name = '' OR email IS NULL OR email = '';

-- 4. Mostrar tickets que apontam para ticket_users inválidos
SELECT t.id as ticket_id, t.ticket_user_id, tu.name, tu.email
FROM tickets t
LEFT JOIN ticket_users tu ON t.ticket_user_id = tu.id
WHERE t.ticket_user_id IS NOT NULL
ORDER BY t.purchase_date DESC;

-- 5. Resetar ticket_user_id para tickets que apontam para dados inválidos
-- UPDATE tickets 
-- SET ticket_user_id = NULL 
-- WHERE ticket_user_id IN (
--   SELECT id FROM ticket_users 
--   WHERE name IS NULL OR name = '' OR email IS NULL OR email = ''
-- );

-- 6. Verificar resultado final
SELECT 
  COUNT(*) as total_ticket_users,
  COUNT(CASE WHEN name IS NOT NULL AND name != '' AND email IS NOT NULL AND email != '' THEN 1 END) as valid_users,
  COUNT(CASE WHEN name IS NULL OR name = '' OR email IS NULL OR email = '' THEN 1 END) as invalid_users
FROM ticket_users;

-- ✅ INSTRUÇÕES:
-- 1. Execute os SELECT primeiro para ver os dados
-- 2. Se houver dados inválidos, descomente e execute os DELETE/UPDATE
-- 3. Execute o último SELECT para confirmar a limpeza