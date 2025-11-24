-- Adiciona a coluna map_image na tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS map_image TEXT;
