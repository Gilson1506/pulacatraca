import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MapPin, UserPlus, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTicketWithUser, createTicketUser, supabase } from '../lib/supabase';
import TicketUserForm from '../components/TicketUserForm';
import TicketPDF from '../components/TicketPDF';
import SystemNotConfigured from '../components/SystemNotConfigured';
import SuccessModal from '../components/SuccessModal';
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
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    userName: '',
    userEmail: '',
    userDocument: ''
  });

  useEffect(() => {
    if (ticketId && currentUser) {
      fetchTicketData();
    }
  }, [ticketId, currentUser]);

  const fetchTicketData = async () => {
    try {
      setIsLoading(true);
      console.log('🎫 Buscando dados do ingresso:', ticketId);

      // Buscar dados do ingresso com relacionamentos
      const ticketData = await getTicketWithUser(ticketId);
      
      // Buscar dados reais do evento diretamente da tabela events
      console.log('🎫 Buscando dados reais do evento...');
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          location,
          banner_url,
          category,
          price,
          status,
          organizer_id,
          available_tickets,
          total_tickets,
          tags
        `)
        .eq('id', ticketData.event_id)
        .single();

      if (!eventError && eventData) {
        console.log('✅ Dados reais do evento encontrados:', eventData);
        
        // Combinar dados do ticket com dados reais do evento
        const enrichedTicket = {
          ...ticketData,
          price: ticketData.price || eventData.price, // Usar preço do ticket ou do evento
          event: {
            id: eventData.id,
            name: eventData.title, // ✅ NOME REAL DO EVENTO
            title: eventData.title,
            description: eventData.description,
            date: eventData.start_date?.split('T')[0] || '',
            time: eventData.start_date?.split('T')[1]?.slice(0, 5) || '',
            location: eventData.location,
            banner_url: eventData.banner_url,
            category: eventData.category,
            price: eventData.price,
            status: eventData.status,
            start_date: eventData.start_date,
            end_date: eventData.end_date
          }
        };
        
        setTicket(enrichedTicket);
      } else {
        console.log('⚠️ Evento não encontrado, usando dados básicos do ticket');
        setTicket(ticketData);
      }

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
        
        // Usar os dados que foram enviados para criar o usuário (são os dados corretos)
        const finalUserName = userData?.name?.trim() || 'Usuário';
        const finalUserEmail = userData?.email?.trim() || '';
        const finalUserDocument = userData?.document?.trim() || '';
        
        console.log('🔍 Debug Modal - userData completo:', JSON.stringify(userData, null, 2));
        console.log('🔍 Debug Modal - finalUserName:', finalUserName);
        console.log('🔍 Debug Modal - finalUserEmail:', finalUserEmail);
        console.log('🔍 Debug Modal - finalUserDocument:', finalUserDocument);
        
        // Mostrar modal de sucesso com os dados corretos
        setSuccessModal({
          isOpen: true,
          userName: finalUserName,
          userEmail: finalUserEmail,
          userDocument: finalUserDocument
        });
        
        console.log('🔍 Debug Modal - successModal definido como:', {
          isOpen: true,
          userName: finalUserName,
          userEmail: finalUserEmail,
          userDocument: finalUserDocument
        });
        
        // Recarregar dados para garantir sincronização visual
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
        {/* Logo do App */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="Logo"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-semibold">
          <ArrowLeft size={20} />
          VOLTAR AO DASHBOARD
        </button>

        <header className="bg-white p-3 rounded-t-lg border-b">
          <div className="flex items-center gap-3">
            <img 
              src={ticket.event?.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMzIiIGZpbGw9IiNGMzY4QTciLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTYgMEgwdjE2aDE2VjB6Ii8+CjxwYXRoIGQ9Ik0xNiAxNkgwdjE2aDE2VjE2eiIvPgo8cGF0aCBkPSJNMTYgMzJIMHYxNmgxNlYzMnoiLz4KPC9zdmc+Cjwvc3ZnPgo='} 
              alt={ticket.event?.name || 'Evento'} 
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-800">{ticket.event?.name || 'Evento'}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {ticket.event?.location || 'Local não informado'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="bg-white p-4 rounded-b-lg shadow-md">
          <div ref={ticketRef} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-700 text-white p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold">{ticket.event?.name || 'EVENTO'}</h1>
                  <p className="text-pink-100 text-sm">{ticket.event?.location || 'Local do evento'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">R$ {(ticket.price || 0).toFixed(2)}</p>
                  <p className="text-pink-100 text-xs">{ticket.name || ticket.ticket_type || 'INGRESSO GERAL'}</p>
                </div>
              </div>
            </div>

            {/* Corpo do ingresso */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Detalhes do Evento */}
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">DETALHES DO EVENTO</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Data:</span>
                        <span className="font-semibold text-sm">{formattedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Horário:</span>
                        <span className="font-semibold text-sm">{formattedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Dia:</span>
                        <span className="font-semibold text-sm">{formattedDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Valor Pago:</span>
                        <span className="font-bold text-green-600 text-sm">R$ {(ticket.price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Utilizador */}
                  {ticketUser && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <h3 className="text-sm font-semibold text-green-700 mb-2">UTILIZADOR DO INGRESSO</h3>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">{ticketUser.name}</p>
                        <p className="text-gray-600 text-sm">{ticketUser.email}</p>
                        {ticketUser.document && (
                          <p className="text-gray-500 text-xs">{ticketUser.document}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* QR Code e Código do Ingresso */}
                <div className="space-y-3">
                  {!ticketUser && (
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <h3 className="text-sm font-semibold text-orange-700 mb-3 text-center">DEFINIR UTILIZADOR</h3>
                      <p className="text-orange-700 text-xs text-center mb-3">
                        É necessário definir quem irá usar este ingresso
                      </p>
                      <button
                        onClick={() => setShowUserModal(true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                      >
                        Definir Utilizador
                      </button>
                    </div>
                  )}

                  {ticketUser && (ticket.status === 'valid' || ticket.status === 'pending' || ticket.status === 'active') ? (
                    <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                      <h3 className="text-sm font-semibold text-pink-700 mb-3 text-center">QR CODE DE ENTRADA</h3>
                      
                      <div className="bg-white rounded-lg p-3 border border-pink-100">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket.qr_code || ticket.id}`} 
                          alt="QR Code" 
                          className="w-48 h-48 mx-auto object-contain"
                        />
                      </div>
                      
                      <div className="mt-3 text-center">
                        <p className="text-pink-700 text-xs font-medium mb-1">
                          Código: {ticket.qr_code || ticket.id}
                        </p>
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                          <span className="text-pink-600 text-xs font-semibold">VÁLIDO</span>
                        </div>
                      </div>
                    </div>
                  ) : ticketUser ? (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 text-center">QR CODE INDISPONÍVEL</h3>
                      
                      <div className="bg-white rounded-lg p-3 border border-gray-100 relative">
                        <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-gray-400 text-6xl">🔒</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-center">
                        <p className="text-gray-600 text-xs">
                          Status do ingresso não permite QR Code
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Botões e Status - Fora do grid */}
              <div className="mt-4 space-y-3">
                {!ticketUser && (ticket.status === 'valid' || ticket.status === 'pending' || ticket.status === 'active') && (
                  <button 
                    onClick={() => setUserModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg w-full transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus size={20} />
                    DEFINIR UTILIZADOR
                  </button>
                )}

                {ticketUser && (
                  <button 
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg w-full transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        📄 BAIXAR PDF
                      </>
                    )}
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
                {(ticket.status === 'pending' || ticket.status === 'active') ? 
                  (ticketUser ? 
                    '✅ Ingresso válido. Utilizador já definido.' :
                    '👤 Defina o utilizador deste ingresso para poder utilizá-lo no evento.') :
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

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, userName: '', userEmail: '', userDocument: '' })}
        title="✅ Usuário Definido com Sucesso!"
        message="Os dados do utilizador foram salvos com sucesso. Seu ingresso está pronto para uso!"
        userName={successModal.userName}
        userEmail={successModal.userEmail}
        userDocument={successModal.userDocument}
      />
    </div>
  );
};

export default TicketPage; 