-- Verificando se as funções RPC existem
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('search_event_participants', 'perform_participant_checkin', 'checkin_by_qr_code');
