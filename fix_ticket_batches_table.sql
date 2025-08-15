-- ============================================================================
-- CORREÇÃO: Garantir que a tabela ticket_batches existe
-- ============================================================================

-- Criar tabela ticket_batches se não existir
CREATE TABLE IF NOT EXISTS public.ticket_batches (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    ticket_type_id uuid NOT NULL,
    batch_number integer NOT NULL,
    batch_name character varying(50),
    price_masculine numeric(10,2) NOT NULL DEFAULT 0,
    price_feminine numeric(10,2) NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 0,
    available_quantity integer NOT NULL DEFAULT 0,
    sale_start_date timestamp with time zone,
    sale_end_date timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT ticket_batches_pkey PRIMARY KEY (id),
    CONSTRAINT ticket_batches_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) 
        REFERENCES public.event_ticket_types (id) ON DELETE CASCADE,
    CONSTRAINT unique_batch_per_ticket UNIQUE (ticket_type_id, batch_number),
    CONSTRAINT ticket_batches_status_check CHECK (
        status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'sold_out'::character varying]::text[])
    )
) TABLESPACE pg_default;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_ticket_batches_ticket_type_id ON public.ticket_batches USING btree (ticket_type_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_batches_status ON public.ticket_batches USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_batches_dates ON public.ticket_batches USING btree (sale_start_date, sale_end_date) TABLESPACE pg_default;

-- Função para atualizar available_quantity automaticamente nos lotes
CREATE OR REPLACE FUNCTION update_batch_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.available_quantity = NEW.quantity;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar available_quantity quando quantity é alterada
DROP TRIGGER IF EXISTS trigger_update_batch_available_quantity ON public.ticket_batches;
CREATE TRIGGER trigger_update_batch_available_quantity
    BEFORE INSERT OR UPDATE ON public.ticket_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_available_quantity();

-- Habilitar RLS
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública de lotes ativos
DROP POLICY IF EXISTS "Lotes são visíveis publicamente" ON public.ticket_batches;
CREATE POLICY "Lotes são visíveis publicamente" ON public.ticket_batches
    FOR SELECT USING (status = 'active');

-- Política para organizadores gerenciarem lotes
DROP POLICY IF EXISTS "Organizadores podem gerenciar lotes" ON public.ticket_batches;
CREATE POLICY "Organizadores podem gerenciar lotes" ON public.ticket_batches
    FOR ALL USING (
        auth.uid() IN (
            SELECT e.organizer_id 
            FROM public.events e 
            JOIN public.event_ticket_types ett ON e.id = ett.event_id 
            WHERE ett.id = ticket_batches.ticket_type_id
        )
    );

-- Comentários
COMMENT ON TABLE public.ticket_batches IS 'Lotes de ingressos com preços e datas específicas';

SELECT 'Tabela ticket_batches configurada com sucesso!' as status;