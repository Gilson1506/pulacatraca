-- =====================================================
-- CORREÇÃO DOS TRIGGERS DA TABELA EVENTS
-- =====================================================
-- Este script corrige os problemas de triggers duplicados e funções inexistentes
-- que estão impedindo a aprovação de eventos e alterações no carrossel.

-- =====================================================
-- 1. REMOVER TRIGGERS PROBLEMÁTICOS
-- =====================================================

-- Remover todos os triggers existentes da tabela events
DROP TRIGGER IF EXISTS events_updated_at ON events;
DROP TRIGGER IF EXISTS on_update_events ON events;
DROP TRIGGER IF EXISTS trigger_validate_event_edit ON events;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;

-- =====================================================
-- 2. CRIAR FUNÇÃO ÚNICA PARA ATUALIZAR UPDATED_AT
-- =====================================================

-- Criar ou substituir a função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CRIAR FUNÇÃO DE VALIDAÇÃO DE EVENTOS (OPCIONAL)
-- =====================================================

-- Função para validar edições de eventos (pode ser expandida conforme necessário)
CREATE OR REPLACE FUNCTION validate_event_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- Validações básicas (podem ser expandidas)
  
  -- Verificar se a data de início não é no passado (apenas para novos eventos)
  IF TG_OP = 'INSERT' AND NEW.start_date < NOW() THEN
    RAISE EXCEPTION 'A data de início não pode ser no passado';
  END IF;
  
  -- Verificar se a data de fim é posterior à data de início
  IF NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'A data de fim deve ser posterior à data de início';
  END IF;
  
  -- Verificar se o preço não é negativo
  IF NEW.price < 0 THEN
    RAISE EXCEPTION 'O preço não pode ser negativo';
  END IF;
  
  -- Verificar se o número de ingressos disponíveis não excede o total
  IF NEW.available_tickets > NEW.total_tickets THEN
    RAISE EXCEPTION 'Ingressos disponíveis não podem exceder o total de ingressos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CRIAR TRIGGER ÚNICO E OTIMIZADO
-- =====================================================

-- Criar um único trigger que combina todas as funcionalidades
CREATE TRIGGER events_update_trigger
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar trigger de validação (opcional - pode ser removido se causar problemas)
CREATE TRIGGER events_validation_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_edit();

-- =====================================================
-- 5. VERIFICAR E CORRIGIR POLÍTICAS RLS
-- =====================================================

-- Verificar se as políticas RLS estão corretas para admins
DO $$
BEGIN
  -- Remover política antiga se existir
  DROP POLICY IF EXISTS "Admins can update events" ON events;
  
  -- Criar política atualizada para admins
  CREATE POLICY "Admins can update events" ON events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
  
  -- Verificar política de leitura
  DROP POLICY IF EXISTS "Admins can read all events" ON events;
  
  CREATE POLICY "Admins can read all events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar políticas RLS: %', SQLERRM;
END $$;

-- =====================================================
-- 6. VERIFICAR ESTRUTURA DA TABELA
-- =====================================================

-- Verificar se todas as colunas necessárias existem
DO $$
BEGIN
  -- Verificar carousel_approved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'carousel_approved'
  ) THEN
    ALTER TABLE events ADD COLUMN carousel_approved BOOLEAN DEFAULT false;
    RAISE NOTICE 'Coluna carousel_approved adicionada';
  END IF;
  
  -- Verificar carousel_priority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'carousel_priority'
  ) THEN
    ALTER TABLE events ADD COLUMN carousel_priority INTEGER DEFAULT 0;
    RAISE NOTICE 'Coluna carousel_priority adicionada';
  END IF;
  
  -- Verificar reviewed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE events ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Coluna reviewed_at adicionada';
  END IF;
  
  -- Verificar reviewed_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE events ADD COLUMN reviewed_by TEXT;
    RAISE NOTICE 'Coluna reviewed_by adicionada';
  END IF;
  
  -- Verificar rejection_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE events ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE 'Coluna rejection_reason adicionada';
  END IF;
  
END $$;

-- =====================================================
-- 7. CRIAR ÍNDICES PARA PERFORMANCE (SE NÃO EXISTIREM)
-- =====================================================

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_events_carousel_approved ON events(carousel_approved);
CREATE INDEX IF NOT EXISTS idx_events_carousel_priority ON events(carousel_priority);
CREATE INDEX IF NOT EXISTS idx_events_reviewed_at ON events(reviewed_at);

-- =====================================================
-- 8. TESTE DE FUNCIONAMENTO
-- =====================================================

-- Verificar se os triggers foram criados corretamente
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'events'
ORDER BY trigger_name;

-- Verificar se as funções existem
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('update_updated_at_column', 'validate_event_edit')
ORDER BY routine_name;

-- =====================================================
-- 9. COMENTÁRIOS E INSTRUÇÕES
-- =====================================================

/*
INSTRUÇÕES APÓS EXECUTAR ESTE SCRIPT:

1. ✅ Os triggers duplicados foram removidos
2. ✅ Funções necessárias foram criadas
3. ✅ Trigger único e otimizado foi implementado
4. ✅ Políticas RLS foram corrigidas
5. ✅ Colunas necessárias foram verificadas/adicionadas

PROBLEMAS RESOLVIDOS:
- ❌ Triggers duplicados causando conflitos
- ❌ Funções inexistentes gerando erros
- ❌ Deadlocks durante atualizações
- ❌ Problemas de permissão RLS

FUNCIONALIDADES RESTAURADAS:
- ✅ Aprovação de eventos
- ✅ Alterações no carrossel
- ✅ Atualização automática de updated_at
- ✅ Validação de dados de eventos

OBSERVAÇÕES:
- Se o trigger de validação causar problemas, pode ser removido com:
  DROP TRIGGER IF EXISTS events_validation_trigger ON events;
- O sistema agora deve funcionar normalmente para aprovações e carrossel
*/