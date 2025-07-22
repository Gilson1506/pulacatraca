import React, { useState, useRef } from 'react';
import { ArrowLeft, MapPin, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserFormModal from '../components/UserFormModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const TicketPage = () => {
  const navigate = useNavigate();
  const ticketRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Mock data for now
  const [ticket, setTicket] = useState({
    id: '6130683',
    event: {
      name: 'Awê Festival',
      date: '2025-11-29T16:00:00',
      location: 'São José do Rio Preto - SP',
      venue: 'Exposições Alberto Bertelli Lucatto',
      image: 'https://i.postimg.cc/d3dtV6Z4/Imagem-Whats-App-2025-07-14-s-17-58-28-fdcded78.jpg' // A placeholder image
    },
    details: {
      batch: '1º LOTE',
      type: 'MEIA ENTRADA | SOLIDÁRIA - MEDIANTE 1KG DE ALIMENTO NÃO PERECÍVEL OU ATENDER ÀS POLÍTICAS DE MEIA ENTRADA',
      orderNumber: '250011090',
      onlineId: '6130683',
      ageRating: '16+'
    },
    user: null, // or { name: '...', email: '...', country: '...' }
  });

  const [isUserModalOpen, setUserModalOpen] = useState(false);

  const handleSetUser = (userData) => {
    setTicket(prev => ({ ...prev, user: userData }));
    setUserModalOpen(false);
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

  const formattedDate = new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const formattedDay = new Date(ticket.event.date).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
  const formattedTime = new Date(ticket.event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-semibold">
          <ArrowLeft size={20} />
          VOLTAR
        </button>

        <header className="flex justify-between items-center bg-white p-4 rounded-t-lg border-b">
          <div className="flex items-center gap-4">
            <img src={ticket.event.image} alt={ticket.event.name} className="w-16 h-16 rounded-full object-cover"/>
            <div>
              <h1 className="text-xl font-bold text-pink-600">{ticket.event.name}</h1>
              <p className="text-gray-600">{new Date(ticket.event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {formattedTime}</p>
              <a href="#" className="text-blue-600 text-sm font-semibold hover:underline">Ver evento</a>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-blue-600 flex items-center gap-2"><MapPin size={16} /> {ticket.event.location}</p>
            <p className="text-gray-500">{ticket.event.venue}</p>
          </div>
        </header>

        <main className="bg-white p-6 rounded-b-lg shadow-md">
          <div ref={ticketRef} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">
                {ticket.user ? `UTILIZADOR: ${ticket.user.name.toUpperCase()}` : 'PREENCHER UTILIZADOR'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Ticket Details */}
              <div className="md:col-span-2">
                <p className="text-gray-500 text-sm">1 de 1</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  <span className="text-pink-600">{formattedDate}</span> | {formattedDay} {formattedTime}
                </h2>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1">FRONTSTAGE</h3>
                <div className="mt-4 space-y-3 text-gray-700">
                  <p><span className="font-semibold text-blue-600">{ticket.details.batch}</span></p>
                  <p className="text-sm">{ticket.details.type}</p>
                  <p className="text-xs text-gray-500">Nº {ticket.details.orderNumber}</p>
                  <p className="text-xs text-pink-500">Online #{ticket.details.onlineId}</p>
                  <span className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">{ticket.details.ageRating}</span>
                </div>
              </div>

              {/* Right Column: User and QR Code */}
              <div className="text-center flex flex-col items-center justify-between">
                <div>
                  <p className="font-semibold">Utilizador</p>
                  <p className="text-gray-500 text-sm">{ticket.user ? ticket.user.name : 'Utilizador não informado'}</p>
                </div>

                <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-lg mt-4 relative">
                  {ticket.user ? (
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${ticket.id}`} alt="QR Code" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 backdrop-blur-sm bg-white/30 rounded-lg">
                      <div className="w-24 h-24 bg-gray-300 animate-pulse rounded-md blur-md"></div>
                      <p className="text-xs font-semibold text-gray-600 mt-2 absolute">PREENCHA OS DADOS DO UTILIZADOR PARA VISUALIZAR O QRCODE</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setUserModalOpen(true)}
                  disabled={!!ticket.user}
                  className="mt-4 bg-pink-600 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-pink-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <UserPlus className="inline-block mr-2" size={16} />
                  {ticket.user ? 'UTILIZADOR PREENCHIDO' : 'PREENCHER UTILIZADOR'}
                </button>

                {ticket.user && (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="mt-2 bg-green-500 text-white font-bold py-2 px-4 rounded-lg w-full hover:bg-green-600 transition-colors disabled:bg-gray-400"
                  >
                    {isDownloading ? 'BAIXANDO...' : 'PDF'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-6 bg-orange-100 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-center">
              <p>{ticket.user ? 'Dados do utilizador preenchidos. Bom evento!' : 'Preencha os dados do utilizador deste ingresso para poder utilizá-lo.'}</p>
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