-- Corrigir imagens dos eventos
DO $$
BEGIN
    -- Garantir colunas existem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'image') THEN
        ALTER TABLE events ADD COLUMN image TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'banner_url') THEN
        ALTER TABLE events ADD COLUMN banner_url TEXT;
    END IF;
    
    -- Migrar dados
    UPDATE events SET image = banner_url WHERE (image IS NULL OR image = '') AND banner_url IS NOT NULL;
    UPDATE events SET banner_url = image WHERE (banner_url IS NULL OR banner_url = '') AND image IS NOT NULL;
    
    -- Adicionar imagem padrão
    UPDATE events SET image = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjM2OEE3Ci8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo=' WHERE image IS NULL OR image = '';
    
END $$;
-- Script criado
