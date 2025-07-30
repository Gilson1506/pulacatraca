import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MapPin, UserPlus, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTicketWithUser, createTicketUser } from '../lib/supabase';
import TicketUserForm from '../components/TicketUserForm';
import TicketPDF from '../components/TicketPDF';
import SystemNotConfigured from '../components/SystemNotConfigured';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const TicketPage = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const { user: currentUser } = useAuth();
  const ticketRef = useRef(null);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [ticketUser, setTicketUser] = useState(null);
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [systemNotConfigured, setSystemNotConfigured] = useState(false);

  useEffect(() => {
    if (ticketId && currentUser) {
      fetchTicketData();
    }
  }, [ticketId, currentUser]);

  const fetchTicketData = async () => {
    try {
      setIsLoading(true);
      console.log('🎫 Buscando dados do ingresso:', ticketId);

      const ticketData = await getTicketWithUser(ticketId);
      setTicket(ticketData);

      // Se há um ticket_user_id definido, buscar dados do usuário
      if (ticketData.ticket_user_id && ticketData.ticket_user) {
        setTicketUser(ticketData.ticket_user);
      }

    } catch (error) {
      console.error('❌ Erro ao buscar ingresso:', error);
      
      if (error.message?.includes('Could not find a relationship') || 
          error.message?.includes('ticket_users')) {
        setSystemNotConfigured(true);
      } else {
        alert('Ingresso não encontrado ou você não tem permissão para visualizá-lo.');
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetUser = async (userData) => {
    try {
      console.log('👤 Definindo usuário do ingresso com dados:', userData);

      const updatedTicket = await createTicketUser(ticketId, userData);
      console.log('✅ Resposta do createTicketUser:', updatedTicket);
      
      if (updatedTicket) {
        // Atualizar o estado do ticket
        setTicket(updatedTicket);
        
        // Se há ticket_user, definir no estado
        if (updatedTicket.ticket_user) {
          setTicketUser(updatedTicket.ticket_user);
          console.log('✅ Usuário definido:', updatedTicket.ticket_user);
        }
        
        // Fechar o modal
        setUserModalOpen(false);
        
        // Mostrar sucesso
        const userName = updatedTicket.ticket_user?.name || 'Usuário';
        const userEmail = updatedTicket.ticket_user?.email || '';
        alert(`✅ Usuário definido com sucesso!\nNome: ${userName}\nEmail: ${userEmail}`);
        
        // Recarregar dados para garantir sincronização
        await fetchTicketData();
      } else {
        console.error('❌ Resposta inválida do createTicketUser');
        alert('Erro ao processar resposta. Recarregue a página.');
      }

    } catch (error) {
      console.error('❌ Erro ao definir usuário:', error);
      alert('Erro ao definir usuário do ingresso. Tente novamente.');
    }
  };

  const handleDownloadPdf = () => {
    if (!ticketRef.current || isDownloading) return;

    setIsDownloading(true);

    html2canvas(ticketRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasAspectRatio = canvas.width / canvas.height;
      
      const margin = 10;
      let imgWidth = pdfWidth - (margin * 2);
      let imgHeight = imgWidth / canvasAspectRatio;

      if (imgHeight > pdfHeight - (margin * 2)) {
        imgHeight = pdfHeight - (margin * 2);
        imgWidth = imgHeight * canvasAspectRatio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`ingresso-${ticket.id}.pdf`);
      setIsDownloading(false);
    }).catch(err => {
      console.error("Erro ao gerar PDF:", err);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
      setIsDownloading(false);
    });
  };

  if (systemNotConfigured) {
    return <SystemNotConfigured />;
  }

  // Verificação de autenticação
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Você precisa estar logado para ver este ingresso.</p>
          <button 
            onClick={() => navigate('/auth')} 
            className="bg-pink-600 text-white px-6 py-2 rounded-lg"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  // Estado de loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          <span className="text-gray-600 text-lg">Carregando ingresso...</span>
        </div>
      </div>
    );
  }

  // Ingresso não encontrado ou dados incompletos
  if (!ticket || !ticket.event) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            {!ticket ? 'Ingresso não encontrado.' : 'Dados do evento não encontrados.'}
          </p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-pink-600 text-white px-6 py-2 rounded-lg"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const formattedDay = ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase() : '';
  const formattedTime = ticket.event?.time || '';

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-semibold">
          <ArrowLeft size={20} />
          VOLTAR AO DASHBOARD
        </button>

        <header className="flex justify-between items-center bg-white p-4 rounded-t-lg border-b">
          <div className="flex items-center gap-4">
            <img 
              src={ticket.event?.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMzIiIGZpbGw9IiNGMzY4QTciLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTYgMEgwdjE2aDE2VjB6Ii8+CjxwYXRoIGQ9Ik0xNiAxNkgwdjE2aDE2VjE2eiIvPgo8cGF0aCBkPSJNMTYgMzJIMHYxNmgxNlYzMnoiLz4KPC9zdmc+Cjwvc3ZnPgo='} 
              alt={ticket.event?.name || 'Evento'} 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h1 className="text-xl font-bold text-pink-600">{ticket.event?.name || 'Evento'}</h1>
              <p className="text-gray-600">{ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} {formattedTime}</p>
              <button 
                onClick={() => navigate(`/event/${ticket.event_id}`)}
                className="text-blue-600 text-sm font-semibold hover:underline"
              >
                Ver evento
              </button>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-blue-600 flex items-center gap-2">
              <MapPin size={16} /> {ticket.event?.location || 'Local não informado'}
            </p>
            <p className="text-gray-500">Status: {ticket.status === 'valid' ? 'Confirmado' : ticket.status === 'used' ? 'Utilizado' : 'Pendente'}</p>
          </div>
        </header>

        <main className="bg-white p-6 rounded-b-lg shadow-md">
          <div ref={ticketRef} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">
                {ticketUser ? `UTILIZADOR: ${ticketUser.name?.toUpperCase() || 'USUÁRIO'}` : 'PREENCHER UTILIZADOR'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                ticket.status === 'valid' ? 'bg-green-100 text-green-600' :
                ticket.status === 'used' ? 'bg-blue-100 text-blue-600' :
                ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {ticket.status === 'valid' ? 'CONFIRMADO' : 
                 ticket.status === 'used' ? 'UTILIZADO' : 
                 ticket.status === 'pending' ? 'AGUARDANDO CONFIRMAÇÃO' : 
                 'CANCELADO'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Ticket Details */}
              <div className="md:col-span-2">
                <p className="text-gray-500 text-sm">Ingresso</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  <span className="text-pink-600">{formattedDate}</span> | {formattedDay} {formattedTime}
                </h2>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{ticket.event?.name?.toUpperCase() || 'EVENTO'}</h3>
                <div className="mt-4 space-y-3 text-gray-700">
                  <p><span className="font-semibold text-blue-600">INGRESSO GERAL</span></p>
                  <p className="text-sm">{ticket.event?.description || 'Evento imperdível!'}</p>
                  <p className="text-xs text-gray-500">Código: {ticket.qr_code || ticket.id}</p>
                  <p className="text-xs text-pink-500">Valor: €{(ticket.price || 0).toFixed(2)}</p>
                  <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">16+</span>
                </div>
              </div>

              {/* Right Column: User and QR Code */}
              <div className="text-center flex flex-col items-center justify-between">
                <div>
                  <p className="font-semibold">Utilizador</p>
                  <p className="text-gray-500 text-sm">{ticketUser ? ticketUser.name || 'Usuário' : 'Utilizador não definido'}</p>
                  {ticketUser && (
                    <p className="text-gray-400 text-xs">{ticketUser.email || ''}</p>
                  )}
                </div>

                <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-lg mt-4 relative">
                  {ticketUser && ticket.status === 'valid' ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${ticket.qr_code || ticket.id}`} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                      <div className="w-24 h-24 bg-gray-300 animate-pulse rounded-md blur-md"></div>
                      <p className="text-xs font-semibold text-gray-600 mt-2 absolute">
                        {ticket.status !== 'valid' ? 'AGUARDANDO CONFIRMAÇÃO' : 'DEFINA O UTILIZADOR PARA VER O QR CODE'}
                      </p>
                    </div>
                  )}
                </div>

                {(ticket.status === 'valid' || ticket.status === 'pending') && (
                  <button 
                    onClick={() => setUserModalOpen(true)}
                    disabled={!!ticketUser || ticket.status === 'used'}
                    className="mt-4 bg-pink-600 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-pink-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="inline-block mr-2" size={16} />
                    {ticketUser ? 'UTILIZADOR DEFINIDO' : 'DEFINIR UTILIZADOR'}
                  </button>
                )}

                {ticket.status === 'pending' && (
                  <div className="mt-4 bg-yellow-100 border border-yellow-300 text-yellow-700 px-4 py-2 rounded-lg w-full text-xs">
                    ⏳ Aguardando confirmação do organizador
                  </div>
                )}

                {ticket.status === 'used' && (
                  <div className="mt-4 bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg w-full text-xs">
                    ✅ Ingresso já utilizado
                  </div>
                )}

                {ticketUser && ticket.status === 'valid' && (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="mt-2 bg-green-500 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-green-600 transition-colors disabled:bg-gray-400"
                  >
                    {isDownloading ? 'BAIXANDO...' : 'BAIXAR PDF'}
                  </button>
                )}
              </div>
            </div>
            
            <div className={`mt-6 border px-4 py-3 rounded-lg text-center ${
              ticket.status === 'pending' ? 'bg-yellow-100 border-yellow-200 text-yellow-700' :
              ticket.status === 'used' ? 'bg-blue-100 border-blue-200 text-blue-700' :
              ticketUser ? 'bg-green-100 border-green-200 text-green-700' :
              'bg-orange-100 border-orange-200 text-orange-700'
            }`}>
              <p>
                {ticket.status === 'pending' ? 
                  (ticketUser ? 
                    '⏳ Ingresso pendente de confirmação. Utilizador já definido.' :
                    '⏳ Ingresso pendente de confirmação. Você pode definir o utilizador enquanto aguarda.') :
                 ticket.status === 'used' ? 
                  '🎉 Ingresso utilizado com sucesso! Esperamos que tenha curtido o evento!' :
                 ticketUser ? 
                  '✅ Dados do utilizador definidos. Bom evento!' : 
                  '👤 Defina o utilizador deste ingresso para poder utilizá-lo no evento.'}
              </p>
            </div>
          </div>
        </main>
      </div>

      <TicketUserForm 
        ticketId={ticketId}
        onSuccess={handleSetUser}
        onCancel={() => setUserModalOpen(false)}
        isOpen={isUserModalOpen}
      />
    </div>
  );
};

export default TicketPage; 