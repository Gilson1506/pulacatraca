import React, { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle, XCircle, Search, Calendar, MapPin, User, Loader2, Camera, CameraOff, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QrScanner from 'qr-scanner';

interface CheckInRecord {
  id: string;
  ticketId: string;
  ticketCode: string;
  eventName: string;
  customerName: string;
  ticketType: string;
  checkInTime: string;
  status: 'checked_in' | 'duplicate' | 'invalid';
  customerDocument?: string;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string;
  total_tickets: number;
  checked_in_count: number;
}

interface SearchTicket {
  ticket_id: string;
  ticket_code: string;
  ticket_type: string;
  customer_name: string;
  customer_document?: string;
  customer_email: string;
  status: string;
  already_checked_in: boolean;
}

const CheckInPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [searchResults, setSearchResults] = useState<SearchTicket[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentEvent();
      fetchCheckInRecords();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchCurrentEvent = async () => {
    if (!user) return;
    
    try {
      // Buscar eventos do organizador atual
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          location,
          total_tickets
        `)
        .eq('organizer_id', user.id)
        .eq('status', 'approved')
        .order('start_date', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Erro ao buscar evento:', error);
        return;
      }

      // Contar check-ins para este evento
      const { count: checkedInCount } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', events.id)
        .eq('status', 'checked_in');

      setCurrentEvent({
        ...events,
        checked_in_count: checkedInCount || 0
      });
    } catch (error) {
      console.error('Erro ao buscar evento atual:', error);
    }
  };

  const fetchCheckInRecords = async () => {
    if (!user || !currentEvent) return;
    
    try {
      setIsLoading(true);
      const { data: records, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          ticket_id,
          status,
          created_at,
          ticket_code,
          ticket_type,
          customer_name,
          customer_document
        `)
        .eq('event_id', currentEvent.id)
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRecords: CheckInRecord[] = records?.map(record => ({
        id: record.id,
        ticketId: record.ticket_id,
        ticketCode: record.ticket_code || '',
        eventName: currentEvent.title,
        customerName: record.customer_name || '',
        ticketType: record.ticket_type || '',
        checkInTime: record.created_at,
        status: record.status as 'checked_in' | 'duplicate' | 'invalid',
        customerDocument: record.customer_document
      })) || [];

      setCheckInRecords(formattedRecords);
    } catch (error) {
      console.error('Erro ao buscar registros de check-in:', error);
      showMessage('error', 'Erro ao carregar registros de check-in');
    } finally {
      setIsLoading(false);
    }
  };

  const searchTickets = async (searchTerm: string) => {
    if (!user || !currentEvent || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data, error } = await supabase.rpc('search_tickets_for_checkin', {
        p_search_term: searchTerm.trim(),
        p_event_id: currentEvent.id,
        p_organizer_id: user.id
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      showMessage('error', 'Erro ao buscar participantes');
    } finally {
      setIsSearching(false);
    }
  };

  const performCheckIn = async (ticketCode: string) => {
    if (!user || !currentEvent) {
      showMessage('error', 'Erro: usuário ou evento não encontrado');
      return;
    }

    try {
      setIsScanning(true);
      
      const { data, error } = await supabase.rpc('perform_check_in', {
        p_ticket_code: ticketCode,
        p_event_id: currentEvent.id,
        p_organizer_id: user.id
      });

      if (error) throw error;

      const result = data[0];
      
      if (result.success) {
        showMessage('success', result.message);
        // Atualizar contador do evento
        setCurrentEvent(prev => prev ? {
          ...prev,
          checked_in_count: prev.checked_in_count + 1
        } : null);
      } else {
        showMessage('error', result.message);
      }

      // Recarregar registros
      await fetchCheckInRecords();
      
    } catch (error) {
      console.error('Erro ao processar check-in:', error);
      showMessage('error', 'Erro ao processar check-in');
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
          performCheckIn(result.data);
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
      showMessage('error', 'Erro ao acessar a câmera');
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

  const handleManualCheckIn = async (ticketCode: string) => {
    await performCheckIn(ticketCode);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'duplicate':
        return <XCircle className="h-5 w-5 text-yellow-600" />;
      case 'invalid':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'checked_in': return 'Check-in realizado';
      case 'duplicate': return 'Duplicado';
      case 'invalid': return 'Inválido';
      default: return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': return 'bg-green-100 text-green-800';
      case 'duplicate': return 'bg-yellow-100 text-yellow-800';
      case 'invalid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = checkInRecords.filter(record =>
    record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.ticketCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando sistema de check-in...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Check-in de Eventos</h1>
            <p className="text-gray-600">Gerencie o check-in dos participantes do evento</p>
            
            {message && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' :
                message.type === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {message.text}
              </div>
            )}
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
                  <p className="font-medium">{currentEvent.checked_in_count} de {currentEvent.total_tickets}</p>
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
            {/* QR Code Scanner & Manual Search */}
            <div className="space-y-6">
              {/* QR Scanner */}
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
                      placeholder="Buscar por nome, documento ou código"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchTickets(e.target.value);
                      }}
                    />
                  </div>

                  {/* Search Results */}
                  {isSearching ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Buscando...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((ticket) => (
                        <div key={ticket.ticket_id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{ticket.customer_name}</p>
                              <p className="text-sm text-gray-500">{ticket.ticket_type}</p>
                              {ticket.customer_document && (
                                <p className="text-sm text-gray-500">Doc: {ticket.customer_document}</p>
                              )}
                            </div>
                            <div className="text-right">
                              {ticket.already_checked_in ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  ✓ Check-in realizado
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleManualCheckIn(ticket.ticket_code)}
                                  className="bg-pink-600 text-white px-3 py-1 rounded text-sm hover:bg-pink-700 transition-colors"
                                >
                                  Fazer Check-in
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery && (
                    <p className="text-center text-gray-500 py-4">Nenhum participante encontrado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Check-in Records */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Registros Recentes</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhum check-in registrado ainda</p>
                  </div>
                ) : (
                  filteredRecords.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(record.status)}
                          <div>
                            <p className="font-medium text-gray-900">{record.customerName}</p>
                            <p className="text-sm text-gray-500">{record.ticketType}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Código: {record.ticketCode}</p>
                        {record.customerDocument && <p>Doc: {record.customerDocument}</p>}
                        <p>Check-in: {new Date(record.checkInTime).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">Estatísticas</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Check-ins realizados</p>
                    <p className="text-2xl font-bold text-green-900">
                      {checkInRecords.filter(r => r.status === 'checked_in').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Duplicados</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {checkInRecords.filter(r => r.status === 'duplicate').length}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Inválidos</p>
                    <p className="text-2xl font-bold text-red-900">
                      {checkInRecords.filter(r => r.status === 'invalid').length}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Total de tentativas</p>
                    <p className="text-2xl font-bold text-blue-900">{checkInRecords.length}</p>
                  </div>
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;