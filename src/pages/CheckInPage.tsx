import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Calendar, MapPin, User, Camera, CameraOff, Users, CheckCircle, Volume2, VolumeX, X, Mail, FileText, TrendingUp, Settings } from 'lucide-react';
import ProfessionalLoader from '../components/ProfessionalLoader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ParticipantSearchResult } from '../types/supabase';
import CheckInModal from '../components/CheckInModal';
import FinalQRScanner from '../components/FinalQRScanner';
import CameraDiagnostic from '../components/CameraDiagnostic';

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
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [showFinalScanner, setShowFinalScanner] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
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

  // Cleanup automático já é feito pelo ScannerModal

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
      
      // Buscar check-ins do evento diretamente (sem JOIN complexo)
      const { data: checkinData, error: checkinError } = await supabase
        .from('checkin')
        .select(`
          id,
          created_at,
          ticket_user_id,
          user_id,
          event_id
        `)
        .eq('event_id', currentEvent.id)
        .order('created_at', { ascending: false });

      // Se encontrou check-ins, buscar dados dos usuários separadamente
      let enrichedCheckins = [];
      if (checkinData && checkinData.length > 0) {
        const ticketUserIds = checkinData
          .filter(c => c.ticket_user_id)
          .map(c => c.ticket_user_id);
        
        let ticketUsersData = [];
        if (ticketUserIds.length > 0) {
          const { data: users } = await supabase
            .from('ticket_users')
            .select('id, name, email')
            .in('id', ticketUserIds);
          ticketUsersData = users || [];
        }

        // Combinar dados
        enrichedCheckins = checkinData.map(checkin => ({
          ...checkin,
          ticket_users: ticketUsersData.find(u => u.id === checkin.ticket_user_id) || {
            name: 'Participante',
            email: 'Não informado'
          }
        }));
      }

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
      const checkedInCount = enrichedCheckins?.length || 0;
      const pending = totalParticipants - checkedInCount;
      const percentage = totalParticipants > 0 ? Math.round((checkedInCount / totalParticipants) * 100) : 0;
      const lastCheckin = enrichedCheckins && enrichedCheckins.length > 0 ? enrichedCheckins[0].created_at : null;
      const recentCheckins = enrichedCheckins?.slice(0, 5) || [];

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
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          if (error.message?.includes('checkins')) {
            showModal('error', 'Erro: a função ainda está usando a tabela "checkins" (plural). Execute fix_search_participants_checkin_table.sql no Supabase para corrigir.');
          } else if (error.message?.includes('checkin')) {
            showModal('error', 'Erro: tabela "checkin" não encontrada. Execute fix_checkin_table_and_functions.sql no Supabase para criar a tabela.');
          } else {
            showModal('error', 'Erro: tabela não encontrada. Execute os scripts SQL necessários no Supabase.');
          }
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
          return;
        }
        
        throw error;
      }

      console.log('✅ Resultado do check-in:', data);
      
      // Verificar se data é um array e tem pelo menos um elemento
      if (!Array.isArray(data) || data.length === 0) {
        console.error('❌ Dados de retorno inválidos:', data);
        showModal('error', 'Resposta inválida do servidor durante o check-in.');
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
    }
  };

  const handleQRCodeScan = async (qrData: string, ticketData?: any) => {
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
        soundEnabled && playNotificationSound('success');
        showModal('success', result.message, result.participant_info);
        fetchParticipants(searchQuery); // Atualizar sem aguardar
      } else {
        const isAlreadyChecked = result.message?.includes('já foi realizado') || result.message?.includes('anteriormente');
        soundEnabled && playNotificationSound(isAlreadyChecked ? 'already_checked' : 'error');
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






  // Todas as funções de scanner foram movidas para o ScannerModal



  const handleSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    fetchParticipants(searchTerm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProfessionalLoader size="lg" />
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
              <h1 className="text-2xl font-bold text-gray-700 mb-2">Nenhum Evento Ativo</h1>
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
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-gray-700 mb-1">
                      {currentEvent.title}
                    </h1>
                    <p className="text-sm text-gray-600">Sistema de check-in em tempo real</p>
                  </div>
                  
                  {/* Layout mobile será grid quadrado, desktop normal */}
                  <div className="hidden sm:block">
                    {/* Botão de som desktop */}
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
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Layout Mobile: Grid Horizontal Organizado | Desktop: Layout Completo */}
                <div className="sm:hidden">
                  {/* Mobile: Grid horizontal 4 colunas sem espaços vazios */}
                  <div className="grid grid-cols-4 gap-1">
                    {/* Data */}
                    <div className="bg-blue-50 p-2 rounded border border-blue-200 flex flex-col items-center justify-center text-center">
                      <Calendar className="h-4 w-4 text-blue-600 mb-1" />
                                              <div className="text-xs font-medium text-blue-700">Data</div>
                      <div className="text-xs text-blue-800 font-semibold">
                        {new Date(currentEvent.start_date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </div>
                    </div>

                    {/* Check-ins */}
                    <div className="bg-green-50 p-2 rounded border border-green-200 flex flex-col items-center justify-center text-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
                                              <div className="text-xs font-medium text-green-700">Check-ins</div>
                      <div className="text-xs text-green-800 font-bold">
                        {checkinStats.checked_in}/{checkinStats.total_participants}
                      </div>
                      <div className="text-xs text-green-600">{checkinStats.percentage}%</div>
                    </div>

                    {/* Som */}
                    <div className="bg-purple-50 p-2 rounded border border-purple-200 flex flex-col items-center justify-center">
                      <button
                        onClick={toggleSound}
                        className="flex flex-col items-center justify-center h-full w-full"
                        title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
                      >
                        {soundEnabled ? (
                          <Volume2 className="h-4 w-4 text-purple-600 mb-1" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-purple-400 mb-1" />
                        )}
                                                  <div className="text-xs font-medium text-purple-700">Som</div>
                        <div className="text-xs text-purple-600">{soundEnabled ? 'ON' : 'OFF'}</div>
                      </button>
                    </div>

                    {/* Scanner */}
                    <div className="bg-pink-50 p-2 rounded border border-pink-200 flex flex-col items-center justify-center">
                      <button
                        onClick={() => setShowScannerModal(true)}
                        className="flex flex-col items-center justify-center h-full w-full"
                        title="Abrir scanner QR"
                      >
                        <Camera className="h-4 w-4 text-pink-600 mb-1" />
                                                  <div className="text-xs font-medium text-pink-700">Scanner</div>
                        <div className="text-xs text-pink-600">QR</div>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Desktop: Layout detalhado original */}
                <div className="hidden sm:block space-y-4">
                  {/* Imagem do evento se disponível */}
                  {currentEvent.image_url && (
                    <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                      <img 
                        src={currentEvent.image_url} 
                        alt={currentEvent.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Grid de informações desktop */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Data e Horário */}
                    <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-blue-700">Data & Horário</span>
                      </div>
                      <div className="text-xs sm:text-sm text-blue-800">
                        <div>{new Date(currentEvent.start_date).toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          day: '2-digit', 
                          month: 'long',
                          year: 'numeric'
                        })}</div>
                        <div className="text-xs text-blue-600 mt-1">
                          {new Date(currentEvent.start_date).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {currentEvent.end_date && ` - ${new Date(currentEvent.end_date).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}`}
                        </div>
                      </div>
                    </div>

                    {/* Check-ins */}
                    <div className="bg-green-50 p-2 sm:p-3 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-green-700">Check-ins</span>
                      </div>
                      <div className="text-xs sm:text-sm text-green-800">
                        <div className="flex items-center justify-between">
                          <span>Realizados:</span>
                          <span className="font-bold text-green-600">{checkinStats.checked_in}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Total:</span>
                          <span className="font-bold">{checkinStats.total_participants}</span>
                        </div>
                        <div className="mt-2 bg-green-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${checkinStats.percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-green-600 mt-1 text-center">
                          {checkinStats.percentage}% concluído
                        </div>
                      </div>
                    </div>

                    {/* Localização ou Status */}
                    <div className="bg-purple-50 p-2 sm:p-3 rounded-lg border border-purple-200 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-purple-700">
                          {currentEvent.location ? 'Localização' : 'Status'}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-purple-800">
                        {currentEvent.location ? (
                          <>
                            <div className="font-medium">{currentEvent.location}</div>
                            {currentEvent.address && (
                              <div className="text-xs text-purple-600 mt-1">{currentEvent.address}</div>
                            )}
                          </>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium">Evento Ativo</span>
                            </div>
                            <div className="text-xs text-purple-600 mt-1">
                              Sistema de check-in operacional
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Último check-in */}
                  {checkinStats.last_checkin && (
                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs sm:text-sm">
                        <span className="text-gray-600">
                          <strong>Último check-in:</strong> {new Date(checkinStats.last_checkin).toLocaleString('pt-BR', { 
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {checkinStats.pending} pendentes
                        </span>
                      </div>
                    </div>
                  )}
                </div>


              </div>
            </div>
          </div>

          {/* Busca Manual - Container Principal */}
          <div className="max-w-4xl mx-auto">
            {/* Manual Search - Mobile Optimized */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-700">Busca Manual</h2>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Botão Scanner QR Final */}
                  <button
                    onClick={() => setShowFinalScanner(true)}
                    className="flex items-center space-x-1 px-2 sm:px-3 py-2 rounded-lg font-medium transition-all duration-200 bg-purple-100 text-purple-600 hover:bg-purple-200 text-xs sm:text-sm"
                    title="Scanner QR HTML5 Nativo"
                  >
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Scanner QR</span>
                  </button>

                  {/* Botão Diagnóstico de Câmera */}
                  <button
                    onClick={() => setShowDiagnostic(true)}
                    className="flex items-center space-x-1 px-2 sm:px-3 py-2 rounded-lg font-medium transition-all duration-200 bg-blue-100 text-blue-600 hover:bg-blue-200 text-xs sm:text-sm"
                    title="Diagnóstico de Câmera"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Diagnóstico</span>
                    <span className="sm:hidden">D</span>
                  </button>
                </div>
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
                    <div className="flex justify-center py-6 sm:py-8">
                      <ProfessionalLoader size="md" />
                    </div>
                  ) : participants.length > 0 ? (
                    participants.map((participant) => (
                      <div key={participant.ticket_user_id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-300 transition-all duration-200 bg-white hover:bg-blue-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                              <p className="font-semibold text-gray-700 text-sm sm:text-base truncate">{participant.name}</p>
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
                                className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                              >
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Fazer Check-in</span>
                                </div>
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

          {/* Resumo dos Check-ins - Dados Reais */}
          {checkinStats.recent_checkins.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-700 mb-3">Últimos Check-ins Realizados</h3>
              <div className="space-y-2">
                {checkinStats.recent_checkins.slice(0, 3).map((checkin, index) => (
                  <div key={checkin.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          {checkin.ticket_users?.name || `Participante ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {checkin.ticket_users?.email || 'Email não disponível'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-green-600">
                        {new Date(checkin.created_at).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(checkin.created_at).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Resumo final */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Total de check-ins: <strong className="text-green-600">{checkinStats.checked_in}</strong>
                  </span>
                  <span className="text-gray-600">
                    Restantes: <strong className="text-orange-600">{checkinStats.pending}</strong>
                  </span>
                  <span className="text-green-600 font-semibold">
                    {checkinStats.percentage}% concluído
                  </span>
                </div>
              </div>
            </div>
          )}
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

      {/* Modal do Scanner QR Final */}
      <FinalQRScanner
        isOpen={showFinalScanner}
        onClose={() => setShowFinalScanner(false)}
        onSuccess={handleQRCodeScan}
        eventId={currentEvent?.id}
      />

      {/* Modal de Diagnóstico de Câmera */}
      <CameraDiagnostic
        isOpen={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
      />
    </div>
  );
};

export default CheckInPage;