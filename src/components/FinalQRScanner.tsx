import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar, RotateCcw, QrCode, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';
import CheckInModal from './CheckInModal';

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
  ticket_price: number;
  qr_code: string;
  purchased_at: string;
  // Dados do check-in
  is_checked_in: boolean;
  checked_in_at: string | null;
  // IDs necessários
  ticket_id: string;
  event_id: string;
  organizer_id: string;
  // Campos opcionais para diferentes fontes
  ticket_user_id?: string | null;
  user_id?: string | null;
  source?: 'ticket_users' | 'tickets';
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
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const [domReady, setDomReady] = useState(false);
  
  // Refs DOM seguros
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const readerId = "qr-reader-element";

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
      const { data: ticketUserData, error: ticketUserError } = await supabase
        .from('ticket_users')
        .select(`
          id,
          name,
          email,
          qr_code,
          created_at,
          tickets!inner(
            id,
            price,
            ticket_type,
            event_id,
            events!inner(
              id,
              title,
              start_date,
              location,
              user_id
            )
          ),
          checkin(
            id,
            checked_in_at
          )
        `)
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (ticketUserError || !ticketUserData?.tickets?.events) {
        return null;
      }

      const isAlreadyCheckedIn = ticketUserData.checkin && ticketUserData.checkin.length > 0;

      return {
        id: ticketUserData.id,
        name: ticketUserData.name,
        email: ticketUserData.email,
        event_title: ticketUserData.tickets.events.title,
        event_date: ticketUserData.tickets.events.start_date,
        event_location: ticketUserData.tickets.events.location,
        ticket_type: ticketUserData.tickets.ticket_type || 'Padrão',
        ticket_price: ticketUserData.tickets.price || 0,
        qr_code: ticketUserData.qr_code,
        purchased_at: ticketUserData.created_at,
        ticket_id: ticketUserData.tickets.id,
        event_id: ticketUserData.tickets.events.id,
        organizer_id: ticketUserData.tickets.events.user_id,
        ticket_user_id: ticketUserData.id,
        is_checked_in: isAlreadyCheckedIn,
        checked_in_at: ticketUserData.checkin?.[0]?.checked_in_at || null,
        source: 'ticket_users'
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

      addDebugInfo('✅ [RPC] Convertendo dados');

      // ===== CONVERTER PARA TICKETDATA - ESTRUTURA CORRIGIDA =====
      const ticketData: TicketData = {
        id: rpcData.qr_code || qrCode, // Usar QR como ID se não tiver ID específico
        name: rpcData.name || 'Participante',
        email: rpcData.email || '',
        event_title: rpcData.event_title || 'Evento',
        event_date: new Date().toISOString(), // Data atual como fallback
        event_location: 'Local do Evento', // Fallback
        ticket_type: rpcData.ticket_type || 'Ingresso',
        ticket_price: 0, // Fallback
        qr_code: qrCode,
        purchased_at: new Date().toISOString(),
        ticket_id: 'ticket-' + qrCode,
        event_id: 'event-' + qrCode,
        organizer_id: rpcData.organizer_id || '',
        ticket_user_id: rpcData.qr_code || qrCode,
        is_checked_in: rpcResult.action === 'ALREADY_CHECKED_IN',
        checked_in_at: rpcData.checked_in_at || (rpcResult.action === 'CHECK_IN_COMPLETED' ? new Date().toISOString() : null),
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
      const { data: tu, error: tuError } = await supabase
        .from('ticket_users')
        .select('id, name, email, qr_code, event_id, created_at')
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (tuError || !tu) return null;

      // Buscar dados do evento para completar as informações
      let eventTitle = 'Evento';
      let eventDate = new Date().toISOString();
      let eventLocation = 'Local';
      let organizerId = '';

      if (tu.event_id) {
        const { data: ev, error: evError } = await supabase
          .from('events')
          .select('id, title, start_date, location, user_id')
          .eq('id', tu.event_id)
          .maybeSingle();

        if (!evError && ev) {
          eventTitle = ev.title || eventTitle;
          eventDate = ev.start_date || eventDate;
          eventLocation = ev.location || eventLocation;
          organizerId = ev.user_id || organizerId;
        }
      }

      const ticketData: TicketData = {
        id: tu.id,
        name: tu.name || 'Participante',
        email: tu.email || '',
        event_title: eventTitle,
        event_date: eventDate,
        event_location: eventLocation,
        ticket_type: 'Ingresso',
        ticket_price: 0,
        qr_code: tu.qr_code,
        purchased_at: tu.created_at,
        ticket_id: tu.id, // usa id do ticket_user como referência de fallback
        event_id: tu.event_id || 'event-' + qrCode,
        organizer_id: organizerId,
        ticket_user_id: tu.id,
        is_checked_in: false,
        checked_in_at: null,
        source: 'ticket_users'
      };

      return ticketData;
    } catch {
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
        
        // Tentar enriquecer com preço real quando possível
        let enriched = rpcResult.ticketData;
        try {
          const fetched = await fetchTicketData(decodedText);
          if (fetched) {
            enriched = { ...enriched, ticket_price: fetched.ticket_price, ticket_id: fetched.ticket_id, ticket_user_id: fetched.ticket_user_id, event_id: fetched.event_id, organizer_id: fetched.organizer_id } as any;
          }
        } catch {}
        
        // Mostra dados no modal de check-in
        setScanResult(enriched);
        setShowCheckInModal(true);
        setError(null);
        
        if (onSuccess) {
          onSuccess(decodedText, enriched);
        }
        
      } catch (rpcError) {
        addDebugInfo(`❌ Erro: ${rpcError.message}`);
        // Fallback: tentar leitura que inclui preço via ticket_users -> tickets
        const viaJoin = await fetchTicketData(decodedText);
        if (viaJoin) {
          setScanResult(viaJoin);
          setShowCheckInModal(true);
          setError(null);
          if (onSuccess) onSuccess(decodedText, viaJoin);
        } else {
          // Último recurso: leitura simples sem preço
          const fallbackData = await fetchDirectFromTicketUsers(decodedText);
          if (fallbackData) {
            setScanResult(fallbackData);
            setShowCheckInModal(true);
            setError(null);
            if (onSuccess) onSuccess(decodedText, fallbackData);
          } else {
            setError(`Erro ao processar QR: ${rpcError.message || 'Código QR inválido ou ticket não encontrado'}`);
            setScanResult(null);
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

      // 4. Testa acesso à câmera
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        testStream.getTracks().forEach(track => track.stop());
        addDebugInfo('✅ Acesso à câmera confirmado');
      } catch (e) {
        addDebugInfo(`Erro de acesso à câmera: ${e}`);
        throw new Error('Erro ao acessar câmera. Verifique as permissões.');
      }

      addDebugInfo('Aguardando estabilidade total...');
      
      // 5. SOLUÇÃO DEFINITIVA: setTimeout para garantir DOM real
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
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
            rememberLastUsedCamera: true
          };

          addDebugInfo('Iniciando scanner com configuração...');

          // 9. Inicia scanner
          await scannerRef.current.start(
            { 
              facingMode: "environment"
            },
            config,
            (decodedText) => {
              addDebugInfo(`✅ QR LIDO: ${decodedText.substring(0, 20)}...`);
              if (!scanned && isMountedRef.current) {
                handleQRResult(decodedText);
              }
            },
            (error) => {
              // Erro na leitura (normal durante tentativas)
            }
          );
          
          if (isMountedRef.current) {
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

        } catch (error) {
          addDebugInfo(`❌ Erro no setTimeout: ${error}`);
          if (isMountedRef.current) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar scanner';
            setError(errorMessage);
            setIsLoading(false);
          }
        }
      }, 100); // Tempo ideal para estabilizar DOM real

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

        {/* Modal de Check-in Separado */}
        <CheckInModal
          isOpen={showCheckInModal}
          onClose={() => {
            setShowCheckInModal(false);
            setScanned(false);
            startScanner();
          }}
          ticketData={scanResult}
          onSuccess={() => {
            setShowCheckInModal(false);
            setScanned(false);
            startScanner();
          }}
        />
      </div>
    </div>
  );
};

export default FinalQRScanner;