-- ===================================================================
-- INVESTIGAÇÃO TICKET: PLKTK909538
-- ===================================================================
-- Este script investiga todas as tabelas para entender o problema
-- ===================================================================

-- ===================================
-- 1. VERIFICAR SE QR EXISTE EM TICKET_USERS
-- ===================================
SELECT 
    'TICKET_USERS' as tabela,
    id,
    name,
    email,
    qr_code,
    ticket_id,
    created_at
FROM ticket_users 
WHERE qr_code = 'PLKTK909538';

-- ===================================
-- 2. SE EXISTIR, VERIFICAR O TICKET RELACIONADO
-- ===================================
SELECT 
    'TICKETS' as tabela,
    t.id,
    t.name,
    t.ticket_type,
    t.price,
    t.event_id,
    t.created_at,
    tu.qr_code as qr_code_relacionado
FROM tickets t
RIGHT JOIN ticket_users tu ON tu.ticket_id = t.id
WHERE tu.qr_code = 'PLKTK909538';

-- ===================================
-- 3. VERIFICAR SE O EVENTO EXISTE
-- ===================================
SELECT 
    'EVENTS' as tabela,
    e.id,
    e.title,
    e.name,
    e.start_date,
    e.location,
    e.organizer_id,
    tu.qr_code as qr_code_relacionado
FROM events e
RIGHT JOIN ticket_users tu ON tu.ticket_id = ANY(
    SELECT t.id FROM tickets t WHERE t.event_id = e.id
)
WHERE tu.qr_code = 'PLKTK909538';

-- ===================================
-- 4. VERIFICAR CHECK-INS EXISTENTES
-- ===================================
SELECT 
    'CHECKIN' as tabela,
    c.id,
    c.ticket_user_id,
    c.ticket_id,
    c.event_id,
    c.checked_in_at,
    tu.qr_code as qr_code_relacionado
FROM checkin c
RIGHT JOIN ticket_users tu ON tu.id = c.ticket_user_id
WHERE tu.qr_code = 'PLKTK909538';

-- ===================================
-- 5. INVESTIGAR DADOS ÓRFÃOS
-- ===================================

-- Verificar ticket_users sem ticket válido
SELECT 
    'TICKET_USERS_ÓRFÃOS' as problema,
    tu.id as ticket_user_id,
    tu.name,
    tu.qr_code,
    tu.ticket_id as ticket_id_procurado,
    CASE 
        WHEN t.id IS NULL THEN 'TICKET NÃO EXISTE'
        ELSE 'TICKET EXISTE'
    END as status_ticket
FROM ticket_users tu
LEFT JOIN tickets t ON t.id = tu.ticket_id
WHERE tu.qr_code = 'PLKTK909538';

-- Verificar tickets sem evento válido
SELECT 
    'TICKETS_ÓRFÃOS' as problema,
    t.id as ticket_id,
    t.name,
    t.event_id as event_id_procurado,
    CASE 
        WHEN e.id IS NULL THEN 'EVENTO NÃO EXISTE'
        ELSE 'EVENTO EXISTE'
    END as status_evento
FROM tickets t
LEFT JOIN events e ON e.id = t.event_id
WHERE t.id = (
    SELECT ticket_id FROM ticket_users WHERE qr_code = 'PLKTK909538'
);

-- ===================================
-- 6. LISTAR ALGUNS REGISTROS PARA COMPARAÇÃO
-- ===================================

-- Últimos ticket_users criados
SELECT 
    'ÚLTIMOS_TICKET_USERS' as referencia,
    id,
    name,
    qr_code,
    ticket_id,
    created_at
FROM ticket_users 
ORDER BY created_at DESC 
LIMIT 5;

-- Últimos tickets criados
SELECT 
    'ÚLTIMOS_TICKETS' as referencia,
    id,
    name,
    event_id,
    created_at
FROM tickets 
ORDER BY created_at DESC 
LIMIT 5;

-- ===================================
-- 7. TESTE DA FUNÇÃO RPC DEBUG
-- ===================================
SELECT debug_checkin_by_qr_code('PLKTK909538') as resultado_debug;

-- ===================================
-- 8. VERIFICAR ESTRUTURA DAS TABELAS
-- ===================================

-- Colunas da tabela ticket_users
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
ORDER BY ordinal_position;

-- Colunas da tabela tickets
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;