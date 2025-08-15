-- ============================================================================
-- SISTEMA AVANÇADO DE INGRESSOS COM LOTES E PREÇOS POR GÊNERO
-- ============================================================================

-- 1. Atualizar tabela event_ticket_types com campos avançados
ALTER TABLE event_ticket_types 
ADD COLUMN IF NOT EXISTS title VARCHAR(45),
ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'Pista',
ADD COLUMN IF NOT EXISTS price_masculine DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_feminine DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_period_type VARCHAR(10) DEFAULT 'date' CHECK (sale_period_type IN ('date', 'batch')),
ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'public' CHECK (availability IN ('public', 'restricted', 'manual')),
ADD COLUMN IF NOT EXISTS service_fee_type VARCHAR(20) DEFAULT 'buyer' CHECK (service_fee_type IN ('buyer', 'seller')),
ADD COLUMN IF NOT EXISTS character_limit INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS description_limit INTEGER DEFAULT 100;

-- 2. Criar tabela para lotes de ingressos
CREATE TABLE IF NOT EXISTS ticket_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_type_id UUID NOT NULL REFERENCES event_ticket_types(id) ON DELETE CASCADE,
    batch_number INTEGER NOT NULL,
    batch_name VARCHAR(50),
    price_masculine DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_feminine DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    sale_start_date TIMESTAMP WITH TIME ZONE,
    sale_end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_batch_per_ticket UNIQUE (ticket_type_id, batch_number)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_ticket_batches_ticket_type_id ON ticket_batches(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_ticket_batches_status ON ticket_batches(status);
CREATE INDEX IF NOT EXISTS idx_ticket_batches_dates ON ticket_batches(sale_start_date, sale_end_date);

-- 4. Trigger para atualizar available_quantity automaticamente nos lotes
CREATE OR REPLACE FUNCTION update_batch_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.available_quantity = NEW.quantity;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_batch_available_quantity ON ticket_batches;
CREATE TRIGGER trigger_update_batch_available_quantity
    BEFORE INSERT OR UPDATE ON ticket_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_available_quantity();

-- 5. View para consultar ingressos com lotes
CREATE OR REPLACE VIEW ticket_types_with_batches AS
SELECT 
    ett.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', tb.id,
                'batch_number', tb.batch_number,
                'batch_name', tb.batch_name,
                'price_masculine', tb.price_masculine,
                'price_feminine', tb.price_feminine,
                'quantity', tb.quantity,
                'available_quantity', tb.available_quantity,
                'sale_start_date', tb.sale_start_date,
                'sale_end_date', tb.sale_end_date,
                'status', tb.status
            ) ORDER BY tb.batch_number
        ) FILTER (WHERE tb.id IS NOT NULL),
        '[]'::json
    ) as batches
FROM event_ticket_types ett
LEFT JOIN ticket_batches tb ON ett.id = tb.ticket_type_id AND tb.status = 'active'
GROUP BY ett.id;

-- 6. Função para criar ingresso com lotes
CREATE OR REPLACE FUNCTION create_ticket_type_with_batches(
    ticket_data JSONB,
    batches_data JSONB[]
) RETURNS UUID AS $$
DECLARE
    new_ticket_id UUID;
    batch_data JSONB;
BEGIN
    -- Inserir tipo de ingresso
    INSERT INTO event_ticket_types (
        event_id, title, name, description, area,
        price_masculine, price_feminine, quantity, 
        min_quantity, max_quantity, has_half_price,
        sale_period_type, availability, service_fee_type,
        sale_start_date, sale_end_date, status
    ) VALUES (
        (ticket_data->>'event_id')::uuid,
        ticket_data->>'title',
        ticket_data->>'name',
        ticket_data->>'description',
        ticket_data->>'area',
        (ticket_data->>'price_masculine')::decimal,
        (ticket_data->>'price_feminine')::decimal,
        (ticket_data->>'quantity')::integer,
        COALESCE((ticket_data->>'min_quantity')::integer, 1),
        COALESCE((ticket_data->>'max_quantity')::integer, 5),
        COALESCE((ticket_data->>'has_half_price')::boolean, false),
        COALESCE(ticket_data->>'sale_period_type', 'date'),
        COALESCE(ticket_data->>'availability', 'public'),
        COALESCE(ticket_data->>'service_fee_type', 'buyer'),
        CASE WHEN ticket_data->>'sale_start_date' IS NOT NULL 
             THEN (ticket_data->>'sale_start_date')::timestamp with time zone 
             ELSE NULL END,
        CASE WHEN ticket_data->>'sale_end_date' IS NOT NULL 
             THEN (ticket_data->>'sale_end_date')::timestamp with time zone 
             ELSE NULL END,
        'active'
    ) RETURNING id INTO new_ticket_id;
    
    -- Inserir lotes se fornecidos
    IF array_length(batches_data, 1) > 0 THEN
        FOREACH batch_data IN ARRAY batches_data
        LOOP
            INSERT INTO ticket_batches (
                ticket_type_id, batch_number, batch_name,
                price_masculine, price_feminine, quantity,
                sale_start_date, sale_end_date
            ) VALUES (
                new_ticket_id,
                (batch_data->>'batch_number')::integer,
                batch_data->>'batch_name',
                (batch_data->>'price_masculine')::decimal,
                (batch_data->>'price_feminine')::decimal,
                (batch_data->>'quantity')::integer,
                CASE WHEN batch_data->>'sale_start_date' IS NOT NULL 
                     THEN (batch_data->>'sale_start_date')::timestamp with time zone 
                     ELSE NULL END,
                CASE WHEN batch_data->>'sale_end_date' IS NOT NULL 
                     THEN (batch_data->>'sale_end_date')::timestamp with time zone 
                     ELSE NULL END
            );
        END LOOP;
    END IF;
    
    RETURN new_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para atualizar evento com tipos de ingressos e lotes
