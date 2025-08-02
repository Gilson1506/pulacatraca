import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Calendar, MapPin, User, Loader2, Camera, CameraOff, Users, CheckCircle, Volume2, VolumeX, X, Mail, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ParticipantSearchResult } from '../types/supabase';
import CheckInModal from '../components/CheckInModal';
import QrScanner from 'qr-scanner';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
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
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
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
        console.error('❌ Erro na função RPC search_event_participants:', error);
        
        // Se a função RPC não existir, mostrar erro específico
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          showModal('error', 'Função de busca não encontrada. Execute o script SQL para criar as funções necessárias.');
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
      
      // Calcular estatísticas
      const total = participantsList.length;
      const checkedIn = participantsList.filter(p => p.is_checked_in).length;
      
      setTotalParticipants(total);
      setCheckedInCount(checkedIn);
      
      console.log('📊 Estatísticas atualizadas:', {
        total: total,
        checkedIn: checkedIn,
        pending: total - checkedIn
      });

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
    if (!user || !currentEvent) return;

    try {
      setIsScanning(true);
      console.log('🔍 Escaneando QR Code:', qrData);
      
      const { data, error } = await supabase.rpc('checkin_by_qr_code', {
        p_qr_code: qrData.trim(),
        p_event_id: currentEvent.id,
        p_organizer_id: user.id
      });

      if (error) {
        console.error('Erro na função RPC:', error);
        throw error;
      }

      console.log('📊 Resultado da busca:', data);

      if (!data || data.length === 0) {
        showModal('error', 'Nenhum resultado retornado do banco de dados', {
          qr_code: qrData,
          event_id: currentEvent.id
        });
        return;
      }

      const result = data[0];
      
      if (result.success) {
        showModal('success', result.message, result.participant_info);
        await fetchParticipants(searchQuery);
      } else {
        if (result.message.includes('já foi realizado') || result.message.includes('anteriormente')) {
          showModal('already_checked', result.message, result.participant_info);
        } else {
          showModal('error', result.message, result.participant_info);
        }
      }
      
    } catch (error: any) {
      console.error('Erro ao processar QR code:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao processar QR code';
      showModal('error', errorMessage, {
        qr_code: qrData,
        error_details: error?.details || 'Nenhum detalhe disponível'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const startQRScanner = async () => {
    if (!videoRef.current) return;

    try {
      setScannerActive(true);
      
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        result => {
          handleQRCodeScan(result.data);
          stopQRScanner();
        },
        {
          onDecodeError: (error) => {
            console.log('QR decode error:', error);
          },
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error);
      showModal('error', 'Erro ao acessar a câmera. Verifique as permissões.');
      setScannerActive(false);
    }
  };

  const stopQRScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScannerActive(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Banner de Atualização */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-lg mb-6 text-center">
            <h2 className="text-2xl font-bold">🚀 PÁGINA ATUALIZADA COM SUCESSO!</h2>
            <p className="mt-2">Interface moderna implementada - Teste os botões abaixo</p>
          </div>
          
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Check-in de Participantes - ATUALIZADO</h1>
                <p className="text-gray-600">✨ Interface moderna - Gerencie o check-in dos participantes do evento</p>
              </div>
              
              {/* Controles */}
              <div className="flex items-center space-x-4">
                {/* Botão de som */}
                <button
                  onClick={toggleSound}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    soundEnabled 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </button>
                
                {/* Status do sistema */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg px-4 py-2 border border-green-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">Sistema Ativo</span>
                  </div>
                </div>
                
                {/* Botões de teste */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => showModal('success', 'Teste de modal de sucesso!', {
                      participant_name: 'João Silva',
                      participant_email: 'joao@email.com',
                      participant_document: '123.456.789-00',
                      ticket_type: 'VIP',
                      event_title: 'Evento de Teste',
                      checkin_date: new Date().toISOString()
                    })}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Teste Sucesso
                  </button>
                  <button
                    onClick={() => showModal('already_checked', 'Teste de check-in já realizado!', {
                      participant_name: 'Maria Santos',
                      participant_email: 'maria@email.com',
                      ticket_type: 'Padrão',
                      event_title: 'Evento de Teste',
                      checkin_date: new Date().toISOString()
                    })}
                    className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                  >
                    Teste Aviso
                  </button>
                  <button
                    onClick={() => showModal('error', 'Teste de erro no check-in!')}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Teste Erro
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Evento Atual</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-medium">{new Date(currentEvent.start_date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Local</p>
                  <p className="font-medium">{currentEvent.location}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Check-ins</p>
                  <p className="font-medium">{checkedInCount} de {totalParticipants}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Evento</p>
                  <p className="font-medium">{currentEvent.title}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Scanner */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-pink-500">
              <div className="flex items-center space-x-2 mb-4">
                <QrCode className="h-6 w-6 text-pink-600" />
                <h2 className="text-xl font-bold text-gray-900">Scanner QR Code</h2>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-6 text-center mb-4 border border-pink-200">
                {scannerActive ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <video 
                        ref={videoRef}
                        className="w-full max-w-sm mx-auto rounded-lg shadow-lg border-2 border-pink-300"
                        style={{ maxHeight: '300px' }}
                      />
                      <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>AO VIVO</span>
                      </div>
                    </div>
                    <button
                      onClick={stopQRScanner}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center space-x-2 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <CameraOff className="h-5 w-5" />
                      <span>Parar Scanner</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <QrCode className="h-20 w-20 text-pink-400 mx-auto animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-2 border-pink-300 rounded-lg animate-ping opacity-30"></div>
                      </div>
                    </div>
                    <p className="text-gray-700 font-medium">
                      {isScanning ? 'Processando QR Code...' : 'Clique para ativar a câmera e escanear QR codes'}
                    </p>
                    <button
                      onClick={startQRScanner}
                      disabled={isScanning}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-3 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                    >
                      <Camera className="h-6 w-6" />
                      <span className="font-semibold">
                        {isScanning ? 'Processando...' : 'Ativar Scanner QR'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Instruções */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Como usar:</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Clique em "Ativar Scanner QR"</li>
                      <li>• Aponte a câmera para o QR Code</li>
                      <li>• O check-in será feito automaticamente</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Search */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Busca Manual</h2>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail, documento ou ID"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Search Results */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                      <p className="text-sm text-gray-500 mt-3">Buscando participantes...</p>
                    </div>
                  ) : participants.length > 0 ? (
                    participants.map((participant) => (
                      <div key={participant.ticket_user_id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all duration-200 bg-gradient-to-r from-white to-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <User className="h-5 w-5 text-gray-400" />
                              <p className="font-semibold text-gray-900 text-lg">{participant.name}</p>
                            </div>
                            <div className="space-y-1 ml-7">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <p className="text-sm text-gray-600">{participant.email}</p>
                              </div>
                              {participant.document && (
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <p className="text-sm text-gray-600">Doc: {participant.document}</p>
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