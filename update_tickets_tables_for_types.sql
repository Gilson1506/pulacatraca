-- =====================================================
-- ATUALIZAÇÃO DAS TABELAS TICKETS E TICKET_USERS
-- Para suporte completo aos tipos de ingressos
-- =====================================================

-- 1. ATUALIZAR TABELA TICKETS
-- Adicionar campos para tipos de ingressos

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES public.event_ticket_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ticket_type_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS ticket_area VARCHAR(100),
ADD COLUMN IF NOT EXISTS ticket_sector VARCHAR(100),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('masculine', 'feminine', 'unisex')),
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS has_half_price BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS batch_number INTEGER,
ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.tickets.ticket_type_id IS 'Referência ao tipo de ingresso em event_ticket_types';
COMMENT ON COLUMN public.tickets.ticket_type_name IS 'Nome do tipo de ingresso (ex: VIP, Pista, Camarote)';
COMMENT ON COLUMN public.tickets.ticket_area IS 'Área do ingresso (ex: Pista, Camarote, Backstage)';
COMMENT ON COLUMN public.tickets.ticket_sector IS 'Setor específico dentro da área';
COMMENT ON COLUMN public.tickets.gender IS 'Gênero do ingresso (masculino, feminino, unissex)';
COMMENT ON COLUMN public.tickets.original_price IS 'Preço original antes de descontos';
COMMENT ON COLUMN public.tickets.has_half_price IS 'Se o ingresso tem desconto de meia-entrada';
COMMENT ON COLUMN public.tickets.batch_number IS 'Número do lote/batch';
COMMENT ON COLUMN public.tickets.batch_name IS 'Nome do lote (ex: 1º Lote, 2º Lote)';

-- 2. ATUALIZAR TABELA TICKET_USERS
-- Adicionar campos para informações do usuário do ingresso

ALTER TABLE public.ticket_users
ADD COLUMN IF NOT EXISTS ticket_type_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS ticket_area VARCHAR(100),
ADD COLUMN IF NOT EXISTS ticket_sector VARCHAR(100),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('masculine', 'feminine', 'unisex')),
ADD COLUMN IF NOT EXISTS is_half_price BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'cpf',
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Adicionar comentários
COMMENT ON COLUMN public.ticket_users.ticket_type_name IS 'Nome do tipo de ingresso do usuário';
COMMENT ON COLUMN public.ticket_users.ticket_area IS 'Área do ingresso do usuário';
COMMENT ON COLUMN public.ticket_users.ticket_sector IS 'Setor do ingresso do usuário';
COMMENT ON COLUMN public.ticket_users.gender IS 'Gênero do ingresso do usuário';
COMMENT ON COLUMN public.ticket_users.is_half_price IS 'Se o usuário tem direito a meia-entrada';
COMMENT ON COLUMN public.ticket_users.document_type IS 'Tipo de documento (cpf, rg, passaporte)';
COMMENT ON COLUMN public.ticket_users.birth_date IS 'Data de nascimento para validação de idade';
COMMENT ON COLUMN public.ticket_users.phone IS 'Telefone de contato do usuário';

-- 3. CRIAR ÍNDICES PARA PERFORMANCE

-- Índices na tabela tickets
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON public.tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_name ON public.tickets(ticket_type_name);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_area ON public.tickets(ticket_area);
CREATE INDEX IF NOT EXISTS idx_tickets_gender ON public.tickets(gender);
CREATE INDEX IF NOT EXISTS idx_tickets_batch_number ON public.tickets(batch_number);

-- Índices na tabela ticket_users
CREATE INDEX IF NOT EXISTS idx_ticket_users_ticket_type_name ON public.ticket_users(ticket_type_name);
CREATE INDEX IF NOT EXISTS idx_ticket_users_ticket_area ON public.ticket_users(ticket_area);
CREATE INDEX IF NOT EXISTS idx_ticket_users_gender ON public.ticket_users(gender);
CREATE INDEX IF NOT EXISTS idx_ticket_users_document_type ON public.ticket_users(document_type);

-- 4. FUNÇÃO PARA SINCRONIZAR DADOS DE TICKET TYPES

CREATE OR REPLACE FUNCTION sync_ticket_with_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Se ticket_type_id foi definido, buscar dados do tipo
    IF NEW.ticket_type_id IS NOT NULL THEN
        SELECT 
            ett.name,
            ett.area,
            ett.sector,
            CASE 
                WHEN NEW.gender = 'feminine' THEN ett.price_feminine
                ELSE ett.price
            END,
            ett.has_half_price
        INTO 
            NEW.ticket_type_name,
            NEW.ticket_area,
            NEW.ticket_sector,
            NEW.original_price,
            NEW.has_half_price
        FROM event_ticket_types ett
        WHERE ett.id = NEW.ticket_type_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_ticket_with_type ON public.tickets;
