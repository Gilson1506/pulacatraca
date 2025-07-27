import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Search, Calendar, MapPin, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CheckInRecord {
  id: string;
  ticketId: string;
  ticketNumber: string;
  eventName: string;
  customerName: string;
  ticketType: string;
  checkInTime: string;
  status: 'checked_in' | 'duplicate' | 'invalid';
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  total_tickets: number;
  checked_in_count: number;
}

interface SupabaseTicket {
  id: string;
  ticket_number: string;
  ticket_type: string;
  event: { title: string };
  customer: { name: string };
  used: boolean;
}

interface SupabaseCheckIn {
  id: string;
  ticket: {
    id: string;
    ticket_number: string;
    ticket_type: string;
    event: { title: string };
    customer: { name: string };
  };
  created_at: string;
  status: 'checked_in' | 'duplicate' | 'invalid';
}

const CheckInPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchCurrentEvent();
    fetchCheckInRecords();
  }, []);

  const fetchCurrentEvent = async () => {
    try {
      // Buscar o evento atual (você pode ajustar a lógica conforme necessário)
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          location,
          total_tickets,
          checked_in_count
        `)
        .eq('status', 'active')
        .order('date', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      setCurrentEvent(events);
    } catch (error) {
      console.error('Erro ao buscar evento atual:', error);
    }
  };

  const fetchCheckInRecords = async () => {
    try {
      setIsLoading(true);
      const { data: records, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          ticket:tickets(
            id,
            ticket_number,
            ticket_type,
            event:events(title),
            customer:profiles(name)
          ),
          created_at,
          status
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear os registros para o formato necessário
      const formattedRecords: CheckInRecord[] = (records as unknown as SupabaseCheckIn[])?.map(record => ({
        id: record.id,
        ticketId: record.ticket.id,
        ticketNumber: record.ticket.ticket_number,
        eventName: record.ticket.event.title,
        customerName: record.ticket.customer.name,
        ticketType: record.ticket.ticket_type,
        checkInTime: record.created_at,
        status: record.status
      })) || [];

      setCheckInRecords(formattedRecords);
    } catch (error) {
      console.error('Erro ao buscar registros de check-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRCodeScan = async (qrData: string) => {
    try {
      setIsScanning(true);

      // Verificar se o ticket existe e é válido
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          ticket_type,
          event:events(title),
          customer:profiles(name),
          used
        `)
        .eq('id', qrData)
        .single();

      if (ticketError) throw ticketError;

      const typedTicket = ticket as unknown as SupabaseTicket;

      // Verificar se o ticket já foi usado
      if (typedTicket.used) {
        // Registrar tentativa duplicada
        const { data: checkIn, error: checkInError } = await supabase
          .from('check_ins')
          .insert({
            ticket_id: typedTicket.id,
            status: 'duplicate',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (checkInError) throw checkInError;

        const newRecord: CheckInRecord = {
          id: checkIn.id,
          ticketId: typedTicket.id,
          ticketNumber: typedTicket.ticket_number,
          eventName: typedTicket.event.title,
          customerName: typedTicket.customer.name,
          ticketType: typedTicket.ticket_type,
          checkInTime: checkIn.created_at,
          status: 'duplicate'
        };

        setCheckInRecords(prev => [newRecord, ...prev]);
      } else {
        // Realizar check-in
        const { data: checkIn, error: checkInError } = await supabase
          .from('check_ins')
          .insert({
            ticket_id: typedTicket.id,
            status: 'checked_in',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (checkInError) throw checkInError;

        // Marcar ticket como usado
        await supabase
          .from('tickets')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('id', typedTicket.id);

        // Atualizar contador de check-ins do evento
        if (currentEvent) {
          await supabase
            .from('events')
            .update({ checked_in_count: (currentEvent.checked_in_count || 0) + 1 })
            .eq('id', currentEvent.id);

          setCurrentEvent(prev => prev ? {
            ...prev,
            checked_in_count: (prev.checked_in_count || 0) + 1
          } : null);
        }

        const newRecord: CheckInRecord = {
          id: checkIn.id,
          ticketId: typedTicket.id,
          ticketNumber: typedTicket.ticket_number,
          eventName: typedTicket.event.title,
          customerName: typedTicket.customer.name,
          ticketType: typedTicket.ticket_type,
          checkInTime: checkIn.created_at,
          status: 'checked_in'
        };

        setCheckInRecords(prev => [newRecord, ...prev]);
      }
    } catch (error) {
      console.error('Erro ao processar check-in:', error);
      // Registrar tentativa inválida
      const { data: checkIn } = await supabase
        .from('check_ins')
        .insert({
          ticket_id: qrData,
          status: 'invalid',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      const newRecord: CheckInRecord = {
        id: checkIn.id,
        ticketId: qrData,
        ticketNumber: 'N/A',
        eventName: currentEvent?.title || 'N/A',
        customerName: 'N/A',
        ticketType: 'N/A',
        checkInTime: checkIn.created_at,
        status: 'invalid'
      };

      setCheckInRecords(prev => [newRecord, ...prev]);
    } finally {
      setIsScanning(false);
    }
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
    record.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando registros de check-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Check-in de Eventos</h1>
            <p className="text-gray-600">Gerencie o check-in dos participantes do evento</p>
          </div>

          {/* Event Info */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Evento Atual</h2>
            {currentEvent ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Data</p>
                    <p className="font-medium">{new Date(currentEvent.date).toLocaleDateString('pt-BR')}</p>
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
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Check-ins</p>
                    <p className="font-medium">{currentEvent.checked_in_count || 0} de {currentEvent.total_tickets}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Nenhum evento ativo encontrado</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Scanner */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Scanner QR Code</h2>
              
              <div className="bg-gray-100 rounded-lg p-8 text-center mb-4">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  {isScanning ? 'Processando...' : 'Posicione o QR code do ingresso na câmera'}
                </p>
                <button
                  onClick={() => handleQRCodeScan('QR-TEST-' + Date.now())}
                  disabled={isScanning}
                  className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                >
                  {isScanning ? 'Escaneando...' : 'Simular Scan'}
                </button>
              </div>

              {/* Manual Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ou digite o número ou código do ingresso
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Número ou código do ingresso"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleQRCodeScan((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Número ou código do ingresso"]') as HTMLInputElement;
                      if (input && input.value) {
                        handleQRCodeScan(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    Verificar
                  </button>
                </div>
              </div>
            </div>

            {/* Check-in Records */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Registros de Check-in</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, código ou nº do ingresso"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

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
                        <p>Nº do Ingresso: {record.ticketNumber}</p>
                        <p>Código: {record.ticketId}</p>
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
                    <p className="text-sm text-blue-600">Total</p>
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