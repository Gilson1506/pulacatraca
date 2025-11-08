import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar, RotateCcw, QrCode, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';

import { useNavigate } from 'react-router-dom';

interface FinalQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (qrData: string, ticketData?: any) => void;
  eventId?: string;
}

interface TicketData {
  id: string;
  name: string;
  email: string;
  event_title: string;
  event_date: string;
  event_location: string;
  ticket_type: string;
  ticket_area?: string;
  ticket_price: number;
  ticket_price_feminine?: number;
  qr_code: string;
  purchased_at: string;
  // Dados do check-in
  is_checked_in: boolean;
  checked_in_at: string | null;
  status?: string;
  // IDs necessários
  ticket_id: string;
  event_id: string;
  organizer_id: string;
  // Campos opcionais para diferentes fontes
  ticket_user_id?: string | null;
  user_id?: string | null;
  source?: 'ticket_users' | 'tickets' | 'rpc';
  // Novos campos do ticket_types_with_batches
  ticket_type_id?: string;
  ticket_description?: string;
  ticket_batch_name?: string;
}

const FinalQRScanner: React.FC<FinalQRScannerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventId
}) => {
  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  const [domReady, setDomReady] = useState(false);
  
  // Refs DOM seguros
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const readerId = "qr-reader-element";

  const navigate = useNavigate();

  // Debug removido para produção
  const addDebugInfo = (info: string) => {
    // Debug silenciado
  };



    /**
   * Busca rápida e otimizada em ticket_users
   */
  const fetchTicketData = async (qrCode: string): Promise<TicketData | null> => {
    try {
      // Query única e otimizada com relacionamentos
      console.log(`🔍 [JOIN] Buscando QR "${qrCode}" com relacionamentos...`);
      
      const { data: ticketUserData, error: ticketUserError } = await supabase
        .from('ticket_users')
        .select(`
          id,
          name,
          email,
          qr_code,
          created_at,
          ticket_id,
          tickets(
            id,
            price,
            price_feminine,
            ticket_type,
            area,
            event_id,
            ticket_type_id,
            events!fk_tickets_primary_event_id(
              id,
              title,
              start_date,
              location,
              location_name,
              location_city,
              location_state,
              organizer_id,
              ticket_type
            )
          ),
          checkin(
            id,
            checked_in_at
          )
        `)
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (ticketUserError) {
        console.error(`❌ [JOIN] Erro ao buscar ticket_users com join:`, ticketUserError);
        return null;
      }

      if (!ticketUserData) {
        console.log(`❌ [JOIN] Nenhum ticket_user encontrado para QR: ${qrCode}`);
        return null;
      }

      // Verificar se temos os dados necessários
      const ticket = ticketUserData.tickets || null;
      const event = ticket?.events || null;
      
      if (!ticket || !event) {
        console.log(`❌ [JOIN] Dados incompletos - faltam tickets ou events para QR: ${qrCode}`);
        return null;
      }

      const isAlreadyCheckedIn = ticketUserData.checkin && ticketUserData.checkin.length > 0;
      
      // Buscar informações detalhadas do ticket type se disponível
      let ticketTypeDetails = null;
      if (ticket?.ticket_type_id) {
        try {
          const { data: ticketTypeData } = await supabase
            .from('ticket_types_with_batches')
            .select('*')
            .eq('id', ticket.ticket_type_id)
            .single();
          
          if (ticketTypeData) {
            ticketTypeDetails = ticketTypeData;
            console.log('🔍 [JOIN] Ticket type details encontrado:', ticketTypeDetails);
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar ticket type details:', error);
        }
      }
      
      // Se não encontrou pelo ticket_type_id, tentar buscar pelo event_id
      if (!ticketTypeDetails && event?.id) {
        try {
          const { data: ticketTypeData } = await supabase
            .from('ticket_types_with_batches')
            .select('*')
            .eq('event_id', event.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (ticketTypeData) {
            ticketTypeDetails = ticketTypeData;
            console.log('🔍 [JOIN] Ticket type details encontrado pelo event_id:', ticketTypeDetails);
          }
        } catch (error) {
          console.log('⚠️ Erro ao buscar ticket type details pelo event_id:', error);
        }
      }

      console.log(`✅ [JOIN] Dados encontrados:`, {
        ticket_user: ticketUserData.id,
        event: event?.title,
        ticket: ticket?.id,
        checkin: isAlreadyCheckedIn
      });

      // Construir local do evento com fallbacks
      const eventLocation = event?.location_name || event?.location || 
        (event?.location_city && event?.location_state ? `${event.location_city}, ${event.location_state}` : 'Local não informado');
      
      // Determinar tipo de ingresso e preço
      const ticketType = ticket?.ticket_type || event?.ticket_type || 'Ingresso Padrão';
      const ticketPrice = ticket?.price || 0;
      const isFreeTicket = ticketPrice === 0;
      
      // Debug: mostrar dados encontrados
      console.log('🔍 [JOIN] Dados encontrados:', {
        event_title: event?.title,
        event_location: eventLocation,
        ticket_type: ticketType,
        ticket_area: ticket?.area,
        ticket_price: ticketPrice
      });
      
      // Debug: mostrar estrutura dos dados
      console.log('🔍 [JOIN] Estrutura ticket:', ticket);
      console.log('🔍 [JOIN] Estrutura event:', event);
      
      return {
        id: ticketUserData.id,
        name: ticketUserData.name,
        email: ticketUserData.email,
        event_title: event?.title || 'Nome do evento não informado',
        event_date: event?.start_date || new Date().toISOString(),
        event_location: eventLocation,
        ticket_type: isFreeTicket ? 'Gratuito' : (ticketTypeDetails?.title || ticketTypeDetails?.name || ticketType),
        ticket_area: ticketTypeDetails?.area || ticket?.area || 'Área não informada',
        ticket_price: ticketTypeDetails?.price_masculine || ticketTypeDetails?.price || ticketPrice,
        ticket_price_feminine: ticketTypeDetails?.price_feminine || ticket?.price_feminine || ticketPrice,
        qr_code: ticketUserData.qr_code,
        purchased_at: ticketUserData.created_at,
        ticket_id: ticket?.id || ticketUserData.id,
        event_id: event?.id || ticketUserData.event_id,
        organizer_id: event?.user_id || '',
        ticket_user_id: ticketUserData.id,
        is_checked_in: isAlreadyCheckedIn,
        checked_in_at: ticketUserData.checkin?.[0]?.checked_in_at || null,
        status: isAlreadyCheckedIn ? 'ALREADY_CHECKED_IN' : 'CHECKED_IN',
        source: 'ticket_users',
        // Novos campos do ticket_types_with_batches
        ticket_type_id: ticketTypeDetails?.id || ticket?.ticket_type_id,
        ticket_description: ticketTypeDetails?.description,
        ticket_batch_name: ticketTypeDetails?.batches?.[0]?.name || ''
      };

    } catch (error) {
      return null;
    }
  };

  /**
   * Busca via RPC function - Ultra rápida e robusta
   */
  const processQRCodeViaRPC = async (qrCode: string) => {
    const startTime = performance.now();
    
    try {
      addDebugInfo(`🚀 [RPC] Processando QR: ${qrCode}`);
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('checkin_by_qr_code', {
          p_qr_code: qrCode
        });

      if (rpcError) {
        addDebugInfo(`❌ [RPC] ERRO: ${rpcError.message}`);
        throw new Error(`RPC Error: ${rpcError.message} (${rpcError.code})`);
      }
      
      if (!rpcResult || typeof rpcResult !== 'object') {
        addDebugInfo('❌ [RPC] Resposta inválida');
        throw new Error('RPC function retornou resposta inválida');
      }

      if (!rpcResult.success) {
        addDebugInfo(`❌ [RPC] Falha: ${rpcResult.message}`);
        throw new Error(rpcResult.message || 'RPC function indicou falha');
      }

      const rpcData = rpcResult.data;
      
      if (!rpcData) {
        addDebugInfo('❌ [RPC] Sem dados na resposta');
        throw new Error('RPC retornou sem dados');
      }

      // Debug: mostrar dados retornados pela RPC
      console.log('🔍 [RPC] Dados retornados:', rpcData);
      console.log('🔍 [RPC] Campos disponíveis:', Object.keys(rpcData));
      console.log('🔍 [RPC] event_title:', rpcData.event_title);
      console.log('🔍 [RPC] event_location:', rpcData.event_location);
      console.log('🔍 [RPC] ticket_type:', rpcData.ticket_type);
      console.log('🔍 [RPC] ticket_area:', rpcData.ticket_area);
      console.log('🔍 [RPC] ticket_price:', rpcData.ticket_price);

      addDebugInfo('✅ [RPC] Convertendo dados');

      // ===== CONVERTER PARA TICKETDATA - ESTRUTURA CORRIGIDA =====
      const ticketData: TicketData = {
        id: rpcData.qr_code || qrCode,
        name: rpcData.name || 'Participante',
        email: rpcData.email || '',
        event_title: rpcData.event_title || null,
        event_date: rpcData.event_date || null,
        event_location: rpcData.event_location || null,
        ticket_type: rpcData.ticket_type || null,
        ticket_area: rpcData.ticket_area || null,
        ticket_price: rpcData.ticket_price !== undefined ? rpcData.ticket_price : null,
        ticket_price_feminine: rpcData.ticket_price_feminine || null,
        qr_code: qrCode,
        purchased_at: new Date().toISOString(),
        ticket_id: 'ticket-' + qrCode,
        event_id: 'event-' + qrCode,
        organizer_id: rpcData.organizer_id || '',
        ticket_user_id: rpcData.qr_code || qrCode,
        is_checked_in: rpcResult.action === 'ALREADY_CHECKED_IN',
        checked_in_at: rpcData.checked_in_at || (rpcResult.action === 'ALREADY_CHECKED_IN' ? new Date().toISOString() : null),
        status: rpcResult.action,
        source: 'rpc',
        // Novos campos do ticket_types_with_batches
        ticket_type_id: rpcData.ticket_type_id,
        ticket_description: rpcData.ticket_description,
        ticket_batch_name: rpcData.batch_name
      };

      addDebugInfo('✅ [RPC] Check-in processado com sucesso');

      return { 
        ticketData, 
        rpcAction: rpcResult.action, 
        rpcMessage: rpcResult.message 
      };

    } catch (error) {
      addDebugInfo(`💥 [RPC] Erro: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  /**
   * Fallback: busca direta em ticket_users e events pelo QR
   * Permite continuar o check-in mesmo se ticket_id estiver NULL
   */
  const fetchDirectFromTicketUsers = async (qrCode: string): Promise<TicketData | null> => {
    try {
      console.log(`🔍 [FALLBACK] Buscando QR "${qrCode}" em ticket_users...`);
      
      // Primeiro, vamos verificar se o QR code existe
      const { data: tu, error: tuError } = await supabase
        .from('ticket_users')
        .select('*')
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (tuError) {
        console.error(`❌ [FALLBACK] Erro ao buscar ticket_users:`, tuError);
        return null;
      }

      if (!tu) {
        console.log(`❌ [FALLBACK] QR code "${qrCode}" não encontrado em ticket_users`);
        return null;
      }

      console.log(`✅ [FALLBACK] Encontrado ticket_user:`, tu);

      // Buscar dados do ticket e evento através do ticket_id
      let eventTitle = 'Evento não informado';
      let eventDate = new Date().toISOString();
      let eventLocation = 'Local não informado';
      let organizerId = '';
      let ticketPrice = 0;
      let eventId = '';
      let ticketTypeName = 'Ingresso';
      let isUsed = false;
      let usedAt = null;

      if (tu.ticket_id) {
        console.log(`🔍 [FALLBACK] Buscando ticket com ID: ${tu.ticket_id}`);
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            id,
            price,
            event_id,
            ticket_type_id,
            status,
            used_at,
            events!fk_tickets_primary_event_id(
              id,
              title,
              start_date,
              location,
              location_name,
              organizer_id
            ),
            event_ticket_types(
              name,
              title,
              description
            )
          `)
          .eq('id', tu.ticket_id)
          .maybeSingle();

        if (ticketError) {
          console.error(`❌ [FALLBACK] Erro ao buscar ticket:`, ticketError);
        } else if (ticketData) {
          console.log(`✅ [FALLBACK] Ticket encontrado:`, ticketData);
          ticketPrice = ticketData.price || 0;
          eventId = ticketData.event_id || '';
          isUsed = ticketData.status === 'used';
          usedAt = ticketData.used_at;
          
          // Pegar nome do tipo de ingresso
          if (ticketData.event_ticket_types) {
            const ticketType = ticketData.event_ticket_types;
            ticketTypeName = ticketType.title || ticketType.name || 'Ingresso';
            console.log(`✅ [FALLBACK] Tipo de ingresso: ${ticketTypeName}`);
          }
          
          if (ticketData.events) {
            const ev = ticketData.events;
            eventTitle = ev.title || eventTitle;
            eventDate = ev.start_date || eventDate;
            eventLocation = ev.location || ev.location_name || eventLocation;
            organizerId = ev.organizer_id || organizerId;
            console.log(`✅ [FALLBACK] Evento encontrado via ticket:`, ev.title);
          }
        } else {
          console.log(`⚠️ [FALLBACK] Ticket não encontrado para ID: ${tu.ticket_id}`);
        }
      } else {
        console.log(`⚠️ [FALLBACK] ticket_user não tem ticket_id`);
      }

      const ticketData: TicketData = {
        id: tu.id,
        name: tu.name || 'Participante',
        email: tu.email || '',
        event_title: eventTitle,
        event_date: eventDate,
        event_location: eventLocation,
        ticket_type: ticketTypeName,
        ticket_price: ticketPrice,
        qr_code: tu.qr_code,
        purchased_at: tu.created_at,
        ticket_id: tu.ticket_id || tu.id,
        event_id: eventId,
        organizer_id: organizerId,
        ticket_user_id: tu.id,
        is_checked_in: isUsed,
        checked_in_at: usedAt,
        source: 'ticket_users'
      };

      console.log(`✅ [FALLBACK] Ticket data criado:`, ticketData);
      return ticketData;
    } catch (error) {
      console.error(`❌ [FALLBACK] Erro geral:`, error);
      return null;
    }
  };

  /**
   * Realiza o check-in do participante
   */
  const performCheckin = async (ticketData: TicketData): Promise<boolean> => {
    try {
      addDebugInfo(`🎯 Realizando check-in para: ${ticketData.name}`);

      // Verifica se já foi feito check-in
      if (ticketData.is_checked_in) {
        addDebugInfo('⚠️ Check-in já realizado anteriormente');
        return true; // Retorna true mas não faz novo check-in
      }

      // Prepara dados para inserção baseado na fonte
      let checkinInsertData: any = {
        event_id: ticketData.event_id,
        organizer_id: ticketData.organizer_id,
        checked_in_at: new Date().toISOString()
      };

      // Adiciona ID apropriado baseado na fonte dos dados
      if (ticketData.ticket_user_id) {
        // Dados vieram de ticket_users
        checkinInsertData.ticket_user_id = ticketData.ticket_user_id;
        addDebugInfo(`📋 Check-in via ticket_user_id: ${ticketData.ticket_user_id}`);
      } else if (ticketData.user_id) {
        // Dados vieram de tickets diretos
        checkinInsertData.user_id = ticketData.user_id;
        addDebugInfo(`📋 Check-in via user_id: ${ticketData.user_id}`);
      } else {
        // Fallback: usar ticket_id
        checkinInsertData.ticket_id = ticketData.ticket_id;
        addDebugInfo(`📋 Check-in via ticket_id: ${ticketData.ticket_id}`);
      }

      // Insere novo check-in
      const { data: checkinData, error: checkinError } = await supabase
        .from('checkin')
        .insert([checkinInsertData])
        .select()
        .single();

      if (checkinError) {
        addDebugInfo(`❌ Erro ao inserir check-in: ${checkinError.message}`);
        addDebugInfo(`📋 Dados tentados: ${JSON.stringify(checkinInsertData)}`);
        throw new Error(`Erro ao realizar check-in: ${checkinError.message}`);
      }

      addDebugInfo(`✅ Check-in realizado com sucesso! ID: ${checkinData.id}`);
      return true;

    } catch (error) {
      addDebugInfo(`❌ Erro performCheckin: ${error}`);
      throw error;
    }
  };

  /**
   * Processa resultado do QR
   */
  const handleQRResult = useCallback(async (decodedText: string) => {
    if (scanned || !isMountedRef.current) {
      addDebugInfo('QR ignorado - já processado ou component desmontado');
      return;
    }
    
    try {
      addDebugInfo(`📱 QR detectado: ${decodedText}`);
      setScanned(true);
      
      // Para o scanner
      if (scannerRef.current) {
        try {
          addDebugInfo('Parando scanner...');
          await scannerRef.current.stop();
        } catch (e) {
          addDebugInfo(`Erro ao parar scanner: ${e}`);
        }
      }
      
      // Feedback tátil
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // USAR RPC FUNCTION - Ultra rápida e robusta
      try {
        console.log(`🚀 ENVIANDO QR "${decodedText}" PARA RPC FUNCTION...`);
        addDebugInfo('🚀 Usando RPC function para processamento completo');
        const rpcResult = await processQRCodeViaRPC(decodedText);
        
        console.log('✅ ====== RPC PROCESSOU QR COM SUCESSO ======');
        console.log(`🎯 Ação da RPC: ${rpcResult.rpcAction}`);
        console.log(`💬 Mensagem da RPC: ${rpcResult.rpcMessage}`);
        console.log(`👤 Participante encontrado: ${rpcResult.ticketData.name}`);
        
        addDebugInfo(`✅ [QR SUCCESS] RPC retornou: ${rpcResult.rpcMessage}`);
        
        // Enriquecer dados da RPC com informações adicionais se necessário
        let enriched = rpcResult.ticketData;
        
        // Debug: mostrar dados da RPC antes do enriquecimento
        console.log('🔍 [RPC] Dados antes do enriquecimento:', enriched);
        
        // Sempre tentar buscar dados adicionais via fetchTicketData para garantir completude
        try {
          const fetched = await fetchTicketData(decodedText);
          if (fetched) {
            console.log('🔍 [JOIN] Dados encontrados via JOIN:', fetched);
            
            // Enriquecer com dados do JOIN - priorizar dados reais sobre valores padrão
            enriched = { 
              ...enriched, 
              // Usar dados da RPC como base, mas complementar com JOIN
              event_title: (enriched.event_title && enriched.event_title !== 'Evento') ? enriched.event_title : fetched.event_title,
              event_location: (enriched.event_location && enriched.event_location !== 'Local não informado') ? enriched.event_location : fetched.event_location,
              ticket_type: (enriched.ticket_type && enriched.ticket_type !== 'Ingresso') ? enriched.ticket_type : fetched.ticket_type,
              ticket_area: (enriched.ticket_area && enriched.ticket_area !== 'Área não informada') ? enriched.ticket_area : fetched.ticket_area,
              ticket_price: (enriched.ticket_price !== undefined && enriched.ticket_price !== null) ? enriched.ticket_price : fetched.ticket_price,
              ticket_price_feminine: enriched.ticket_price_feminine || fetched.ticket_price_feminine,
              ticket_id: fetched.ticket_id || enriched.ticket_id, 
              ticket_user_id: fetched.ticket_user_id || enriched.ticket_user_id, 
              event_id: fetched.event_id || enriched.event_id, 
              organizer_id: fetched.organizer_id || enriched.organizer_id 
            } as any;
            
            console.log('🔍 [ENRICHED] Dados enriquecidos com JOIN:', {
              event_title: enriched.event_title,
              event_location: enriched.event_location,
              ticket_type: enriched.ticket_type,
              ticket_area: enriched.ticket_area,
              ticket_price: enriched.ticket_price
            });
          }
        } catch (error) {
          console.log('⚠️ Erro ao enriquecer dados:', error);
        }
        
        // Debug: mostrar dados finais
        console.log('🔍 [FINAL] Dados enriquecidos:', enriched);
        
        // Determinar status baseado na ação da RPC
        const status = rpcResult.rpcAction === 'ALREADY_CHECKED_IN' ? 'duplicate' : 'success';
        
        // Debug: mostrar status determinado
        console.log('🔍 [FINAL] Status determinado:', status);
        console.log('🔍 [FINAL] rpcAction:', rpcResult.rpcAction);
        console.log('🔍 [FINAL] is_checked_in:', enriched.is_checked_in);
        console.log('🔍 [FINAL] checked_in_at:', enriched.checked_in_at);
        
        // Mostra dados no modal de check-in
        setError(null);
        navigate('/checkin/resultado', { state: { ticket: enriched } });
         
      } catch (rpcError) {
        addDebugInfo(`❌ Erro: ${rpcError.message}`);
        // Fallback: tentar leitura que inclui preço via ticket_users -> tickets
        const viaJoin = await fetchTicketData(decodedText);
        if (viaJoin) {
          setError(null);
          navigate('/checkin/resultado', { state: { ticket: viaJoin } });
        } else {
          // Último recurso: leitura simples sem preço
          const fallbackData = await fetchDirectFromTicketUsers(decodedText);
          if (fallbackData) {
            setError(null);
            navigate('/checkin/resultado', { state: { ticket: fallbackData } });
          } else {
            setError(`Erro ao processar QR: ${rpcError.message || 'Código QR inválido ou ticket não encontrado'}`);
            setScanResult(null);
            navigate('/checkin/resultado', { state: { ticket: null } });
          }
        }
      }
    } catch (error) {
      addDebugInfo(`❌ Erro handleQRResult: ${error}`);
      setError('Erro ao processar código QR. Tente novamente.');
      setScanResult(null);
      
      // NÃO reinicia automaticamente - usuário deve clicar em "Tentar Novamente"
    }
  }, [scanned, isOpen, onSuccess]);

  /**
   * Inicia o scanner - SOLUÇÃO DEFINITIVA COM SETTIMEOUT
   */
  const startScanner = useCallback(async () => {
    if (!isMountedRef.current || !domReady) {
      addDebugInfo('Componente desmontado ou DOM não pronto - abortando');
      return;
    }

    addDebugInfo('=== INICIANDO SCANNER ===');
    
    try {
      setIsLoading(true);
      setError(null);
      setScanned(false);
      
      // 1. Verifica ambiente seguro
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('Scanner requer HTTPS ou localhost');
      }
      addDebugInfo('✅ Ambiente seguro verificado');

      // 2. Para scanner anterior se existir
      if (scannerRef.current) {
        try {
          addDebugInfo('Limpando scanner anterior...');
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (e) {
          addDebugInfo(`Aviso ao limpar scanner: ${e}`);
        }
        scannerRef.current = null;
      }

      // 3. Verifica suporte a getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não suportado pelo navegador');
      }
      addDebugInfo('✅ getUserMedia suportado');

      // 4. Testa acesso à câmera (permite permissão)
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        testStream.getTracks().forEach(track => track.stop());
        addDebugInfo('✅ Acesso à câmera confirmado');
      } catch (e) {
        addDebugInfo(`Erro de acesso à câmera: ${e}`);
        throw new Error('Erro ao acessar câmera. Verifique as permissões.');
      }

      addDebugInfo('Aguardando estabilidade total...');
      
      // 5. SOLUÇÃO: setTimeout para garantir DOM real
      setTimeout(async () => {
        try {
          if (!isMountedRef.current) {
            addDebugInfo('Componente desmontado durante setTimeout');
            return;
          }

          // 6. Verifica se elemento existe via document.getElementById
          const domElement = document.getElementById(readerId);
          if (!domElement || !readerRef.current) {
            throw new Error('Elemento DOM não encontrado via getElementById');
          }
          addDebugInfo(`✅ Elemento encontrado via getElementById: ${readerId}`);

          // 7. Cria Html5Qrcode usando ID
          addDebugInfo(`Criando Html5Qrcode com elemento: ${readerId}`);
          scannerRef.current = new Html5Qrcode(readerId);
          addDebugInfo('✅ Html5Qrcode criado com sucesso');
          
          // 8. Configuração robusta
          const config: any = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
            rememberLastUsedCamera: true
          };

          addDebugInfo('Obtendo lista de câmeras...');
          let cameras: Array<{ id: string; label: string } & any> = [];
          try {
            cameras = await (Html5Qrcode as any).getCameras();
          } catch (e) {
            addDebugInfo(`Falha ao listar câmeras: ${e}`);
          }

          // Selecionar melhor câmera: traseira se disponível
          let deviceIdToUse: string | null = null;
          if (cameras && cameras.length > 0) {
            const back = cameras.find((c: any) => /back|traseira|rear|environment/i.test(c.label));
            deviceIdToUse = (back || cameras[0]).id || (back || cameras[0]).deviceId || null;
            addDebugInfo(`Câmera selecionada: ${deviceIdToUse}`);
          }

          const startWith = async (constraints: any) => {
            addDebugInfo(`Iniciando scanner com constraints: ${JSON.stringify(constraints)}`);
            return scannerRef.current!.start(
              constraints,
              config,
              (decodedText: string) => {
                addDebugInfo(`✅ QR LIDO: ${decodedText.substring(0, 20)}...`);
                if (!scanned && isMountedRef.current) {
                  handleQRResult(decodedText);
                }
              },
              (_err: string) => {
                // erros intermitentes de varredura
              }
            );
          };

          // Timeout de segurança: 7s
          const withTimeout = (p: Promise<any>, ms = 7000) => Promise.race([
            p,
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout ao iniciar câmera')), ms))
          ]);

          // 9. Tentar iniciar por deviceId; se falhar, por facingMode; por fim user
          let started = false;
          try {
            if (deviceIdToUse) {
              await withTimeout(startWith({ deviceId: { exact: deviceIdToUse } }));
              started = true;
            }
          } catch (e) {
            addDebugInfo(`Falha com deviceId: ${e}`);
          }

          if (!started) {
            try {
              await withTimeout(startWith({ facingMode: { ideal: 'environment' } }));
              started = true;
            } catch (e) {
              addDebugInfo(`Falha com facingMode environment: ${e}`);
            }
          }

          if (!started) {
            try {
              await withTimeout(startWith({ facingMode: 'user' }));
              started = true;
            } catch (e) {
              addDebugInfo(`Falha com facingMode user: ${e}`);
            }
          }

          if (isMountedRef.current && started) {
            setIsScanning(true);
            setIsLoading(false);
            addDebugInfo('✅ Scanner iniciado com sucesso - TUDO OK!');

            // Ajustar o elemento de vídeo para ocupar o container e evitar tela branca
            try {
              const containerEl = document.getElementById(readerId);
              const videoEl = containerEl?.querySelector('video') as HTMLVideoElement | null;
              if (videoEl) {
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = 'cover';
                videoEl.setAttribute('playsinline', 'true');
                (videoEl as any).muted = true;
              }
            } catch {}
          }

          if (!started) {
            throw new Error('Não foi possível iniciar a câmera. Verifique permissões e tente outra câmera.');
          }

        } catch (error) {
          addDebugInfo(`❌ Erro no setTimeout: ${error}`);
          if (isMountedRef.current) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar scanner';
            setError(errorMessage);
            setIsLoading(false);
          }
        }
      }, 150);

    } catch (error) {
      addDebugInfo(`❌ Erro startScanner: ${error}`);
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar scanner';
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [handleQRResult, scanned, domReady]);

  /**
   * Para e limpa o scanner
   */
  const stopScanner = useCallback(async () => {
    addDebugInfo('=== PARANDO SCANNER ===');
    isMountedRef.current = false;
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        addDebugInfo('Scanner parado e limpo');
      } catch (err) {
        addDebugInfo(`Erro ao parar scanner: ${err}`);
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setScanned(false);
    setDomReady(false);
  }, []);

  /**
   * Reinicia completamente
   */
  const restartScanner = useCallback(() => {
    addDebugInfo('=== REINICIANDO SCANNER ===');

    stopScanner();
    setTimeout(() => {
      isMountedRef.current = true;
      if (domReady) {
        startScanner();
      }
    }, 1000);
  }, [stopScanner, startScanner, domReady]);

  /**
   * Retoma scan
   */
  const restartScan = useCallback(() => {
    addDebugInfo('🔄 Reiniciando scanner...');
    setScanned(false);
    setScanResult(null);
    setError(null);
    setIsLoading(true);
    
    // Aguarda um pouco antes de reiniciar para evitar conflitos
    setTimeout(() => {
      if (isMountedRef.current && isOpen) {
        startScanner();
      }
    }, 500);
  }, [startScanner, isOpen]);

  /**
   * Callback do ref para detectar DOM pronto
   */
  const handleRefCallback = useCallback((element: HTMLDivElement | null) => {
    readerRef.current = element;
    if (element) {
      addDebugInfo('✅ Elemento DOM completamente renderizado via ref callback');
      setDomReady(true);
    } else {
      addDebugInfo('Aguardando elemento DOM ser renderizado...');
      setDomReady(false);
    }
  }, []);

  // Effect principal - aguarda DOM estar pronto
  useEffect(() => {
    isMountedRef.current = true;
    
    if (isOpen && domReady) {
      addDebugInfo('Modal aberto e DOM pronto - iniciando scanner');
      const timer = setTimeout(() => {
        startScanner();
      }, 200); // Delay menor já que temos setTimeout interno
      
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      addDebugInfo('Modal fechado - parando scanner');
      stopScanner();
    }
  }, [isOpen, domReady, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      addDebugInfo('Componente desmontando');
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full mx-4 overflow-hidden max-h-[90vh]">
        
        {/* Header Rosa */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-pink-400 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Scanner QR</h2>
                <p className="text-pink-100 text-sm">
                  {scanned ? 'Processando...' : 'Posicione o QR code na área de leitura'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Área do Scanner */}
        <div className="p-6 bg-white">
          <div className="relative bg-black rounded-xl overflow-hidden mb-6 h-80 md:h-96">
            {!isScanning ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">Iniciando câmera...</p>
                </div>
              </div>
            ) : null}
            
            <div id="qr-reader-element" ref={handleRefCallback} className="absolute inset-0" />
            
            {/* Overlay de scanning */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-pink-500 rounded-lg opacity-60">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-pink-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-pink-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-pink-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-pink-500 rounded-br-lg"></div>
              </div>
            </div>
          </div>

          {/* Status */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-red-800 font-medium text-sm">Erro</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>


      </div>
    </div>
  );
};

export default FinalQRScanner;