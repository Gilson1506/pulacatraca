import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Calendar, MapPin, User, Loader2, Camera, CameraOff, Users, CheckCircle, Volume2, VolumeX, X, Mail, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ParticipantSearchResult } from '../types/supabase';
import CheckInModal from '../components/CheckInModal';
import QrScannerLib from 'qr-scanner';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string;
  organizer_id: string;
}

interface CheckInResult {
  success: boolean;
  message: string;
  checkin_id?: string;
  participant_info?: {
    participant_name: string;
    participant_email: string;
    participant_document?: string;
    ticket_type: string;
    event_title: string;
    checkin_date: string;
  };
}

const CheckInPage = () => {
  const { user } = useAuth();
  

  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState<ParticipantSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [checkinStats, setCheckinStats] = useState({
    total_participants: 0,
    checked_in: 0,
    pending: 0,
    percentage: 0,
    last_checkin: null as string | null,
    recent_checkins: [] as any[]
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannerType, setScannerType] = useState<'qr-scanner' | 'zxing'>('qr-scanner');
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'success' | 'already_checked' | 'error';
    message: string;
    data?: any;
  }>({
    isOpen: false,
    type: 'success',
    message: '',
    data: null
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScannerLib | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
    if (user) {
      fetchCurrentEvent();
    }
  }, [user]);

  useEffect(() => {
    if (currentEvent) {
      fetchParticipants();
    }
  }, [currentEvent]);

  useEffect(() => {
    return () => {
      // Cleanup QR Scanner
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.destroy();
        } catch (e) {}
      }
      
      // Cleanup ZXING Scanner
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch (e) {}
      }
    };
  }, []);

  // Função para tocar sons de notificação
  const playNotificationSound = (type: 'success' | 'already_checked' | 'error') => {
    if (!soundEnabled) return;

    try {
      // Criar contexto de áudio se não existir
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frequências diferentes para cada tipo
      switch (type) {
        case 'success':
          // Som de sucesso: duas notas ascendentes
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
          break;
        case 'already_checked':
          // Som de aviso: nota única média
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
          break;
        case 'error':
          // Som de erro: nota baixa
          oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
          break;
      }

      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Não foi possível reproduzir som:', error);
    }
  };

  // Função para feedback háptico (vibração)
  const triggerHapticFeedback = (type: 'success' | 'already_checked' | 'error') => {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'success':
          navigator.vibrate([100, 50, 100]); // Padrão de sucesso
          break;
        case 'already_checked':
          navigator.vibrate([200]); // Vibração única para aviso
          break;
        case 'error':
          navigator.vibrate([300, 100, 300]); // Padrão de erro
          break;
      }
    }
  };

  const showModal = (type: 'success' | 'already_checked' | 'error', message: string, data?: any) => {
    // Reproduzir som e feedback háptico
    playNotificationSound(type);
    triggerHapticFeedback(type);

    setModalState({
      isOpen: true,
      type,
      message,
      data
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const fetchCurrentEvent = async () => {
    if (!user) {
      console.log('❌ fetchCurrentEvent: Usuário não encontrado');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🔍 Buscando evento atual para organizador:', user.id);
      
      // Buscar eventos do organizador atual (incluir todos os status para debug)
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, start_date, location, organizer_id, status')
        .eq('organizer_id', user.id)
        .order('start_date', { ascending: false })
        .limit(5); // Pegar mais eventos para debug

      if (error) {
        console.error('❌ Erro ao buscar evento:', error);
        showModal('error', `Erro ao buscar evento: ${error.message}`);
        setIsLoading(false);
        return;
      }

      console.log('📅 Todos os eventos encontrados:', events);
      
      // Filtrar eventos aprovados
      const approvedEvents = events?.filter(e => e.status === 'approved') || [];
      console.log('✅ Eventos aprovados:', approvedEvents);
      
      if (approvedEvents.length > 0) {
        console.log('✅ Evento selecionado:', approvedEvents[0]);
        setCurrentEvent(approvedEvents[0]);
      } else {
        console.log('⚠️ Nenhum evento aprovado encontrado');
        if (events && events.length > 0) {
          console.log('📋 Status dos eventos encontrados:', events.map(e => ({ title: e.title, status: e.status })));
          showModal('error', `Nenhum evento aprovado encontrado. Você tem ${events.length} evento(s), mas nenhum está aprovado.`);
        } else {
          showModal('error', 'Nenhum evento encontrado. Crie um evento primeiro.');
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar evento atual:', error);
      showModal('error', `Erro ao buscar evento: ${error.message || 'Erro desconhecido'}`);
      setIsLoading(false);
    }
  };

  // Função para buscar estatísticas reais de check-in
  const fetchCheckinStats = async () => {
    if (!currentEvent || !user) return;

    try {
      console.log('📊 Buscando estatísticas de check-in...');
      
      // Buscar check-ins do evento diretamente
      const { data: checkinData, error: checkinError } = await supabase
        .from('checkin')
        .select(`
          id,
          created_at,
          ticket_users (
            name,
            email
          )
        `)
        .eq('event_id', currentEvent.id)
        .order('created_at', { ascending: false });

      // Buscar total de participantes
      const { data: participantsData, error: participantsError } = await supabase
        .from('tickets')
        .select('id, ticket_user_id')
        .eq('event_id', currentEvent.id)
        .not('ticket_user_id', 'is', null);

      if (checkinError && !checkinError.message?.includes('does not exist')) {
        console.error('❌ Erro ao buscar check-ins:', checkinError);
      }

      if (participantsError) {
        console.error('❌ Erro ao buscar participantes:', participantsError);
      }

      // Calcular estatísticas
      const totalParticipants = participantsData?.length || 0;
      const checkedInCount = checkinData?.length || 0;
      const pending = totalParticipants - checkedInCount;
      const percentage = totalParticipants > 0 ? Math.round((checkedInCount / totalParticipants) * 100) : 0;
      const lastCheckin = checkinData && checkinData.length > 0 ? checkinData[0].created_at : null;
      const recentCheckins = checkinData?.slice(0, 5) || [];

      setCheckinStats({
        total_participants: totalParticipants,
        checked_in: checkedInCount,
        pending,
        percentage,
        last_checkin: lastCheckin,
        recent_checkins: recentCheckins
      });

      setTotalParticipants(totalParticipants);
      setCheckedInCount(checkedInCount);

      console.log('📊 Estatísticas atualizadas:', {
        total: totalParticipants,
        checkedIn: checkedInCount,
        pending,
        percentage
      });

    } catch (error: any) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      // Fallback silencioso para não interromper a aplicação
    }
  };

  const fetchParticipants = async (searchTerm?: string) => {
    if (!user || !currentEvent) {
      console.log('❌ fetchParticipants: Usuário ou evento não encontrado', { user: !!user, currentEvent: !!currentEvent });
      setIsLoading(false);
      return;
    }
    
    try {
      setIsSearching(true);
      console.log('🔍 Buscando participantes...', {
        event_id: currentEvent.id,
        organizer_id: user.id,
        search_term: searchTerm || 'null'
      });
      
      // Tentar chamar a função RPC de busca de participantes
      const { data, error } = await supabase.rpc('search_participants_by_text', {
        p_search_text: searchTerm || '',
        p_event_id: currentEvent.id,
        p_organizer_id: user.id
      });

      if (error) {
        console.error('❌ Erro na função RPC search_participants_by_text:', error);
        
        // Se a função RPC não existir, mostrar erro específico
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          showModal('error', 'Função de busca não encontrada. Execute o script SQL fix_checkin_qr_code_search.sql para criar as funções necessárias.');
          setIsLoading(false);
          setIsSearching(false);
          return;
        }
        
        // Se for erro de tabela ou coluna, mostrar erro específico
        if (error.message?.includes('relation') && error.message?.includes('checkins') && error.message?.includes('does not exist')) {
          showModal('error', 'Erro: a função ainda está usando a tabela "checkins" (plural). Execute fix_search_participants_checkin_table.sql no Supabase para corrigir.');
          setIsLoading(false);
          setIsSearching(false);
          return;
        }
        
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          if (error.message?.includes('organizer_id')) {
            showModal('error', 'Erro: coluna organizer_id não existe na tabela checkin. Execute o script SQL fix_checkin_table_and_functions.sql para corrigir.');
          } else {
            showModal('error', 'Erro na estrutura do banco de dados. Execute o script SQL fix_search_participants_column.sql para corrigir.');
          }
          setIsLoading(false);
          setIsSearching(false);
          return;
        }
        
        throw error;
      }

      console.log('✅ Dados recebidos da função RPC:', data);
      
      // Verificar se data é um array
      if (!Array.isArray(data)) {
        console.error('❌ Dados recebidos não são um array:', data);
        showModal('error', 'Formato de dados inválido recebido do servidor.');
        setIsLoading(false);
        setIsSearching(false);
        return;
      }
      
      const participantsList = data as ParticipantSearchResult[];
      setParticipants(participantsList);
      
      // Calcular estatísticas locais
      const total = participantsList.length;
      const checkedIn = participantsList.filter(p => p.is_checked_in).length;
      
      setTotalParticipants(total);
      setCheckedInCount(checkedIn);
      
      console.log('📊 Estatísticas locais:', {
        total: total,
        checkedIn: checkedIn,
        pending: total - checkedIn
      });

      // Buscar estatísticas reais do banco
      await fetchCheckinStats();

      // Se não há participantes, mostrar mensagem informativa
      if (total === 0) {
        if (searchTerm) {
          console.log('🔍 Nenhum participante encontrado para a busca:', searchTerm);
        } else {
          console.log('📝 Nenhum participante encontrado para este evento');
          showModal('error', 'Nenhum participante encontrado para este evento. Verifique se há ingressos vendidos.');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao buscar participantes:', error);
      showModal('error', `Erro ao carregar participantes: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  };

  const performCheckIn = async (ticketUserId: string) => {
    if (!user || !currentEvent) {
      console.log('❌ performCheckIn: Usuário ou evento não encontrado');
      showModal('error', 'Erro: usuário ou evento não encontrado');
      return;
    }

    try {
      setIsScanning(true);
      console.log('🎯 Realizando check-in...', {
        ticket_user_id: ticketUserId,
        event_id: currentEvent.id,
        organizer_id: user.id
      });
      
      const { data, error } = await supabase.rpc('perform_participant_checkin', {
        p_ticket_user_id: ticketUserId,
        p_event_id: currentEvent.id,
        p_organizer_id: user.id
      });

      if (error) {
        console.error('❌ Erro na função RPC perform_participant_checkin:', error);
        
        // Se a função RPC não existir, mostrar erro específico
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          showModal('error', 'Função de check-in não encontrada. Execute o script SQL para criar as funções necessárias.');
          setIsScanning(false);
          return;
        }
        
        throw error;
      }

      console.log('✅ Resultado do check-in:', data);
      
      // Verificar se data é um array e tem pelo menos um elemento
      if (!Array.isArray(data) || data.length === 0) {
        console.error('❌ Dados de retorno inválidos:', data);
        showModal('error', 'Resposta inválida do servidor durante o check-in.');
        setIsScanning(false);
        return;
      }
      
      const result = data[0] as CheckInResult;
      console.log('📋 Resultado processado:', result);
      
      if (result.success) {
        console.log('🎉 Check-in realizado com sucesso!');
        
        // Montar dados do participante para o modal
        const participantInfo = {
          participant_name: result.participant_name,
          participant_email: result.participant_email,
          participant_document: result.participant_document,
          ticket_type: result.ticket_type,
          event_title: result.event_title,
          checkin_date: result.checkin_date
        };
        
        showModal('success', result.message, participantInfo);
        
        // Recarregar participantes após um pequeno delay
        setTimeout(() => {
          fetchParticipants(searchQuery);
        }, 1000);
        
      } else {
        console.log('⚠️ Check-in não realizado:', result.message);
        
        // Verificar se é duplicata
        if (result.message.includes('já foi realizado') || result.message.includes('already')) {
          const participantInfo = {
            participant_name: result.participant_name,
            participant_email: result.participant_email,
            participant_document: result.participant_document,
            ticket_type: result.ticket_type,
            event_title: result.event_title,
            checkin_date: result.checkin_date
          };
          showModal('already_checked', result.message, participantInfo);
        } else {
          showModal('error', result.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar check-in:', error);
      showModal('error', `Erro ao processar check-in: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleQRCodeScan = async (qrData: string) => {
    // Validação rápida
    const trimmedQR = qrData?.trim();
    if (!trimmedQR || !user || !currentEvent) {
      showModal('error', 'QR inválido ou dados ausentes');
      return;
    }

    console.log('🎯 QR:', trimmedQR);

    try {
      // Chamada RPC otimizada (sem setIsScanning para ser mais rápido)
      const { data, error } = await supabase.rpc('checkin_by_qr_code', {
        p_qr_code: trimmedQR,
        p_event_id: currentEvent.id,
        p_organizer_id: user.id
      });

      if (error) {
        console.error('❌ RPC Error:', error.message);
        
        // Tratamento específico de erros de banco
                 if (error.message?.includes('organizer_id') && error.message?.includes('does not exist')) {
           showModal('error', 'Execute fix_checkin_table_and_functions.sql no Supabase para corrigir a tabela checkin', {
             qr_code: trimmedQR,
             error_details: 'Coluna organizer_id ausente na tabela checkin'
           });
           return;
         }
        
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          showModal('error', 'Execute fix_checkin_qr_code_search.sql no Supabase para criar funções', {
            qr_code: trimmedQR,
            error_details: 'Função checkin_by_qr_code não encontrada'
          });
          return;
        }
        
        throw error;
      }

      const result = data?.[0];
      if (!result) {
        showModal('error', 'Resposta inválida do servidor', { 
          qr_code: trimmedQR,
          error_details: 'Nenhum resultado retornado'
        });
        return;
      }

      // Processamento imediato com feedback sonoro
      if (result.success) {
        console.log('✅ Check-in OK');
        soundEnabled && playSound('success');
        showModal('success', result.message, result.participant_info);
        fetchParticipants(searchQuery); // Atualizar sem aguardar
      } else {
        const isAlreadyChecked = result.message?.includes('já foi realizado') || result.message?.includes('anteriormente');
        soundEnabled && playSound(isAlreadyChecked ? 'already_checked' : 'error');
        showModal(isAlreadyChecked ? 'already_checked' : 'error', result.message, {
          ...result.participant_info,
          qr_code: trimmedQR
        });
      }

    } catch (error: any) {
      console.error('❌ Check-in error:', error.message);
      showModal('error', `Erro: ${error.message}`, {
        qr_code: trimmedQR,
        error_details: error.message || 'Erro desconhecido'
      });
    }
  };

  const startZXingScanner = async () => {
    // Aguardar o elemento de vídeo estar disponível
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!videoRef.current && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!videoRef.current) {
      console.error('❌ Elemento de vídeo não encontrado após aguardar');
      showModal('error', 'Erro: elemento de vídeo não disponível. Tente ativar o scanner novamente.');
      setScannerActive(false);
      setIsScanning(false);
      return;
    }

    try {
      console.log('📱 Iniciando scanner ZXING...');
      setScannerActive(true);
      setIsScanning(true);

      // Parar scanner anterior se existir
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch (e) {}
        zxingReaderRef.current = null;
      }

      const codeReader = new BrowserMultiFormatReader();
      zxingReaderRef.current = codeReader;

      // Iniciar decodificação
      await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            const qrData = result.getText();
            console.log('📸 QR Code detectado (ZXING):', qrData);
            handleQRCodeScan(qrData);
            stopZXingScanner();
          }
          if (err && !result) {
            console.log('⚠️ Erro de decodificação ZXING:', err);
          }
        }
      );

      setIsScanning(false);
      console.log('✅ Scanner ZXING iniciado com sucesso');

    } catch (error: any) {
      console.error('❌ Erro ao iniciar scanner ZXING:', error);
      let errorMessage = 'Erro ao acessar a câmera';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão de câmera negada. Permita o acesso e tente novamente.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada neste dispositivo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
      } else {
        errorMessage = `Erro ao acessar câmera: ${error.message || 'Erro desconhecido'}`;
      }

      showModal('error', errorMessage, {
        error_details: `${error.name}: ${error.message}`,
        camera_error: true
      });
      setScannerActive(false);
      setIsScanning(false);
    }
  };

  // Scanner Simplificado - Mais confiável
  const startSimpleScanner = async () => {
    try {
      setScannerActive(true);
      setIsScanning(true);
      
      console.log('🎥 Iniciando scanner simplificado...');
      
      // Aguardar elemento de vídeo estar disponível
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado');
      }

      // Solicitar acesso à câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Câmera traseira preferencialmente
          width: { ideal: 640 },
          height: { ideal: 640 }
        }
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      // Scanner otimizado para velocidade
      const qrScanner = new QrScannerLib(
        videoRef.current, 
        (result) => {
          console.log('📸 QR:', result.data);
          // Parar scanner imediatamente
          qrScanner.stop();
          // Processar QR rapidamente
          handleQRCodeScan(result.data);
          // Fechar scanner
          stopSimpleScanner();
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: false, // Desabilitado para melhor performance
          highlightCodeOutline: false, // Desabilitado para melhor performance
          maxScansPerSecond: 10, // Máxima velocidade
          returnDetailedScanResult: false, // Mais rápido
          // Área de scan otimizada
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight) * 0.6;
            return {
              x: (video.videoWidth - size) / 2,
              y: (video.videoHeight - size) / 2,
              width: size,
              height: size,
            };
          }
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();
      
      setIsScanning(false);
      console.log('✅ Scanner iniciado com sucesso');
      
    } catch (error: any) {
      console.error('❌ Erro ao iniciar scanner:', error);
      let errorMessage = 'Erro ao acessar a câmera';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão negada. Permita o acesso à câmera.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Câmera não encontrada.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera em uso por outro aplicativo.';
      }
      
      showModal('error', errorMessage);
      stopSimpleScanner();
    }
  };

  const stopSimpleScanner = () => {
    try {
      setScannerActive(false);
      setIsScanning(false);
      
      // Parar QR Scanner
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      
      // Parar stream de vídeo
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      console.log('⏹️ Scanner parado');
    } catch (error) {
      console.error('Erro ao parar scanner:', error);
    }
  };

  const stopZXingScanner = () => {
    console.log('⏹️ Parando scanner ZXING...');
    
    try {
      if (zxingReaderRef.current) {
        zxingReaderRef.current.reset();
        zxingReaderRef.current = null;
        console.log('✅ Scanner ZXING parado');
      }
      
      // Garantir que o vídeo pare
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('📹 Track ZXING parado:', track.label);
          });
        }
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error('Erro ao parar scanner ZXING:', error);
    } finally {
      setScannerActive(false);
      setIsScanning(false);
    }
  };

  const startQRScanner = async () => {
    // Aguardar o elemento de vídeo estar disponível
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!videoRef.current && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!videoRef.current) {
      console.error('❌ Elemento de vídeo não encontrado após aguardar');
      showModal('error', 'Erro: elemento de vídeo não disponível. Tente ativar o scanner novamente.');
      setScannerActive(false);
      setIsScanning(false);
      return;
    }

    try {
      console.log('📱 Iniciando scanner QR...');
      setScannerActive(true);
      setIsScanning(true);

      // Verificar se já existe um scanner ativo
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }

      // Verificar se dispositivo suporta câmera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Este dispositivo ou navegador não suporta acesso à câmera.');
      }

      // Verificar dispositivos de vídeo disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('Nenhuma câmera encontrada neste dispositivo.');
      }

      console.log(`📷 ${videoDevices.length} câmera(s) encontrada(s)`);

      // Solicitar permissões de câmera com diferentes tentativas
      let stream = null;
      const constraints = [
        // Primeira tentativa: Câmera traseira (preferida para QR)
        { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 }
          } 
        },
        // Segunda tentativa: Câmera frontal
        { 
          video: { 
            facingMode: 'user',
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 }
          } 
        },
        // Terceira tentativa: Qualquer câmera
        { 
          video: { 
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 }
          } 
        }
      ];

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('✅ Permissões de câmera concedidas');
          break;
        } catch (err) {
          console.log('⚠️ Tentativa com constraint falhou:', constraint);
        }
      }

      if (!stream) {
        throw new Error('Não foi possível acessar nenhuma câmera. Verifique as permissões.');
      }

      // Parar o stream temporário (o QrScanner vai gerenciar)
      stream.getTracks().forEach(track => track.stop());
      
      qrScannerRef.current = new QrScannerLib(
        videoRef.current,
        result => {
          console.log('📸 QR Code detectado:', result.data);
          handleQRCodeScan(result.data);
          stopQRScanner();
        },
        {
          onDecodeError: (error) => {
            // Silenciar erros de decodificação normais
          },
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        }
      );

      await qrScannerRef.current.start();
      setIsScanning(false);
      console.log('✅ Scanner QR iniciado com sucesso');
      
    } catch (error: any) {
      console.error('❌ Erro ao iniciar scanner:', error);
      let errorMessage = 'Erro ao acessar a câmera';
      
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        errorMessage = 'Permissão de câmera negada. Clique no ícone de câmera na barra de endereços e permita o acesso.';
      } else if (error.name === 'NotFoundError' || error.message?.includes('NotFoundError')) {
        errorMessage = 'Nenhuma câmera encontrada. Verifique se seu dispositivo possui câmera.';
      } else if (error.name === 'NotReadableError' || error.message?.includes('NotReadableError')) {
        errorMessage = 'Câmera está sendo usada por outro aplicativo. Feche outros apps que usam câmera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Configuração de câmera não suportada. Tentando configuração alternativa...';
      } else if (error.message?.includes('suporta')) {
        errorMessage = error.message;
      } else {
        errorMessage = `Erro ao acessar câmera: ${error.message || 'Erro desconhecido'}`;
      }
      
      showModal('error', errorMessage, {
        error_details: `${error.name}: ${error.message}`,
        camera_error: true
      });
      setScannerActive(false);
      setIsScanning(false);
    }
  };

  const stopQRScanner = () => {
    console.log('⏹️ Parando todos os scanners...');
    
    try {
      // Parar QR Scanner (qr-scanner lib)
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
        console.log('✅ QR Scanner parado');
      }
      
      // Parar ZXING Scanner
      if (zxingReaderRef.current) {
        zxingReaderRef.current.reset();
        zxingReaderRef.current = null;
        console.log('✅ ZXING Scanner parado');
      }
      
      // Garantir que o vídeo pare completamente
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('📹 Track de vídeo parado:', track.label);
          });
        }
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error('Erro ao parar scanner:', error);
    } finally {
      setScannerActive(false);
      setIsScanning(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    fetchParticipants(searchTerm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando sistema de check-in...</p>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Nenhum Evento Ativo</h1>
              <p className="text-gray-600">Você precisa ter um evento aprovado para usar o sistema de check-in.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-4 sm:py-8">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">

          


          {/* Event Info - Melhorado com imagem e estatísticas */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Imagem do Evento */}
              {currentEvent.image && (
                <div className="flex-shrink-0">
                  <img 
                    src={currentEvent.image} 
                    alt={currentEvent.title}
                    className="w-full sm:w-24 sm:h-24 md:w-32 md:h-32 object-cover rounded-lg"
                  />
                </div>
              )}
              
              {/* Informações principais */}
              <div className="flex-grow">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      🎯 {currentEvent.title}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">Sistema de check-in em tempo real</p>
                  </div>
                  
                  {/* Controles: Som e Scanner */}
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    {/* Botão Scanner QR */}
                    <button
                      onClick={scannerActive ? stopSimpleScanner : startSimpleScanner}
                      disabled={isScanning}
                      className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                        scannerActive 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                          : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                      } disabled:opacity-50`}
                      title={scannerActive ? 'Parar Scanner' : 'Ativar Scanner QR'}
                    >
                      {isScanning ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs sm:text-sm hidden sm:block">Iniciando...</span>
                        </>
                      ) : scannerActive ? (
                        <>
                          <CameraOff className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="text-xs sm:text-sm hidden sm:block">Parar</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="text-xs sm:text-sm hidden sm:block">Scanner</span>
                        </>
                      )}
                    </button>

                    {/* Botão de som */}
                    <button
                      onClick={toggleSound}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        soundEnabled 
                          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
                    >
                      {soundEnabled ? (
                        <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Estatísticas em Grid Responsivo - Dados Reais */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  {/* Data do Evento */}
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-blue-600 font-medium">Data</p>
                        <p className="text-xs sm:text-sm font-semibold text-blue-900 truncate">
                          {new Date(currentEvent.start_date).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Check-ins Realizados */}
                  <div className="bg-green-50 p-2 sm:p-3 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-green-600 font-medium">Check-ins</p>
                        <p className="text-xs sm:text-sm font-semibold text-green-900">
                          {checkinStats.checked_in} / {checkinStats.total_participants}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pendentes */}
                  <div className="bg-purple-50 p-2 sm:p-3 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-purple-600 font-medium">Pendentes</p>
                        <p className="text-xs sm:text-sm font-semibold text-purple-900">
                          {checkinStats.pending}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Percentual */}
                  <div className="bg-orange-50 p-2 sm:p-3 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-orange-600 font-medium">Conclusão</p>
                        <p className="text-xs sm:text-sm font-semibold text-orange-900">
                          {checkinStats.percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Barra de progresso com dados reais */}
                <div className="mt-3 sm:mt-4">
                  <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                    <span className="font-medium">Progresso do Check-in</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-green-600">{checkinStats.percentage}%</span>
                      {checkinStats.last_checkin && (
                        <span className="text-gray-400">
                          • Último: {new Date(checkinStats.last_checkin).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${checkinStats.percentage}%` }}
                    ></div>
                  </div>
                  
                  {/* Informações adicionais para mobile */}
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{checkinStats.checked_in} confirmados</span>
                    <span>{checkinStats.pending} pendentes</span>
                  </div>
                </div>

                {/* Scanner QR Integrado */}
                {scannerActive && (
                  <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Camera className="h-4 w-4 text-pink-600" />
                        <span className="text-sm font-medium text-pink-900">Scanner QR Ativo</span>
                      </div>
                      <button
                        onClick={stopSimpleScanner}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Fechar Scanner"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="relative mx-auto max-w-xs">
                      <video 
                        ref={videoRef}
                        className="w-full aspect-square rounded-lg shadow-lg border-2 border-pink-300 object-cover"
                        playsInline
                        muted
                      />
                      
                      {/* Overlay de scanning */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-4 border-2 border-white rounded-lg shadow-lg">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pink-500 rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-pink-500 rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-pink-500 rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-pink-500 rounded-br-lg"></div>
                        </div>
                      </div>
                      
                      {/* Status simples */}
                      <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        📷 Escaneando QR
                      </div>
                    </div>
                    
                    <p className="text-xs text-pink-700 text-center mt-2">
                      Aponte a câmera para o QR code do ingresso
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Busca Manual - Container Principal */}
          <div className="max-w-4xl mx-auto">
            {/* Manual Search - Mobile Optimized */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border-l-4 border-blue-500">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <Search className="h-5 w-5 text-blue-600" />
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Busca Manual</h2>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome, email ou documento"
                    className="w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base placeholder-gray-500"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                </div>

                {/* Search Results - Mobile Optimized */}
                <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-center py-6 sm:py-8">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-blue-600" />
                      <p className="text-xs sm:text-sm text-gray-500 mt-2">Buscando participantes...</p>
                    </div>
                  ) : participants.length > 0 ? (
                    participants.map((participant) => (
                      <div key={participant.ticket_user_id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-300 transition-all duration-200 bg-white hover:bg-blue-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                              <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{participant.name}</p>
                            </div>
                            <div className="space-y-1 text-xs sm:text-sm">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                <p className="text-gray-600 truncate">{participant.email}</p>
                              </div>
                              {participant.document && (
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <p className="text-gray-600">Doc: {participant.document}</p>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {participant.ticket_type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            {participant.is_checked_in ? (
                              <div className="flex flex-col items-end space-y-2">
                                <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-full">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="text-green-800 text-sm font-medium">
                                    ✓ Check-in realizado
                                  </span>
                                </div>
                                {participant.checkin_date && (
                                  <p className="text-xs text-gray-500">
                                    {new Date(participant.checkin_date).toLocaleString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => performCheckIn(participant.ticket_user_id)}
                                disabled={isScanning}
                                className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none font-semibold"
                              >
                                {isScanning ? (
                                  <div className="flex items-center space-x-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Processando...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Fazer Check-in</span>
                                  </div>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : searchQuery ? (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Nenhum participante encontrado</p>
                      <p className="text-sm text-gray-400 mt-1">Tente buscar por outro termo</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Digite para buscar participantes</p>
                      <p className="text-sm text-gray-400 mt-1">Nome, e-mail, documento ou ID</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">Estatísticas do Evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Check-ins realizados</p>
                    <p className="text-2xl font-bold text-green-900">{checkedInCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Total de participantes</p>
                    <p className="text-2xl font-bold text-blue-900">{totalParticipants}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-900">{totalParticipants - checkedInCount}</p>
                  </div>
                  <User className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Modal de Check-in */}
      <CheckInModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        message={modalState.message}
        data={modalState.data}
      />
    </div>
  );
};

export default CheckInPage;