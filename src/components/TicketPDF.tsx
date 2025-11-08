import React from 'react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface TicketData {
  id: string;
  qr_code: string;
  price: number;
  purchase_date: string;
  status: string;
  event: {
    id: string;
    name: string;
    date: string;
    time: string;
    location: string;
    description: string;
    image?: string;
  };
  ticket_user: {
    id: string;
    name: string;
    email: string;
    document?: string;
  };
}

interface TicketPDFProps {
  ticket: TicketData;
  onDownload?: () => void;
}

const TicketPDF: React.FC<TicketPDFProps> = ({ ticket, onDownload }) => {
  
  const generatePDF = async () => {
    try {
      // Criar o PDF
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Cores
      const primaryColor = '#ec4899'; // pink-500
      const secondaryColor = '#8b5cf6'; // purple-500
      const darkColor = '#1f2937'; // gray-800
      const lightColor = '#f9fafb'; // gray-50

      // Header com gradiente simulado
      pdf.setFillColor(236, 72, 153); // pink-500
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo/Título
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🎫 PULACATRACA', 20, 25);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Seu Ingresso Digital', 20, 32);

      // Informações do Evento
      let yPos = 60;
      
      pdf.setTextColor(31, 41, 55); // gray-800
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(ticket.event.name, 20, yPos);
      
      yPos += 15;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      // Data e hora
      const eventDate = new Date(ticket.event.date);
      const formattedDate = eventDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      pdf.text(`📅 Data: ${formattedDate}`, 20, yPos);
      yPos += 8;
      pdf.text(`🕐 Horário: ${ticket.event.time}`, 20, yPos);
      yPos += 8;
      pdf.text(`📍 Local: ${ticket.event.location}`, 20, yPos);
      yPos += 8;
      pdf.text(`💰 Valor: €${ticket.price.toFixed(2)}`, 20, yPos);

      // Linha separadora
      yPos += 15;
      pdf.setDrawColor(236, 72, 153);
      pdf.setLineWidth(1);
      pdf.line(20, yPos, pageWidth - 20, yPos);

      // Informações do Usuário
      yPos += 20;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('👤 Dados do Usuário', 20, yPos);
      
      yPos += 15;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Nome: ${ticket.ticket_user.name}`, 20, yPos);
      yPos += 8;
      pdf.text(`E-mail: ${ticket.ticket_user.email}`, 20, yPos);
      
      if (ticket.ticket_user.document) {
        yPos += 8;
        pdf.text(`Documento: ${ticket.ticket_user.document}`, 20, yPos);
      }

      // QR Code
      yPos += 25;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('📱 QR Code para Entrada', 20, yPos);
      
      // Gerar QR Code
      const qrCodeDataURL = await QRCode.toDataURL(ticket.qr_code, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Adicionar QR Code ao PDF
      const qrSize = 40;
      const qrX = (pageWidth - qrSize) / 2;
      yPos += 10;
      
      pdf.addImage(qrCodeDataURL, 'PNG', qrX, yPos, qrSize, qrSize);
      
      // Código do QR abaixo
      yPos += qrSize + 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128); // gray-500
      const qrText = `Código: ${ticket.qr_code}`;
      const qrTextWidth = pdf.getTextWidth(qrText);
      pdf.text(qrText, (pageWidth - qrTextWidth) / 2, yPos);

      // Instruções
      yPos += 20;
      pdf.setDrawColor(236, 72, 153);
      pdf.line(20, yPos, pageWidth - 20, yPos);
      
      yPos += 15;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('📋 Instruções Importantes', 20, yPos);
      
      yPos += 12;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const instructions = [
        '• Apresente este ingresso (impresso ou digital) na entrada do evento',
        '• O QR Code será escaneado para validação',
        '• Chegue com antecedência para evitar filas',
        '• Mantenha o ingresso em local seguro',
        '• Em caso de problemas, procure a organização do evento'
      ];
      
      instructions.forEach(instruction => {
        pdf.text(instruction, 25, yPos);
        yPos += 6;
      });

      // Footer
      yPos = pageHeight - 30;
      pdf.setDrawColor(236, 72, 153);
      pdf.line(20, yPos, pageWidth - 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text('PulaCatraca - Sistema de Ingressos Digitais', 20, yPos);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, yPos + 5);
      
      const ticketInfo = `Ingresso ID: ${ticket.id} | Status: ${ticket.status.toUpperCase()}`;
      const ticketInfoWidth = pdf.getTextWidth(ticketInfo);
      pdf.text(ticketInfo, pageWidth - ticketInfoWidth - 20, yPos);

      // Salvar o PDF
      const fileName = `ingresso-${ticket.event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${ticket.id}.pdf`;
      pdf.save(fileName);
      
      if (onDownload) {
        onDownload();
      }
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <button
      onClick={generatePDF}
      className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      <span className="text-lg">📄</span>
      Baixar PDF
    </button>
  );
};

export default TicketPDF;