-- Script para corrigir a tabela bank_accounts
-- Problema: coluna 'id' não tem valor padrão (DEFAULT)

-- 1. Adicionar valor padrão para a coluna id
ALTER TABLE public.bank_accounts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Verificar se a extensão uuid-ossp está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Alternativa: se gen_random_uuid() não funcionar, usar uuid_generate_v4()
-- ALTER TABLE public.bank_accounts 
-- ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 4. Verificar a estrutura atualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Testar inserção (opcional)
-- INSERT INTO public.bank_accounts (organizer_id, bank_name, agency, account_number, account_type, is_default)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Teste', '0001', '123456', 'corrente', false);