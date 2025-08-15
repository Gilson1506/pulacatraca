-- ============================================
-- FIX TICKETS TABLE: VERSÃO SIMPLES (SEM RAISE)
-- ============================================

-- Verificar estrutura atual da tabela tickets
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- ============================================
-- ADICIONAR COLUNAS SE NÃO EXISTIREM
-- ============================================

-- Adicionar coluna ticket_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'ticket_type'
    ) THEN
        ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'Padrão';
    END IF;
END $$;

-- Adicionar coluna buyer_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'buyer_id'
    ) THEN
        ALTER TABLE tickets ADD COLUMN buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Adicionar coluna event_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE tickets ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Adicionar coluna user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE tickets ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Adicionar coluna status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'status'
    ) THEN
        ALTER TABLE tickets ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Adicionar coluna code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'code'
    ) THEN
        ALTER TABLE tickets ADD COLUMN code TEXT;
    END IF;
END $$;

-- Adicionar coluna created_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE tickets ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- Adicionar coluna used_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'used_at'
    ) THEN
        ALTER TABLE tickets ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Adicionar coluna notes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'notes'
    ) THEN
        ALTER TABLE tickets ADD COLUMN notes TEXT;
    END IF;
END $$;

-- ============================================
-- ADICIONAR CONSTRAINTS SE NÃO EXISTIREM
-- ============================================

-- Constraint para status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'tickets_status_check'
    ) THEN
        ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
        CHECK (status IN ('pending', 'active', 'used', 'cancelled'));
    END IF;
END $$;

-- ============================================
-- CRIAR ÍNDICES SE NÃO EXISTIREM
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- ============================================
-- FUNÇÃO PARA GERAR CÓDIGO ÚNICO DO TICKET
-- ============================================

CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN := TRUE;
    new_code TEXT;
BEGIN
    WHILE code_exists LOOP
        result := '';
        FOR i IN 1..8 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        new_code := result;
        
        -- Verificar se o código já existe
        SELECT EXISTS(SELECT 1 FROM tickets WHERE code = new_code) INTO code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER PARA GERAR CÓDIGO AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION set_ticket_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := generate_ticket_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_set_ticket_code ON tickets;

-- Criar trigger para gerar código automaticamente
CREATE TRIGGER trigger_set_ticket_code
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_code();

-- ============================================
-- HABILITAR RLS E CRIAR POLÍTICAS
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Compradores podem ver seus tickets" ON tickets;
DROP POLICY IF EXISTS "Organizadores podem ver tickets dos seus eventos" ON tickets;
DROP POLICY IF EXISTS "Sistema pode inserir tickets" ON tickets;
DROP POLICY IF EXISTS "Compradores podem atualizar seus tickets" ON tickets;
DROP POLICY IF EXISTS "Organizadores podem atualizar tickets dos seus eventos" ON tickets;
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode inserir tickets" ON tickets;
DROP POLICY IF EXISTS "Compradores podem ver seus tickets via buyer_id" ON tickets;
DROP POLICY IF EXISTS "Usuários podem ver tickets atribuídos a eles" ON tickets;
DROP POLICY IF EXISTS "Acesso por event_id quando user info não disponível" ON tickets;

-- Política: Qualquer usuário autenticado pode inserir tickets
CREATE POLICY "Qualquer usuário autenticado pode inserir tickets" ON tickets
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Política: Compradores podem ver seus tickets (buyer_id)
CREATE POLICY "Compradores podem ver seus tickets via buyer_id" ON tickets
  FOR SELECT 
  TO authenticated
  USING (buyer_id = auth.uid());

-- Política: Usuários podem ver tickets atribuídos a eles (user_id)
CREATE POLICY "Usuários podem ver tickets atribuídos a eles" ON tickets
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Política: Organizadores podem ver tickets dos seus eventos
CREATE POLICY "Organizadores podem ver tickets dos seus eventos" ON tickets
  FOR SELECT 
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Política: Compradores podem atualizar seus tickets
CREATE POLICY "Compradores podem atualizar seus tickets" ON tickets
  FOR UPDATE 
  TO authenticated
  USING (buyer_id = auth.uid());

-- Política: Organizadores podem atualizar tickets dos seus eventos
CREATE POLICY "Organizadores podem atualizar tickets dos seus eventos" ON tickets
  FOR UPDATE 
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Política: Fallback para casos especiais
CREATE POLICY "Acesso por event_id quando user info não disponível" ON tickets
  FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE organizer_id = auth.uid() 
      OR status = 'approved'
    )
  );

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Mostrar estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- Mostrar políticas RLS
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

-- Teste de geração de código
SELECT generate_ticket_code() as codigo_exemplo;

-- ============================================
-- COMENTÁRIOS SOBRE CONFIGURAÇÃO
-- ============================================

COMMENT ON TABLE tickets IS 'Ingressos gerados para eventos';
COMMENT ON COLUMN tickets.event_id IS 'ID do evento relacionado';
COMMENT ON COLUMN tickets.buyer_id IS 'ID da pessoa que comprou o ingresso';
COMMENT ON COLUMN tickets.user_id IS 'ID da pessoa que vai usar o ingresso (definido pelo comprador)';
COMMENT ON COLUMN tickets.code IS 'Código único do ingresso (gerado automaticamente)';
COMMENT ON COLUMN tickets.ticket_type IS 'Tipo do ingresso (Padrão, VIP, etc.)';
COMMENT ON COLUMN tickets.status IS 'Status: pending (pendente), active (ativo), used (usado), cancelled (cancelado)';
COMMENT ON COLUMN tickets.created_at IS 'Data e hora da criação do ingresso';
COMMENT ON COLUMN tickets.used_at IS 'Data e hora do uso do ingresso';
COMMENT ON COLUMN tickets.notes IS 'Observações sobre o ingresso';