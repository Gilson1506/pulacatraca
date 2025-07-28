-- ============================================
-- SCRIPT PARA CORRIGIR TABELA BANK_ACCOUNTS
-- ============================================

-- 1. Verificar se a tabela existe e sua estrutura
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
ORDER BY ordinal_position;

-- 2. Dropar a tabela se existir (CUIDADO: isso apaga todos os dados)
DROP TABLE IF EXISTS bank_accounts CASCADE;

-- 3. Recriar a tabela com a estrutura correta
CREATE TABLE bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  agency TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('corrente', 'poupanca')),
  is_default BOOLEAN DEFAULT FALSE
);

-- 4. Habilitar RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS
CREATE POLICY "Organizadores podem ver suas próprias contas bancárias" ON bank_accounts
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem inserir suas próprias contas bancárias" ON bank_accounts
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem atualizar suas próprias contas bancárias" ON bank_accounts
  FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem deletar suas próprias contas bancárias" ON bank_accounts
  FOR DELETE USING (organizer_id = auth.uid());

-- 6. Função para garantir apenas uma conta padrão
CREATE OR REPLACE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a nova conta está sendo marcada como padrão
    IF NEW.is_default = true THEN
        -- Desmarcar todas as outras contas do mesmo organizador
        UPDATE bank_accounts 
        SET is_default = false 
        WHERE organizer_id = NEW.organizer_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Trigger para garantir apenas uma conta padrão
DROP TRIGGER IF EXISTS ensure_single_default_account ON bank_accounts;
CREATE TRIGGER ensure_single_default_account
    BEFORE INSERT OR UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_account();

-- 8. Verificar a estrutura final
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
ORDER BY ordinal_position;

-- 9. Testar inserção manual (substitua 'SEU_USER_ID' pelo seu ID real)
-- Para obter seu ID: SELECT auth.uid();
/*
INSERT INTO bank_accounts (organizer_id, bank_name, agency, account_number, account_type, is_default)
VALUES 
  (auth.uid(), 'Banco Teste', '0001', '12345-6', 'corrente', true);
*/

-- 10. Verificar se a inserção funcionou
-- SELECT * FROM bank_accounts;