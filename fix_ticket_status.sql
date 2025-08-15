-- ✅ CORRIGIR STATUS DOS INGRESSOS - Execute no Supabase SQL Editor

-- 1. Atualizar todos os ingressos 'pending' para 'valid'
UPDATE tickets 
SET status = 'valid' 
WHERE status = 'pending' OR status = 'active';

-- 2. Verificar se a atualização funcionou
SELECT status, COUNT(*) as quantidade 
FROM tickets 
GROUP BY status 
ORDER BY status;

-- 3. Verificar alguns ingressos específicos
SELECT id, event_id, user_id, status, purchase_date 
FROM tickets 
WHERE status = 'valid' 
LIMIT 5;

-- ✅ RESULTADO ESPERADO:
-- Todos os ingressos que estavam 'pending' ou 'active' agora devem estar 'valid'
-- O botão "Definir Utilizador" deve aparecer para estes ingressos

-- 📝 NOTA: 
-- Os únicos status válidos para ingressos são:
-- • 'valid' - Ingresso válido (pode definir usuário)
-- • 'used' - Ingresso já utilizado no evento
-- • 'cancelled' - Ingresso cancelado
-- • 'expired' - Ingresso expirado