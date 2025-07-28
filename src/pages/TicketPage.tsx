import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MapPin, UserPlus, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import UserFormModal from '../components/UserFormModal';
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

  useEffect(() => {
    if (ticketId && currentUser) {
      fetchTicketData();
    }
  }, [ticketId, currentUser]);

  const fetchTicketData = async () => {
    try {
      setIsLoading(true);
      console.log('🎫 Buscando dados do ingresso:', ticketId);

      // Buscar ingresso com dados do evento
      const { data: ticketData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events!inner(title, description, date, location, banner_url, price)
        `)
        .eq('id', ticketId)
        .eq('buyer_id', currentUser.id) // ✅ APENAS SE O USUÁRIO É O COMPRADOR
        .single();

      if (error) {
        console.error('❌ Erro ao buscar ingresso:', error);
        alert('Ingresso não encontrado ou você não tem permissão para visualizá-lo.');
        navigate('/profile');
        return;
      }

      console.log('✅ Ingresso encontrado:', ticketData);
      setTicket(ticketData);

      // Se há um user_id definido, buscar dados do usuário
      if (ticketData.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('id', ticketData.user_id)
          .single();

        if (!userError && userData) {
          setTicketUser(userData);
        }
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao buscar ingresso:', error);
      alert('Erro ao carregar ingresso. Tente novamente.');
      navigate('/profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetUser = async (userData) => {
    try {
      console.log('👤 Definindo usuário do ingresso:', userData);

      // Buscar o usuário pelo email
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('email', userData.email.trim())
        .single();

      if (userError) {
        console.error('❌ Usuário não encontrado:', userError);
        alert('Usuário não encontrado. Verifique se o email está correto e se o usuário possui cadastro na plataforma.');
        return;
      }

      // Atualizar o ingresso com o user_id
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ user_id: userProfile.id })
        .eq('id', ticketId);

      if (updateError) {
        console.error('❌ Erro ao atualizar ingresso:', updateError);
        alert('Erro ao definir usuário do ingresso. Tente novamente.');
        return;
      }

      console.log('✅ Usuário definido com sucesso!');
      setTicketUser(userProfile);
      setUserModalOpen(false);
      
      alert(`✅ Usuário definido com sucesso!\nNome: ${userProfile.name}\nEmail: ${userProfile.email}`);

    } catch (error) {
      console.error('❌ Erro inesperado ao definir usuário:', error);
      alert('Erro inesperado ao definir usuário. Tente novamente.');
    }
  };

  const handleDownloadPdf = () => {
    if (!ticketRef.current || isDownloading) return;

    setIsDownloading(true);

    html2canvas(ticketRef.current, {
      scale: 3, // Aumenta a resolução para melhor qualidade
      useCORS: true,
      backgroundColor: '#ffffff', // Define um fundo branco para consistência
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png', 0.95); // Usar PNG com leve compressão
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasAspectRatio = canvas.width / canvas.height;
      
      // Deixar 10mm de margem
      const margin = 10;
      let imgWidth = pdfWidth - (margin * 2);
      let imgHeight = imgWidth / canvasAspectRatio;

      // Se a altura da imagem for maior que a página, recalcular com base na altura
      if (imgHeight > pdfHeight - (margin * 2)) {
        imgHeight = pdfHeight - (margin * 2);
        imgWidth = imgHeight * canvasAspectRatio;
      }

      // Centralizar a imagem
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

  // Ingresso não encontrado
  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Ingresso não encontrado.</p>
          <button 
            onClick={() => navigate('/profile')} 
            className="bg-pink-600 text-white px-6 py-2 rounded-lg"
          >
            Voltar ao Perfil
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const formattedDay = new Date(ticket.event.date).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
  const formattedTime = new Date(ticket.event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-semibold">
          <ArrowLeft size={20} />
          VOLTAR AO PERFIL
        </button>

        <header className="flex justify-between items-center bg-white p-4 rounded-t-lg border-b">
          <div className="flex items-center gap-4">
            <img 
              src={ticket.event.banner_url || 'https://via.placeholder.com/64x64?text=Evento'} 
              alt={ticket.event.title} 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h1 className="text-xl font-bold text-pink-600">{ticket.event.title}</h1>
              <p className="text-gray-600">{new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {formattedTime}</p>
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
              <MapPin size={16} /> {ticket.event.location}
            </p>
            <p className="text-gray-500">Status: {ticket.status === 'active' ? 'Confirmado' : ticket.status === 'used' ? 'Utilizado' : 'Pendente'}</p>
          </div>
        </header>

        <main className="bg-white p-6 rounded-b-lg shadow-md">
          <div ref={ticketRef} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">
                {ticketUser ? `UTILIZADOR: ${ticketUser.name.toUpperCase()}` : 'PREENCHER UTILIZADOR'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                ticket.status === 'active' ? 'bg-green-100 text-green-600' :
                ticket.status === 'used' ? 'bg-blue-100 text-blue-600' :
                ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {ticket.status === 'active' ? 'CONFIRMADO' : 
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
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{ticket.event.title.toUpperCase()}</h3>
                <div className="mt-4 space-y-3 text-gray-700">
                  <p><span className="font-semibold text-blue-600">{ticket.ticket_type || 'INGRESSO GERAL'}</span></p>
                  <p className="text-sm">{ticket.event.description || 'Evento imperdível!'}</p>
                  <p className="text-xs text-gray-500">Código: {ticket.code}</p>
                  <p className="text-xs text-pink-500">Valor: R$ {(ticket.event.price || 0).toFixed(2)}</p>
                  <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">16+</span>
                </div>
              </div>

              {/* Right Column: User and QR Code */}
              <div className="text-center flex flex-col items-center justify-between">
                <div>
                  <p className="font-semibold">Utilizador</p>
                  <p className="text-gray-500 text-sm">{ticketUser ? ticketUser.name : 'Utilizador não definido'}</p>
                  {ticketUser && (
                    <p className="text-gray-400 text-xs">{ticketUser.email}</p>
                  )}
                </div>

                <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-lg mt-4 relative">
                  {ticketUser && ticket.status === 'active' ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${ticket.code}`} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                      <div className="w-24 h-24 bg-gray-300 animate-pulse rounded-md blur-md"></div>
                      <p className="text-xs font-semibold text-gray-600 mt-2 absolute">
                        {ticket.status !== 'active' ? 'AGUARDANDO CONFIRMAÇÃO' : 'DEFINA O UTILIZADOR PARA VER O QR CODE'}
                      </p>
                    </div>
                  )}
                </div>

                {ticket.status === 'active' && (
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

                {ticketUser && ticket.status === 'active' && (
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
                  '⏳ Aguardando confirmação do organizador para poder definir o utilizador.' :
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

      <UserFormModal 
        isOpen={isUserModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSubmit={handleSetUser}
      />
    </div>
  );
};

export default TicketPage; 