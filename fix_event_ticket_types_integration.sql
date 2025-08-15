-- ============================================================================
-- CORREÇÃO: Integração completa dos tipos de ingressos
-- ============================================================================

-- 1. Verificar se a tabela event_ticket_types existe e tem a estrutura correta
CREATE TABLE IF NOT EXISTS event_ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER DEFAULT 10,
    has_half_price BOOLEAN DEFAULT false,
    area TEXT,
    sector TEXT,
    benefits TEXT[],
    ticket_type TEXT DEFAULT 'paid' CHECK (ticket_type IN ('paid', 'free')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    sale_start_date TIMESTAMP WITH TIME ZONE,
    sale_end_date TIMESTAMP WITH TIME ZONE,
    stripe_price_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_status ON event_ticket_types(status);

-- 3. Função para atualizar available_quantity automaticamente
CREATE OR REPLACE FUNCTION update_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.available_quantity = NEW.quantity;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para atualizar available_quantity quando quantity é alterada
DROP TRIGGER IF EXISTS trigger_update_available_quantity ON event_ticket_types;
CREATE TRIGGER trigger_update_available_quantity
    BEFORE INSERT OR UPDATE ON event_ticket_types
    FOR EACH ROW
    EXECUTE FUNCTION update_available_quantity();

-- 5. Migrar dados existentes dos eventos para tipos de ingressos
INSERT INTO event_ticket_types (
    event_id,
    name,
    description,
    price,
    quantity,
    available_quantity,
    ticket_type,
    status
)
SELECT 
    id as event_id,
    'Ingresso Geral' as name,
    'Ingresso padrão para o evento' as description,
    COALESCE(price, 0) as price,
    COALESCE(total_tickets, 100) as quantity,
    COALESCE(available_tickets, total_tickets, 100) as available_quantity,
    CASE 
        WHEN price = 0 OR price IS NULL THEN 'free'
        ELSE 'paid'
    END as ticket_type,
    CASE 
        WHEN status = 'approved' THEN 'active'
        ELSE 'inactive'
    END as status
FROM events 
WHERE id NOT IN (
    SELECT DISTINCT event_id FROM event_ticket_types
)
ON CONFLICT DO NOTHING;

-- 6. Atualizar RLS (Row Level Security) se necessário
ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública de tipos de ingressos ativos
DROP POLICY IF EXISTS "Tipos de ingressos são visíveis publicamente" ON event_ticket_types;
CREATE POLICY "Tipos de ingressos são visíveis publicamente" ON event_ticket_types
    FOR SELECT USING (status = 'active');

-- Política para organizadores gerenciarem seus tipos de ingressos
DROP POLICY IF EXISTS "Organizadores podem gerenciar tipos de ingressos" ON event_ticket_types;
CREATE POLICY "Organizadores podem gerenciar tipos de ingressos" ON event_ticket_types
    FOR ALL USING (
        auth.uid() IN (
            SELECT organizer_id FROM events WHERE id = event_ticket_types.event_id
        )
    );

-- 7. View para facilitar consultas
CREATE OR REPLACE VIEW events_with_ticket_types AS
SELECT 
    e.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', ett.id,
                'name', ett.name,
                'description', ett.description,
                'price', ett.price,
                'quantity', ett.quantity,
                'available_quantity', ett.available_quantity,
                'min_quantity', ett.min_quantity,
                'max_quantity', ett.max_quantity,
                'has_half_price', ett.has_half_price,
                'area', ett.area,
                'sector', ett.sector,
                'benefits', ett.benefits,
                'ticket_type', ett.ticket_type,
                'status', ett.status,
                'sale_start_date', ett.sale_start_date,
                'sale_end_date', ett.sale_end_date
            )
        ) FILTER (WHERE ett.id IS NOT NULL),
        '[]'::json
    ) as ticket_types
FROM events e
LEFT JOIN event_ticket_types ett ON e.id = ett.event_id AND ett.status = 'active'
GROUP BY e.id;

