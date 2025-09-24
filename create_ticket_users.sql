-- ✅ CRIAR TABELA TICKET_USERS - Execute no Supabase SQL Editor

-- 1. Criar tabela ticket_users
CREATE TABLE IF NOT EXISTS ticket_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    document TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar coluna ticket_user_id na tabela tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_user_id UUID REFERENCES ticket_users(id) ON DELETE SET NULL;

-- 3. Habilitar RLS
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS básicas
CREATE POLICY "Users can manage ticket users" ON ticket_users FOR ALL USING (true);

-- 5. Criar índices
CREATE INDEX IF NOT EXISTS idx_ticket_users_email ON ticket_users(email);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_user_id ON tickets(ticket_user_id);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ticket_users_updated_at
    BEFORE UPDATE ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Pronto! Agora a tabela ticket_users existe e pode ser usada.