CREATE TRIGGER trigger_sync_ticket_with_type
    BEFORE INSERT OR UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION sync_ticket_with_type();

-- 5. FUNÇÃO PARA SINCRONIZAR TICKET_USERS COM TICKETS

CREATE OR REPLACE FUNCTION sync_ticket_user_with_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar dados do ticket para o ticket_user
    IF NEW.ticket_id IS NOT NULL THEN
        SELECT 
            t.ticket_type_name,
            t.ticket_area,
            t.ticket_sector,
            t.gender
        INTO 
            NEW.ticket_type_name,
            NEW.ticket_area,
            NEW.ticket_sector,
            NEW.gender
        FROM tickets t
        WHERE t.id = NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronização
DROP TRIGGER IF EXISTS trigger_sync_ticket_user_with_ticket ON public.ticket_users;
CREATE TRIGGER trigger_sync_ticket_user_with_ticket
    BEFORE INSERT OR UPDATE ON public.ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION sync_ticket_user_with_ticket();

-- 6. VIEW PARA CONSULTAS OTIMIZADAS

CREATE OR REPLACE VIEW tickets_with_details AS
SELECT 
    t.id,
    t.code,
    t.qr_code,
    t.event_id,
    t.user_id,
    t.buyer_id,
    t.price,
    t.original_price,
    t.status,
    t.created_at,
    t.updated_at,
    
    -- Dados do tipo de ingresso
    t.ticket_type_id,
    t.ticket_type_name,
    t.ticket_area,
    t.ticket_sector,
    t.gender,
    t.has_half_price,
    t.batch_number,
    t.batch_name,
    
    -- Dados do evento
    e.title as event_title,
    e.start_date as event_start_date,
    e.location as event_location,
    e.image as event_image,
    
    -- Dados do usuário do ingresso
    tu.name as ticket_user_name,
    tu.email as ticket_user_email,
    tu.document as ticket_user_document,
    tu.document_type as ticket_user_document_type,
    tu.birth_date as ticket_user_birth_date,
    tu.phone as ticket_user_phone
    
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN ticket_users tu ON t.id = tu.ticket_id;

-- 7. FUNÇÃO PARA MIGRAR DADOS EXISTENTES

CREATE OR REPLACE FUNCTION migrate_existing_tickets()
RETURNS TEXT AS $$
DECLARE
    ticket_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Migrar tickets existentes que têm ticket_type definido
    FOR ticket_record IN 
        SELECT t.id, t.ticket_type, t.event_id
        FROM tickets t
        WHERE t.ticket_type_name IS NULL 
        AND t.ticket_type IS NOT NULL
    LOOP
        -- Tentar encontrar o tipo correspondente
        UPDATE tickets 
        SET 
            ticket_type_name = ticket_record.ticket_type,
            ticket_area = COALESCE(ticket_record.ticket_type, 'Geral'),
            gender = 'unisex'
        WHERE id = ticket_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN 'Migrados ' || updated_count || ' tickets existentes.';
END;
$$ LANGUAGE plpgsql;

-- 8. EXECUTAR MIGRAÇÃO DOS DADOS EXISTENTES
SELECT migrate_existing_tickets();

-- 9. POLÍTICAS RLS (se necessário)

-- Permitir que usuários vejam seus próprios tickets com detalhes
CREATE POLICY IF NOT EXISTS "Users can view their own tickets with details" ON tickets
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = buyer_id OR
        EXISTS (
            SELECT 1 FROM ticket_users tu 
            WHERE tu.ticket_id = tickets.id 
            AND tu.email = auth.email()
        )
    );

-- 10. COMENTÁRIOS FINAIS

COMMENT ON VIEW tickets_with_details IS 'View completa com todos os dados de tickets, tipos, eventos e usuários';
COMMENT ON FUNCTION sync_ticket_with_type() IS 'Sincroniza automaticamente dados do tipo de ingresso';
COMMENT ON FUNCTION sync_ticket_user_with_ticket() IS 'Sincroniza dados do ticket para o usuário do ingresso';
COMMENT ON FUNCTION migrate_existing_tickets() IS 'Migra dados de tickets existentes para nova estrutura';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================

-- Para verificar as alterações:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name IN ('tickets', 'ticket_users') 
-- ORDER BY table_name, ordinal_position;