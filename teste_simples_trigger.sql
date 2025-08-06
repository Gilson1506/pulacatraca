-- TESTE SIMPLES DO TRIGGER
-- Execute uma linha por vez para identificar onde falha

-- 1. Verificar se tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('tickets', 'ticket_users');

-- 2. Verificar estrutura da tabela tickets
SELECT column_name, is_nullable FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'user_id';

-- 3. Teste básico - inserir ticket com user_id NULL
INSERT INTO tickets (id, user_id) VALUES (gen_random_uuid(), NULL);

-- 4. Se o teste 3 falhou, execute isto:
-- ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;

-- 5. Depois teste novamente:
-- INSERT INTO tickets (id, user_id) VALUES (gen_random_uuid(), NULL);