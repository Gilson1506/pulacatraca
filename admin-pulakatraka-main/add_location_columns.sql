-- =====================================================
-- ADICIONAR COLUNAS DE LOCALIZAÇÃO NA TABELA EVENTS
-- =====================================================
-- Este script adiciona todas as colunas de localização detalhada
-- na tabela events para permitir endereços completos

-- =====================================================
-- 1. ADICIONAR COLUNAS DE LOCALIZAÇÃO
-- =====================================================

-- Adicionar location_type se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'physical' 
CHECK (location_type IN ('physical', 'online', 'tbd'));

-- Adicionar location_name se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Adicionar location_city se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_city TEXT;

-- Adicionar location_state se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_state TEXT;

-- Adicionar location_street se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_street TEXT;

-- Adicionar location_number se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_number TEXT;

-- Adicionar location_neighborhood se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_neighborhood TEXT;

-- Adicionar location_cep se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_cep TEXT;

-- Adicionar location_complement se não existir
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_complement TEXT;

-- Adicionar location_search se não existir (para busca/indexação)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS location_search TEXT;

-- =====================================================
-- 2. VERIFICAR ESTRUTURA ATUALIZADA
-- =====================================================

-- Verificar se todas as colunas foram criadas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name LIKE 'location_%'
ORDER BY column_name;

-- =====================================================
-- 3. ATUALIZAR EVENTOS EXISTENTES
-- =====================================================

-- Atualizar location_type para eventos existentes
UPDATE events 
SET location_type = 'physical'
WHERE location_type IS NULL;

-- Tentar extrair informações do campo location existente para location_name
UPDATE events 
SET location_name = location
WHERE location_name IS NULL 
AND location IS NOT NULL 
AND location != '';

-- =====================================================
-- 4. VERIFICAR DADOS ATUALIZADOS
-- =====================================================

-- Verificar alguns eventos com as novas colunas
SELECT 
  id,
  title,
  location,
  location_type,
  location_name,
  location_street,
  location_number,
  location_neighborhood,
  location_city,
  location_state,
  location_cep,
  location_complement,
  location_search
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- 5. EXEMPLO DE INSERÇÃO COM ENDEREÇO COMPLETO
-- =====================================================

-- Exemplo de como inserir um evento com endereço completo
/*
INSERT INTO events (
  title,
  description,
  organizer_id,
  start_date,
  end_date,
  location,
  location_type,
  location_name,
  location_street,
  location_number,
  location_complement,
  location_neighborhood,
  location_city,
  location_state,
  location_cep,
  location_search,
  status
) VALUES (
  'Evento Teste Endereço Completo',
  'Teste para verificar endereço completo',
  (SELECT id FROM profiles WHERE role = 'organizer' LIMIT 1),
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '8 days',
  'Shopping Center Plaza',
  'physical',
  'Shopping Center Plaza',
  'Avenida Paulista',
  '1578',
  'Loja 234, 2º Piso',
  'Bela Vista',
  'São Paulo',
  'SP',
  '01310-200',
  'shopping center plaza avenida paulista bela vista sao paulo sp',
  'pending'
);
*/

-- =====================================================
-- 6. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para busca por localização
CREATE INDEX IF NOT EXISTS idx_events_location_search 
ON events USING gin(to_tsvector('portuguese', location_search));

-- Índice para busca por cidade/estado
CREATE INDEX IF NOT EXISTS idx_events_city_state 
ON events (location_city, location_state);

-- Índice para tipo de localização
CREATE INDEX IF NOT EXISTS idx_events_location_type 
ON events (location_type);

-- =====================================================
-- 7. VERIFICAÇÃO FINAL
-- =====================================================

-- Contar eventos por tipo de localização
SELECT 
  location_type,
  COUNT(*) as total_events
FROM events 
GROUP BY location_type;

-- Verificar eventos com endereço mais completo
SELECT 
  COUNT(*) as events_with_detailed_address
FROM events 
WHERE location_street IS NOT NULL 
AND location_city IS NOT NULL 
AND location_state IS NOT NULL;

-- Verificar eventos que precisam de endereço detalhado
SELECT 
  id,
  title,
  location,
  CASE 
    WHEN location_street IS NULL THEN 'Falta rua'
    WHEN location_city IS NULL THEN 'Falta cidade'
    WHEN location_state IS NULL THEN 'Falta estado'
    ELSE 'Endereço completo'
  END as status_endereco
FROM events 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;

-- Script de adição de colunas de localização executado com sucesso!
-- Agora você pode usar todas as colunas de localização no EventPage.tsx
-- Lembre-se de atualizar o EventFormModal.tsx para permitir entrada desses dados.