CREATE OR REPLACE FUNCTION update_event_with_advanced_ticket_types(
    event_id_param UUID,
    event_data JSONB,
    ticket_types_data JSONB[]
) RETURNS BOOLEAN AS $$
DECLARE
    ticket_data JSONB;
    batches_data JSONB[];
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
    
    -- Remover tipos de ingressos e lotes existentes
    DELETE FROM ticket_batches WHERE ticket_type_id IN (
        SELECT id FROM event_ticket_types WHERE event_id = event_id_param
    );
    DELETE FROM event_ticket_types WHERE event_id = event_id_param;
    
    -- Inserir novos tipos de ingressos com lotes
    FOREACH ticket_data IN ARRAY ticket_types_data
    LOOP
        -- Extrair dados dos lotes
        SELECT ARRAY(
            SELECT jsonb_array_elements(ticket_data->'batches')
        ) INTO batches_data;
        
        -- Criar tipo de ingresso com lotes
        PERFORM create_ticket_type_with_batches(
            ticket_data || jsonb_build_object('event_id', event_id_param),
            COALESCE(batches_data, ARRAY[]::jsonb[])
        );
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Função para buscar lote ativo atual
CREATE OR REPLACE FUNCTION get_current_active_batch(ticket_type_id_param UUID)
RETURNS JSON AS $$
DECLARE
    current_batch JSON;
BEGIN
    SELECT json_build_object(
        'id', id,
        'batch_number', batch_number,
        'batch_name', batch_name,
        'price_masculine', price_masculine,
        'price_feminine', price_feminine,
        'quantity', quantity,
        'available_quantity', available_quantity,
        'sale_start_date', sale_start_date,
        'sale_end_date', sale_end_date
    ) INTO current_batch
    FROM ticket_batches
    WHERE ticket_type_id = ticket_type_id_param
      AND status = 'active'
      AND (sale_start_date IS NULL OR sale_start_date <= NOW())
      AND (sale_end_date IS NULL OR sale_end_date >= NOW())
      AND available_quantity > 0
    ORDER BY batch_number ASC
    LIMIT 1;
    
    RETURN COALESCE(current_batch, '{}'::json);
END;
$$ LANGUAGE plpgsql;

-- 9. View completa para eventos com tipos de ingressos e lotes
CREATE OR REPLACE VIEW events_with_advanced_tickets AS
SELECT 
    e.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', ttb.id,
                'title', ttb.title,
                'name', ttb.name,
                'description', ttb.description,
                'area', ttb.area,
                'price_masculine', ttb.price_masculine,
                'price_feminine', ttb.price_feminine,
                'quantity', ttb.quantity,
                'available_quantity', ttb.available_quantity,
                'min_quantity', ttb.min_quantity,
                'max_quantity', ttb.max_quantity,
                'has_half_price', ttb.has_half_price,
                'sale_period_type', ttb.sale_period_type,
                'availability', ttb.availability,
                'service_fee_type', ttb.service_fee_type,
                'sale_start_date', ttb.sale_start_date,
                'sale_end_date', ttb.sale_end_date,
                'status', ttb.status,
                'batches', ttb.batches,
                'current_batch', get_current_active_batch(ttb.id)
            )
        ) FILTER (WHERE ttb.id IS NOT NULL),
        '[]'::json
    ) as ticket_types
FROM events e
LEFT JOIN ticket_types_with_batches ttb ON e.id = ttb.event_id AND ttb.status = 'active'
GROUP BY e.id;

-- 10. Políticas RLS para ticket_batches
ALTER TABLE ticket_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lotes são visíveis publicamente" ON ticket_batches;
CREATE POLICY "Lotes são visíveis publicamente" ON ticket_batches
    FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Organizadores podem gerenciar lotes" ON ticket_batches;
CREATE POLICY "Organizadores podem gerenciar lotes" ON ticket_batches
    FOR ALL USING (
        auth.uid() IN (
            SELECT e.organizer_id 
            FROM events e 
            JOIN event_ticket_types ett ON e.id = ett.event_id 
            WHERE ett.id = ticket_batches.ticket_type_id
        )
    );

-- 11. Comentários para documentação
COMMENT ON TABLE ticket_batches IS 'Lotes de ingressos com preços e datas específicas';
COMMENT ON COLUMN event_ticket_types.sale_period_type IS 'Tipo de período de vendas: date ou batch';
COMMENT ON COLUMN event_ticket_types.availability IS 'Disponibilidade: public, restricted ou manual';
COMMENT ON FUNCTION create_ticket_type_with_batches IS 'Cria tipo de ingresso com lotes';
COMMENT ON FUNCTION get_current_active_batch IS 'Retorna o lote ativo atual para um tipo de ingresso';

-- Sucesso
SELECT 'Sistema avançado de ingressos com lotes configurado com sucesso!' as status;