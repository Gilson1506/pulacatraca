-- ✅ CORREÇÃO COMPLETA: RLS + Suporte PIX para Financeiro

-- 1️⃣ ATUALIZAR TABELA bank_accounts com suporte a PIX
ALTER TABLE bank_accounts 
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar constraint para tipo de chave PIX
ALTER TABLE bank_accounts
DROP CONSTRAINT IF EXISTS bank_accounts_pix_key_type_check;

ALTER TABLE bank_accounts
ADD CONSTRAINT bank_accounts_pix_key_type_check 
CHECK (pix_key_type IS NULL OR pix_key_type IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

-- 2️⃣ ATUALIZAR TABELA withdrawals com campos necessários
ALTER TABLE withdrawals
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verificar constraint de status em withdrawals
ALTER TABLE withdrawals
DROP CONSTRAINT IF EXISTS withdrawals_status_check;

ALTER TABLE withdrawals
ADD CONSTRAINT withdrawals_status_check
CHECK (status IN ('pendente', 'processando', 'concluido', 'cancelado'));

-- 3️⃣ POLÍTICAS RLS para bank_accounts

-- Remover políticas antigas
DROP POLICY IF EXISTS "admins_full_access_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "organizers_can_manage_own_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "organizers_insert_own_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "organizers_select_own_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "organizers_update_own_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "organizers_delete_own_bank_accounts" ON bank_accounts;

-- Admin: acesso total
CREATE POLICY "admins_full_access_bank_accounts" ON bank_accounts
FOR ALL USING (is_admin_user());

-- Organizadores: podem gerenciar suas próprias contas
CREATE POLICY "organizers_select_own_bank_accounts" ON bank_accounts
FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "organizers_insert_own_bank_accounts" ON bank_accounts
FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "organizers_update_own_bank_accounts" ON bank_accounts
FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "organizers_delete_own_bank_accounts" ON bank_accounts
FOR DELETE USING (organizer_id = auth.uid());

-- 4️⃣ POLÍTICAS RLS para withdrawals

-- Remover políticas antigas
DROP POLICY IF EXISTS "admins_full_access_withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "organizers_can_view_own_withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "organizers_can_create_withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "organizers_select_own_withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "organizers_insert_own_withdrawals" ON withdrawals;

-- Admin: acesso total (incluindo UPDATE para mudar status)
CREATE POLICY "admins_full_access_withdrawals" ON withdrawals
FOR ALL USING (is_admin_user());

-- Organizadores: podem ver e criar seus próprios saques
CREATE POLICY "organizers_select_own_withdrawals" ON withdrawals
FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "organizers_insert_own_withdrawals" ON withdrawals
FOR INSERT WITH CHECK (organizer_id = auth.uid());

-- 5️⃣ Verificar políticas criadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('bank_accounts', 'withdrawals')
ORDER BY tablename, policyname;

-- 6️⃣ Verificar estrutura das tabelas
SELECT 
    'bank_accounts' as tabela,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'bank_accounts'
ORDER BY ordinal_position;

SELECT 
    'withdrawals' as tabela,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'withdrawals'
ORDER BY ordinal_position;

