import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Calendar, MapPin, User, Loader2, Camera, CameraOff, Users, CheckCircle, Volume2, VolumeX } from 'lucide-react';
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
      return;
    }
    
    try {
      console.log('🔍 Buscando evento atual para organizador:', user.id);
      
      // Buscar eventos do organizador atual
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, start_date, location, organizer_id')
        .eq('organizer_id', user.id)
        .eq('status', 'approved')
        .order('start_date', { ascending: true })
        .limit(1);

      if (error) {
        console.error('❌ Erro ao buscar evento:', error);
        return;
      }

      console.log('📅 Eventos encontrados:', events);
      
      if (events && events.length > 0) {
        console.log('✅ Evento selecionado:', events[0]);
        setCurrentEvent(events[0]);
      } else {
        console.log('⚠️ Nenhum evento aprovado encontrado para o organizador');
        showModal('error', 'Nenhum evento aprovado encontrado. Verifique se você tem eventos aprovados.');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar evento atual:', error);
      showModal('error', `Erro ao buscar evento: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const fetchParticipants = async (searchTerm?: string) => {
    if (!user || !currentEvent) {
      console.log('❌ fetchParticipants: Usuário ou evento não encontrado', { user: !!user, currentEvent: !!currentEvent });
      return;
    }
    
    try {
      setIsSearching(true);
      console.log('🔍 Buscando participantes...', {
        event_id: currentEvent.id,
        organizer_id: user.id,
        search_term: searchTerm
      });
      
      const { data, error } = await supabase.rpc('search_event_participants', {
        p_event_id: currentEvent.id,
        p_organizer_id: user.id,
        p_search_term: searchTerm || null
      });

      if (error) {
        console.error('❌ Erro na função RPC search_event_participants:', error);
        throw error;
      }

      console.log('✅ Dados recebidos da função RPC:', data);
      const participantsList = data as ParticipantSearchResult[];
      setParticipants(participantsList);
      
      // Calcular estatísticas
      setTotalParticipants(participantsList.length);
      setCheckedInCount(participantsList.filter(p => p.already_checked_in).length);
      
      console.log('📊 Estatísticas atualizadas:', {
        total: participantsList.length,
        checkedIn: participantsList.filter(p => p.already_checked_in).length
      });

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
        throw error;
      }

      console.log('✅ Resultado do check-in:', data);
      const result = data[0] as CheckInResult;
      
      if (result.success) {
        console.log('🎉 Check-in realizado com sucesso!');
        showModal('success', result.message, result.participant_info);
        // Recarregar participantes
        await fetchParticipants(searchQuery);
      } else {
        console.log('⚠️ Check-in não realizado:', result.message);
        // Verificar se é duplicata
        if (result.message.includes('já foi realizado')) {
          showModal('already_checked', result.message, result.participant_info);
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
      
      const { data, error } = await supabase.rpc('checkin_by_qr_code', {
        p_qr_code: qrData,
        p_event_id: currentEvent.id,
        p_organizer_id: user.id
      });

      if (error) throw error;

      const result = data[0] as CheckInResult;
      
      if (result.success) {
        showModal('success', result.message, result.participant_info);
        await fetchParticipants(searchQuery);
      } else {
        if (result.message.includes('já foi realizado')) {
          showModal('already_checked', result.message, result.participant_info);
        } else {
          showModal('error', result.message);
        }
      }
      
    } catch (error) {
      console.error('Erro ao processar QR code:', error);
      showModal('error', 'Erro ao processar QR code');
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Check-in de Participantes</h1>
                <p className="text-gray-600">Gerencie o check-in dos participantes do evento</p>
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Scanner QR Code</h2>
              
              <div className="bg-gray-100 rounded-lg p-6 text-center mb-4">
                {scannerActive ? (
                  <div className="space-y-4">
                    <video 
                      ref={videoRef}
                      className="w-full max-w-sm mx-auto rounded-lg"
                      style={{ maxHeight: '300px' }}
                    />
                    <button
                      onClick={stopQRScanner}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <CameraOff className="h-5 w-5" />
                      <span>Parar Scanner</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto" />
                    <p className="text-gray-600">
                      {isScanning ? 'Processando...' : 'Clique para ativar a câmera e escanear QR codes'}
                    </p>
                    <button
                      onClick={startQRScanner}
                      disabled={isScanning}
                      className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center space-x-2 mx-auto"
                    >
                      <Camera className="h-5 w-5" />
                      <span>{isScanning ? 'Processando...' : 'Ativar Scanner'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Search */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Busca Manual</h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail, documento ou ID"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                {/* Search Results */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Buscando participantes...</p>
                    </div>
                  ) : participants.length > 0 ? (
                    participants.map((participant) => (
                      <div key={participant.ticket_user_id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{participant.name}</p>
                            <p className="text-sm text-gray-500">{participant.email}</p>
                            {participant.document && (
                              <p className="text-sm text-gray-500">Doc: {participant.document}</p>
                            )}
                            <p className="text-sm text-gray-500">Tipo: {participant.ticket_type}</p>
                          </div>
                          <div className="text-right">
                            {participant.already_checked_in ? (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <div>
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full block">
                                    ✓ Check-in realizado
                                  </span>
                                  {participant.checkin_date && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(participant.checkin_date).toLocaleString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => performCheckIn(participant.ticket_user_id)}
                                disabled={isScanning}
                                className="bg-pink-600 text-white px-3 py-2 rounded text-sm hover:bg-pink-700 transition-colors disabled:opacity-50"
                              >
                                {isScanning ? 'Processando...' : 'Fazer Check-in'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : searchQuery ? (
                    <p className="text-center text-gray-500 py-4">Nenhum participante encontrado</p>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Digite para buscar participantes</p>
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