-- 8. Função para inserir evento com tipos de ingressos
CREATE OR REPLACE FUNCTION insert_event_with_ticket_types(
    event_data JSONB,
    ticket_types_data JSONB[]
) RETURNS UUID AS $$
DECLARE
    new_event_id UUID;
    ticket_data JSONB;
BEGIN
    -- Inserir evento
    INSERT INTO events (
        title, description, start_date, end_date, location, 
        category, banner_url, organizer_id, price, 
        available_tickets, total_tickets, status
    ) VALUES (
        event_data->>'title',
        event_data->>'description',
        (event_data->>'start_date')::timestamp with time zone,
        (event_data->>'end_date')::timestamp with time zone,
        event_data->>'location',
        event_data->>'category',
        event_data->>'banner_url',
        (event_data->>'organizer_id')::uuid,
        (event_data->>'price')::decimal,
        (event_data->>'available_tickets')::integer,
        (event_data->>'total_tickets')::integer,
        COALESCE(event_data->>'status', 'pending')
    ) RETURNING id INTO new_event_id;
    
    -- Inserir tipos de ingressos
    FOREACH ticket_data IN ARRAY ticket_types_data
    LOOP
        INSERT INTO event_ticket_types (
            event_id, name, description, price, quantity, 
            min_quantity, max_quantity, has_half_price
        ) VALUES (
            new_event_id,
            ticket_data->>'name',
            ticket_data->>'description',
            (ticket_data->>'price')::decimal,
            (ticket_data->>'quantity')::integer,
            COALESCE((ticket_data->>'min_quantity')::integer, 1),
            COALESCE((ticket_data->>'max_quantity')::integer, 10),
            COALESCE((ticket_data->>'has_half_price')::boolean, false)
        );
    END LOOP;
    
    RETURN new_event_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Atualizar função de atualização de eventos
CREATE OR REPLACE FUNCTION update_event_with_ticket_types(
    event_id_param UUID,
    event_data JSONB,
    ticket_types_data JSONB[]
) RETURNS BOOLEAN AS $$
DECLARE
    ticket_data JSONB;
BEGIN
    -- Atualizar evento
    UPDATE events SET
        title = event_data->>'title',
        description = event_data->>'description',
        start_date = (event_data->>'start_date')::timestamp with time zone,
        end_date = (event_data->>'end_date')::timestamp with time zone,
        location = event_data->>'location',
        category = event_data->>'category',
        banner_url = event_data->>'banner_url',
        price = (event_data->>'price')::decimal,
        available_tickets = (event_data->>'available_tickets')::integer,
        total_tickets = (event_data->>'total_tickets')::integer,
        updated_at = timezone('utc'::text, now())
    WHERE id = event_id_param;
    
    -- Remover tipos de ingressos existentes
    DELETE FROM event_ticket_types WHERE event_id = event_id_param;
    
    -- Inserir novos tipos de ingressos
    FOREACH ticket_data IN ARRAY ticket_types_data
    LOOP
        INSERT INTO event_ticket_types (
            event_id, name, description, price, quantity,
            min_quantity, max_quantity, has_half_price
        ) VALUES (
            event_id_param,
            ticket_data->>'name',
            ticket_data->>'description',
            (ticket_data->>'price')::decimal,
            (ticket_data->>'quantity')::integer,
            COALESCE((ticket_data->>'min_quantity')::integer, 1),
            COALESCE((ticket_data->>'max_quantity')::integer, 10),
            COALESCE((ticket_data->>'has_half_price')::boolean, false)
        );
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentários para documentação
COMMENT ON TABLE event_ticket_types IS 'Tipos de ingressos para cada evento';
COMMENT ON COLUMN event_ticket_types.available_quantity IS 'Quantidade disponível (atualizada automaticamente)';
COMMENT ON FUNCTION insert_event_with_ticket_types IS 'Insere evento com seus tipos de ingressos';
COMMENT ON FUNCTION update_event_with_ticket_types IS 'Atualiza evento e seus tipos de ingressos';

-- Sucesso
SELECT 'Estrutura de tipos de ingressos configurada com sucesso!' as status;