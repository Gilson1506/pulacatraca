-- Migração para renomear coluna banner_url para image na tabela events
-- Execute este script se você já tem dados na coluna banner_url

-- Opção 1: Se você quer renomear a coluna existente
ALTER TABLE events RENAME COLUMN banner_url TO image;

-- Opção 2: Se você quer manter ambas as colunas temporariamente
-- ALTER TABLE events ADD COLUMN image TEXT;
-- UPDATE events SET image = banner_url WHERE banner_url IS NOT NULL;
-- Depois de verificar que tudo está funcionando:
-- ALTER TABLE events DROP COLUMN banner_url;

-- Opção 3: Se você está criando a tabela do zero
-- CREATE TABLE events (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   title TEXT NOT NULL,
--   description TEXT,
--   organizer_id UUID REFERENCES profiles(id),
--   start_date TIMESTAMP WITH TIME ZONE,
--   end_date TIMESTAMP WITH TIME ZONE,
--   location TEXT,
--   image TEXT, -- ← Nova coluna image ao invés de banner_url
--   price DECIMAL(10,2),
--   available_tickets INTEGER,
--   total_tickets INTEGER,
--   category TEXT,
--   tags TEXT[],
--   status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
--   carousel_approved BOOLEAN DEFAULT FALSE,
--   carousel_priority INTEGER DEFAULT 0,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   reviewed_at TIMESTAMP WITH TIME ZONE,
--   reviewed_by UUID REFERENCES profiles(id),
--   rejection_reason TEXT
-- );

-- Atualizar políticas RLS se necessário
-- DROP POLICY IF EXISTS "events_select_policy" ON events;
-- CREATE POLICY "events_select_policy" ON events FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "events_insert_policy" ON events;
-- CREATE POLICY "events_insert_policy" ON events FOR INSERT 
-- WITH CHECK (auth.uid() = organizer_id OR 
--             EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- DROP POLICY IF EXISTS "events_update_policy" ON events;
-- CREATE POLICY "events_update_policy" ON events FOR UPDATE 
-- USING (auth.uid() = organizer_id OR 
--        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Verificar se a migração funcionou
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'events' AND column_name IN ('image', 'banner_url');