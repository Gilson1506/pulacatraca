import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MapPin, UserPlus } from 'lucide-react';
import ProfessionalLoader from '../components/ProfessionalLoader';
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
      console.log('👤 Usuário atual:', currentUser?.id);

      // Tentar buscar dados do ingresso com relacionamentos
      let ticketData;
      try {
        ticketData = await getTicketWithUser(ticketId);
        console.log('🎫 Dados do ticket recebidos via getTicketWithUser:', ticketData);
      } catch (error) {
        console.log('⚠️ Erro com getTicketWithUser, tentando busca direta:', error);
        
        // Busca direta se a função restritiva falhar
        const { data: directTicket, error: directError } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
          
        if (directError) {
          throw new Error(`Ingresso não encontrado: ${directError.message}`);
        }
        
        ticketData = directTicket;
        console.log('🎫 Dados do ticket recebidos via busca direta:', ticketData);
      }
      
      // Buscar dados do evento usando a mesma abordagem da EventPage
      console.log('🎫 Buscando dados do evento para ID:', ticketData.event_id);
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          location,
          image,
          subject,
          subcategory,
          category,
          price,
          status,
          organizer_id,
          available_tickets,
          total_tickets,
          tags,
          location_type,
          location_name,
          location_city,
          location_state,
          location_street,
          location_number,
          location_neighborhood,
          location_cep,
          ticket_type,
          created_at,
          updated_at
        `)
        .eq('id', ticketData.event_id)
        .single();

      if (eventError) {
        console.error('❌ Erro ao buscar evento:', eventError);
        console.log('⚠️ Evento não encontrado, usando dados básicos do ticket');
        setTicket(ticketData);
      } else if (eventData) {
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
            banner_url: eventData.image, // ✅ USAR CAMPO 'image' COMO NA EVENTPAGE
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
      
      // Verificar tipo específico de erro
      if (error.message?.includes('Could not find a relationship') || 
          error.message?.includes('ticket_users')) {
        console.log('🔧 Sistema não configurado - redirecionando para configuração');
        setSystemNotConfigured(true);
      } else if (error.message?.includes('Ingresso não encontrado')) {
        console.log('🎫 Ingresso não existe no banco de dados');
        alert('Este ingresso não foi encontrado. Verifique o link e tente novamente.');
        navigate('/profile/tickets');
      } else if (error.message?.includes('não autenticado')) {
        console.log('🔐 Usuário não autenticado');
        alert('Você precisa estar logado para visualizar este ingresso.');
        navigate('/login');
      } else {
        console.log('❓ Erro genérico:', error.message);
        alert(`Erro ao carregar ingresso: ${error.message || 'Erro desconhecido'}`);
        navigate('/profile/tickets');
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
          <ProfessionalLoader size="lg" className="mr-2" />
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
            onClick={() => navigate('/profile/tickets')} 
            className="bg-pink-600 text-white px-6 py-2 rounded-lg"
          >
            Voltar para Meus Ingressos
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const formattedDay = ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase() : '';
  const formattedTime = ticket.event?.time || '';

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Logo do App - Menor */}
        <div className="flex justify-center mb-3">
          <img 
            src="/logo2.png" 
            alt="Logo"
            className="h-10 sm:h-12 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        <button onClick={() => navigate('/profile/tickets')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold text-sm">
          <ArrowLeft size={16} />
          VOLTAR PARA MEUS INGRESSOS
        </button>

        <header className="bg-white p-2 sm:p-3 rounded-t-lg border-b">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={ticket.event?.banner_url || ticket.event?.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMzIiIGZpbGw9IiNGMzY4QTciLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTYgMEgwdjE2aDE2VjB6Ii8+CjxwYXRoIGQ9Ik0xNiAxNkgwdjE2aDE2VjE2eiIvPgo8cGF0aCBkPSJNMTYgMzJIMHYxNmgxNlYzMnoiLz4KPC9zdmc+Cjwvc3ZnPgo='} 
              alt={ticket.event?.name || 'Evento'} 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-gray-800 truncate">{ticket.event?.name || 'Evento'}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <span>{ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                <span className="flex items-center gap-1">
                  <MapPin size={10} className="sm:w-3 sm:h-3" /> 
                  <span className="truncate">{ticket.event?.location || 'Local não informado'}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="bg-white p-2 sm:p-4 rounded-b-lg shadow-md">
          <div ref={ticketRef} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header com gradiente - Compacto */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-700 text-white p-2 sm:p-3">
              {/* Logo centralizada no topo - Menor */}
              <div className="flex justify-center mb-2">
                <img 
                  src="/logo2.png" 
                  alt="Logo PULACATRACA"
                  className="h-8 sm:h-12 w-auto object-contain opacity-90"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-lg font-bold truncate">{ticket.event?.name || 'EVENTO'}</h1>
                  <p className="text-pink-100 text-xs sm:text-sm truncate">{ticket.event?.location || 'Local do evento'}</p>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-sm sm:text-lg font-bold">R$ {(ticket.price || 0).toFixed(2)}</p>
                  <p className="text-pink-100 text-xs truncate max-w-[200px] sm:max-w-none">
                    {ticket.ticket_type_name || ticket.name || ticket.ticket_type || 'INGRESSO GERAL'}
                    {ticket.ticket_area && ticket.ticket_area !== 'Geral' && ` - ${ticket.ticket_area}`}
                  </p>
                  {ticket.gender && ticket.gender !== 'unisex' && (
                    <p className="text-pink-200 text-xs">
                      {ticket.gender === 'masculine' ? 'Masculino' : 'Feminino'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Corpo do ingresso - Compacto */}
            <div className="p-2 sm:p-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Detalhes do Evento */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-2">DETALHES DO EVENTO</h3>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-xs sm:text-sm">Data:</span>
                        <span className="font-semibold text-xs sm:text-sm">{formattedDate}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-xs sm:text-sm">Horário:</span>
                        <span className="font-semibold text-xs sm:text-sm">{formattedTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-xs sm:text-sm">Dia:</span>
                        <span className="font-semibold text-xs sm:text-sm">{formattedDay}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-xs sm:text-sm">Valor Pago:</span>
                        <span className="font-bold text-green-600 text-xs sm:text-sm">R$ {(ticket.price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do Tipo de Ingresso */}
                  <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
                    <h3 className="text-xs sm:text-sm font-semibold text-blue-700 mb-1 sm:mb-2">TIPO DE INGRESSO</h3>
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-xs sm:text-sm">Tipo:</span>
                        <span className="font-semibold text-xs sm:text-sm truncate ml-2">
                          {ticket.ticket_type_name || ticket.name || 'Geral'}
                        </span>
                      </div>
                      {ticket.ticket_area && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Área:</span>
                          <span className="font-semibold text-xs sm:text-sm">{ticket.ticket_area}</span>
                        </div>
                      )}
                      {ticket.ticket_sector && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Setor:</span>
                          <span className="font-semibold text-xs sm:text-sm">{ticket.ticket_sector}</span>
                        </div>
                      )}
                      {ticket.gender && ticket.gender !== 'unisex' && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Gênero:</span>
                          <span className="font-semibold text-xs sm:text-sm">
                            {ticket.gender === 'masculine' ? 'Masculino' : 'Feminino'}
                          </span>
                        </div>
                      )}
                      {ticket.has_half_price && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Desconto:</span>
                          <span className="font-semibold text-xs sm:text-sm text-green-600">Meia-entrada</span>
                        </div>
                      )}
                      {ticket.batch_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Lote:</span>
                          <span className="font-semibold text-xs sm:text-sm">{ticket.batch_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dados do Utilizador */}
                  {ticketUser && (
                    <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-200">
                      <h3 className="text-xs sm:text-sm font-semibold text-green-700 mb-1 sm:mb-2">UTILIZADOR DO INGRESSO</h3>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm truncate">{ticketUser.name}</p>
                        <p className="text-gray-600 text-xs truncate">{ticketUser.email}</p>
                        {ticketUser.document && (
                          <p className="text-gray-500 text-xs">{ticketUser.document}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* QR Code e Código do Ingresso - Compacto */}
                <div className="space-y-2 sm:space-y-3">
                  {!ticketUser && (
                    <div className="bg-orange-50 rounded-lg p-2 sm:p-3 border border-orange-200">
                      <h3 className="text-xs sm:text-sm font-semibold text-orange-700 mb-2 text-center">DEFINIR UTILIZADOR</h3>
                      <p className="text-orange-700 text-xs text-center mb-2">
                        É necessário definir quem irá usar este ingresso
                      </p>
                      <button
                        onClick={() => setUserModalOpen(true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors"
                      >
                        Definir Utilizador
                      </button>
                    </div>
                  )}

                  {ticketUser && (ticket.status === 'valid' || ticket.status === 'pending' || ticket.status === 'active') ? (
                    <div className="bg-pink-50 rounded-lg p-2 sm:p-3 border border-pink-200">
                      <h3 className="text-xs sm:text-sm font-semibold text-pink-700 mb-2 text-center">QR CODE DE ENTRADA</h3>
                      
                      <div className="bg-white rounded-lg p-2 border border-pink-100">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.qr_code || ticket.id}`} 
                          alt="QR Code" 
                          className="w-24 h-24 sm:w-32 sm:h-32 mx-auto object-contain"
                        />
                      </div>
                      
                      <div className="mt-2 text-center">
                        <p className="text-pink-700 text-xs font-medium mb-1 truncate">
                          Código: <span className="font-mono text-xs">{(ticket.qr_code || ticket.id).substring(0, 20)}...</span>
                        </p>
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></div>
                          <span className="text-pink-600 text-xs font-semibold">VÁLIDO</span>
                        </div>
                      </div>
                    </div>
                  ) : ticketUser ? (
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 text-center">QR CODE INDISPONÍVEL</h3>
                      
                      <div className="bg-white rounded-lg p-2 border border-gray-100 relative">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-gray-400 text-2xl sm:text-3xl">🔒</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-center">
                        <p className="text-gray-600 text-xs">
                          Status do ingresso não permite QR Code
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Botões e Status - Compactos */}
              <div className="mt-3 space-y-2">
                {!ticketUser && (ticket.status === 'valid' || ticket.status === 'pending' || ticket.status === 'active') && (
                  <button 
                    onClick={() => setUserModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg w-full transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <UserPlus size={16} />
                    DEFINIR UTILIZADOR
                  </button>
                )}

                {ticketUser && (
                  <button 
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg w-full transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isDownloading ? (
                      <>
                        <ProfessionalLoader size="sm" className="mr-1" />
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
            
            <div className={`mt-3 border px-3 py-2 rounded-lg text-center ${
              ticket.status === 'pending' ? 'bg-yellow-100 border-yellow-200 text-yellow-700' :
              ticket.status === 'used' ? 'bg-blue-100 border-blue-200 text-blue-700' :
              ticketUser ? 'bg-green-100 border-green-200 text-green-700' :
              'bg-orange-100 border-orange-200 text-orange-700'
            }`}>
              <p className="text-xs sm:text-sm">
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