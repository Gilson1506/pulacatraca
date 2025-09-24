import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import TicketUserForm from "../components/TicketUserForm";
import SuccessModal from "../components/SuccessModal";
import { TicketTransferService } from "../services/ticketTransferService";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Componente do formulário de transferência
const TransferForm = ({ onSubmit, onCancel }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor, insira um email válido');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor, insira um email válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onSubmit(email);
      console.log('📧 Resultado da transferência:', result);
      
      if (result && result.success) {
        // Sucesso será tratado pelo componente pai
        console.log('✅ Transferência bem-sucedida, limpando formulário');
        setEmail('');
        setError('');
      } else {
        // Mostrar erro retornado pela função
        const errorMessage = result ? result.message : 'Erro desconhecido na transferência';
        console.log('❌ Erro na transferência:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('💥 Erro capturado no formulário:', error);
      setError('Erro ao processar a transferência. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setError('');
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email do Destinatário
        </label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@pulakatraca.com"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:from-pink-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Transferindo...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Transferir
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default function Ticket() {
  const navigate = useNavigate();
  const { ticketId } = useParams(); // Pegar ID do ingresso da URL
  
  // Referência para o elemento do ingresso (para gerar PDF)
  const ticketRef = useRef(null);
  
  // Estados para dados do evento e ingresso
  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [ticketUser, setTicketUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para controlar se o utilizador está definido
  const [isUserDefined, setIsUserDefined] = useState(false);
  
  // Estados para controlar os modais
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    userName: '',
    userEmail: '',
    userDocument: ''
  });
  const [transferResultModal, setTransferResultModal] = useState({
    isOpen: false,
    success: false,
    message: '',
    userName: ''
  });
  
  // Estado para controlar o loading do PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Função para gerar código QR no formato PLKTK076476
  const generateQRCode = () => {
    // Se já existe um qr_code no banco, usar ele
    if (ticket?.qr_code && ticket.qr_code.startsWith('PLKTK')) {
      return ticket.qr_code;
    }
    
    // Se não existe ou não está no formato correto, gerar baseado no ID do ingresso
    if (ticketId) {
      // Remover caracteres especiais e pegar os últimos 6 caracteres
      const cleanId = ticketId.replace(/[^a-zA-Z0-9]/g, '');
      const lastSix = cleanId.slice(-6).toUpperCase();
      
      // Se não tem 6 caracteres, preencher com zeros
      const paddedSix = lastSix.padEnd(6, '0');
      
      return `PLKTK${paddedSix}`;
    }
    
    // Fallback
    return 'PLKTK000000';
  };

  const qrValue = generateQRCode();
  
  // Debug: mostrar código QR gerado
  console.log('🔍 Código QR gerado:', {
    qrValue,
    ticketQrCode: ticket?.qr_code,
    ticketId,
    generated: generateQRCode()
  });

  // Debug: mostrar QR Code para scanner
  console.log('🔍 QR Code para scanner:', {
    qrValue,
    format: 'PLKTK123456',
    description: 'Scanner deve buscar apenas pelo número do ingresso'
  });

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleDownloadPDF = async () => {
    // Declarar variáveis no escopo da função para garantir acesso em todo lugar
    let tempElement = null;
    let originalStyles = null;
    
    try {
      console.log('📄 Iniciando geração do PDF...');
      
      if (!ticketRef.current) {
        console.error('❌ Referência do ingresso não encontrada');
        return;
      }
      
      // Mostrar loading
      setIsGeneratingPDF(true);
      
      // Aguardar um pouco para garantir que o DOM esteja renderizado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Obter o elemento original
      const originalElement = ticketRef.current;
      
      // Verificar se o elemento tem conteúdo
      if (!originalElement.innerHTML || originalElement.innerHTML.trim() === '') {
        console.error('❌ Elemento não tem conteúdo HTML');
        alert('Erro: Elemento do ingresso não tem conteúdo');
        return;
      }
      
      // Salvar estilos originais para restaurar depois
      originalStyles = {
        display: originalElement.style.display || '',
        visibility: originalElement.style.visibility || '',
        position: originalElement.style.position || '',
        overflow: originalElement.style.overflow || '',
        width: originalElement.style.width || '',
        height: originalElement.style.height || '',
        transform: originalElement.style.transform || '',
        left: originalElement.style.left || '',
        top: originalElement.style.top || ''
      };
      
      // Obter dimensões reais sem alterar estilos
      const originalRect = originalElement.getBoundingClientRect();
      const scrollWidth = originalElement.scrollWidth || originalRect.width;
      const scrollHeight = originalElement.scrollHeight || originalRect.height;
      
      // Calcular dimensões totais incluindo margens e padding
      const computedStyle = window.getComputedStyle(originalElement);
      const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
      const marginRight = parseFloat(computedStyle.marginRight) || 0;
      const marginTop = parseFloat(computedStyle.marginTop) || 0;
      const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      
      // Dimensões totais incluindo margens e padding
      const totalWidth = scrollWidth + marginLeft + marginRight + paddingLeft + paddingRight;
      const totalHeight = scrollHeight + marginTop + marginBottom + paddingTop + paddingBottom;
      
      // Verificar se as dimensões são válidas
      if (totalWidth <= 0 || totalHeight <= 0) {
        console.error('❌ Dimensões inválidas:', { totalWidth, totalHeight });
        alert('Erro: Dimensões do ingresso são inválidas');
        return;
      }
      
      console.log('🔧 Estilos originais salvos:', originalStyles);
      console.log('📏 Dimensões do elemento:', { 
        original: { width: scrollWidth, height: scrollHeight },
        total: { width: totalWidth, height: totalHeight },
        margins: { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom },
        padding: { left: paddingLeft, right: paddingRight, top: paddingTop, bottom: paddingBottom }
      });
      
      // Função auxiliar para verificar se o canvas está vazio (otimizada)
      const isCanvasEmpty = (canvas) => {
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          return true;
        }
        
        try {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          // Verificação rápida: amostrar apenas alguns pixels em diferentes áreas
          const sampleAreas = [
            { x: 0, y: 0, w: 10, h: 10 },                    // Canto superior esquerdo
            { x: Math.floor(canvas.width / 2), y: 0, w: 10, h: 10 }, // Centro superior
            { x: canvas.width - 10, y: 0, w: 10, h: 10 },    // Canto superior direito
            { x: 0, y: Math.floor(canvas.height / 2), w: 10, h: 10 }, // Centro esquerdo
            { x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2), w: 10, h: 10 }, // Centro
            { x: canvas.width - 10, y: Math.floor(canvas.height / 2), w: 10, h: 10 }, // Centro direito
            { x: 0, y: canvas.height - 10, w: 10, h: 10 },  // Canto inferior esquerdo
            { x: Math.floor(canvas.width / 2), y: canvas.height - 10, w: 10, h: 10 }, // Centro inferior
            { x: canvas.width - 10, y: canvas.height - 10, w: 10, h: 10 } // Canto inferior direito
          ];
          
          for (const area of sampleAreas) {
            const imageData = ctx.getImageData(area.x, area.y, area.w, area.h);
            
            // Verificar se há pixels não transparentes nesta área
            for (let i = 0; i < imageData.data.length; i += 4) {
              if (imageData.data[i] > 0 || imageData.data[i + 1] > 0 || 
                  imageData.data[i + 2] > 0 || imageData.data[i + 3] > 0) {
                return false; // Encontrou conteúdo
              }
            }
          }
          
          return true; // Canvas vazio
        } catch (error) {
          console.warn('⚠️ Erro ao verificar canvas:', error);
          return true; // Considerar vazio em caso de erro
        }
      };
      
            // Função utilitária para esperar carregamento de todas as imagens
      const waitImagesLoaded = (element) => {
        const images = element.querySelectorAll('img');
        if (images.length === 0) return Promise.resolve();
        
        console.log(`🖼️ Aguardando carregamento de ${images.length} imagens...`);
        return Promise.all(
          Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = img.onerror = resolve;
            });
          })
        );
      };
      
      // ABORDAGEM SIMPLES E EFICAZ: Capturar o elemento real sem alterações
      console.log('🎯 Capturando elemento real sem alterações...');
      
      // Garantir que todas as imagens (incluindo QR code) estejam carregadas
      await waitImagesLoaded(originalElement);
      
      // Obter dimensões reais do elemento como está na tela
      const rect = originalElement.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      console.log('📏 Dimensões reais do elemento:', { width, height });
      
      // Capturar exatamente como está na tela, sem clones ou manipulações
      const canvas = await html2canvas(originalElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f3eeec',
        logging: false,
        width,
        height,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight
      });
      
      // Se todas as tentativas falharam
      if (!canvas) {
        throw new Error('Todas as tentativas de captura falharam. Não foi possível gerar o PDF.');
      }
      
      // Verificação simples: garantir que o canvas foi capturado corretamente
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas não foi capturado corretamente');
      }
      
      console.log('🎯 Canvas final capturado:', {
        width: canvas.width,
        height: canvas.height,
        area: canvas.width * canvas.height
      });
      
      // Verificação simples das dimensões do canvas
      console.log('🔍 Canvas capturado:', {
        width: canvas.width,
        height: canvas.height,
        area: canvas.width * canvas.height
      });
      
      // Gerar imagem do canvas
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (!imgData || imgData === 'data:,' || imgData.length < 100) {
        throw new Error('Imagem não foi gerada corretamente do canvas');
      }
      
      console.log('🖼️ Imagem gerada:', { tamanho: imgData.length });
      
      // Calcular dimensões para PDF A4 landscape
      const pdfWidth = 297; // mm
      const pdfHeight = 210; // mm
      const imgAspectRatio = canvas.width / canvas.height;
      const pdfAspectRatio = pdfWidth / pdfHeight;
      
      console.log('📐 Cálculo de dimensões:', {
        canvas: { width: canvas.width, height: canvas.height },
        pdf: { width: pdfWidth, height: pdfHeight },
        imgAspectRatio: imgAspectRatio.toFixed(3),
        pdfAspectRatio: pdfAspectRatio.toFixed(3)
      });
      
      let finalWidth, finalHeight, offsetX, offsetY;
      
      // Estratégia: Manter proporção mas garantir que toda a imagem seja visível
      if (imgAspectRatio > pdfAspectRatio) {
        // Imagem mais larga que o PDF (ingresso horizontal)
        finalWidth = pdfWidth;
        finalHeight = pdfWidth / imgAspectRatio;
        offsetX = 0;
        offsetY = (pdfHeight - finalHeight) / 2;
        
        console.log('📏 Imagem horizontal:', {
          finalWidth: finalWidth.toFixed(1),
          finalHeight: finalHeight.toFixed(1),
          offsetX: offsetX.toFixed(1),
          offsetY: offsetY.toFixed(1)
        });
      } else {
        // Imagem mais alta que o PDF (ingresso vertical)
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * imgAspectRatio;
        offsetX = (pdfWidth - finalWidth) / 2;
        offsetY = 0;
        
        console.log('📏 Imagem vertical:', {
          finalWidth: finalWidth.toFixed(1),
          finalHeight: finalHeight.toFixed(1),
          offsetX: offsetX.toFixed(1),
          offsetY: offsetY.toFixed(1)
        });
      }
      
      // Verificar se as dimensões finais fazem sentido
      if (finalWidth <= 0 || finalHeight <= 0) {
        console.error('❌ Dimensões finais inválidas:', { finalWidth, finalHeight });
        throw new Error('Erro no cálculo das dimensões do PDF');
      }
      
      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Adicionar imagem centralizada
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
      
      // Nome do arquivo e download
      const fileName = `ingresso_${qrValue}_${event?.title || 'evento'}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF gerado com sucesso:', fileName, {
        dimensoesPDF: `${pdfWidth}mm x ${pdfHeight}mm`,
        dimensoesImagem: `${finalWidth.toFixed(1)}mm x ${finalHeight.toFixed(1)}mm`,
        offset: `X: ${offsetX.toFixed(1)}mm, Y: ${offsetY.toFixed(1)}mm`,
        canvasDimensoes: `${canvas.width} x ${canvas.height}`,
        tamanhoImagem: imgData.length
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      alert(`Erro ao gerar PDF: ${error.message}`);
    } finally {
      // Limpeza sempre executada
      try {
        // Remover elemento temporário do DOM
        if (tempElement && document.body.contains(tempElement)) {
          document.body.removeChild(tempElement);
          console.log('🧹 Elemento temporário removido do DOM');
        }
        
        // Restaurar estilos originais
        if (ticketRef.current && originalStyles) {
          const element = ticketRef.current;
          element.style.display = originalStyles.display;
          element.style.visibility = originalStyles.visibility;
          element.style.position = originalStyles.position;
          element.style.overflow = originalStyles.overflow;
          element.style.width = originalStyles.width;
          element.style.height = originalStyles.height;
          element.style.transform = originalStyles.transform;
          element.style.left = originalStyles.left;
          element.style.top = originalStyles.top;
          console.log('🔧 Estilos originais restaurados');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Erro na limpeza:', cleanupError);
      }
      
      // Garantir que o loader seja sempre desativado
      console.log('🔄 Desativando loader do botão...');
      setIsGeneratingPDF(false);
    }
  };

  const handleGoToEventInfo = () => {
    // Navegar para a página do evento
    if (event?.id) {
      console.log('🎯 Navegando para evento:', event.id);
      navigate(`/evento/${event.id}`);
    } else if (ticket?.event_id) {
      console.log('🎯 Navegando para evento via ticket:', ticket.event_id);
      navigate(`/evento/${ticket.event_id}`);
    } else {
      console.error('❌ ID do evento não encontrado');
      console.log('🔍 Dados disponíveis:', { event, ticket });
      alert('Evento não encontrado. Verifique se o ingresso está vinculado a um evento.');
    }
  };

  // Função para extrair e formatar nome do usuário do email
  const extractUserName = (email) => {
    if (!email || !email.includes('@')) return 'Usuário PulaKatraca';
    
    let userName = email.split('@')[0];
    
    // Tratar diferentes formatos de nome
    if (userName.includes('_')) {
      // joao_silva -> João Silva
      userName = userName.split('_').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ');
    } else if (userName.includes('-')) {
      // maria-santos -> Maria Santos
      userName = userName.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ');
    } else if (userName.includes('.')) {
      // ana.costa -> Ana Costa
      userName = userName.split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join(' ');
    } else {
      // marcos -> Marcos
      userName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
    }
    
    return userName;
  };

  // Função para buscar dados reais do ingresso e evento
  const fetchTicketData = async () => {
    if (!ticketId) return;
    
    try {
      setIsLoading(true);
      console.log('🎫 Buscando dados do ingresso:', ticketId);
      
      // Buscar dados do ingresso
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          event_ticket_types (
            name,
            price_masculine,
            price_feminine,
            area
          ),
          ticket_users (
            id,
            name,
            email,
            document,
            created_at
          )
        `)
        .eq('id', ticketId)
        .single();
      
      if (ticketError) {
        console.error('❌ Erro ao buscar ingresso:', ticketError);
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Dados do ingresso encontrados:', ticketData);
      setTicket(ticketData);
      
      // Buscar dados do evento
      if (ticketData.event_id) {
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
            location_type,
            location_name,
            location_city,
            location_state,
            location_street,
            location_number,
            location_neighborhood,
            location_cep,
            ticket_type
          `)
          .eq('id', ticketData.event_id)
          .single();
        
        if (eventError) {
          console.error('❌ Erro ao buscar evento:', eventError);
          // Mesmo com erro no evento, continuar com os dados do ingresso
        } else {
          console.log('✅ Dados do evento encontrados:', eventData);
          setEvent(eventData);
        }
      }
      
      // Verificar se há usuário definido
      if (ticketData.ticket_users && ticketData.ticket_users.length > 0) {
        const userData = ticketData.ticket_users[0];
        console.log('✅ Usuário do ingresso encontrado via relacionamento:', userData);
        setTicketUser(userData);
        setIsUserDefined(true);
      } else if (ticketData.ticket_user_id) {
        // Fallback: buscar usuário diretamente se o relacionamento não funcionar
        const { data: userData, error: userError } = await supabase
          .from('ticket_users')
          .select('*')
          .eq('id', ticketData.ticket_user_id)
          .single();
        
        if (!userError && userData) {
          console.log('✅ Usuário do ingresso encontrado via busca direta:', userData);
          setTicketUser(userData);
          setIsUserDefined(true);
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Monitorar mudanças nos estados dos modais
  useEffect(() => {
    console.log('🔍 useEffect - isTransferModalOpen mudou para:', isTransferModalOpen);
  }, [isTransferModalOpen]);

  useEffect(() => {
    console.log('🔍 useEffect - transferResultModal mudou para:', transferResultModal);
  }, [transferResultModal]);

  // Buscar dados quando o componente montar
  useEffect(() => {
    fetchTicketData();
  }, [ticketId]);

  const handleTransferTicket = async (email) => {
    try {
      console.log('🔄 Iniciando transferência para:', email);
      
      // Verificar se o usuário está logado
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { 
          success: false, 
          message: 'Você precisa estar logado para transferir ingressos' 
        };
      }

      // Verificar se o ingresso pode ser transferido
      const canTransfer = await TicketTransferService.canTransferTicket(
        ticketId, // ID do ingresso atual
        currentUser.id
      );

      if (!canTransfer.can_transfer) {
        return { 
          success: false, 
          message: canTransfer.message 
        };
      }

      // Buscar usuário pelo email
      const targetUser = await TicketTransferService.findUserByEmail(email);
      if (!targetUser) {
        return { 
          success: false, 
          message: 'Usuário não encontrado com este email' 
        };
      }

      // Verificar se não está tentando transferir para si mesmo
      if (targetUser.id === currentUser.id) {
        return { 
          success: false, 
          message: 'Não é possível transferir o ingresso para você mesmo' 
        };
      }

      // Realizar a transferência
      const transferResult = await TicketTransferService.transferTicket(
        ticketId,
        email,
        currentUser.id
      );

      if (transferResult.success) {
        // Transferência bem-sucedida
        console.log('✅ Transferência realizada com sucesso');
        
        // Fechar modal de transferência
        setIsTransferModalOpen(false);
        
        // Abrir modal de resultado
        setTimeout(() => {
          setTransferResultModal({
            isOpen: true,
            success: true,
            message: `Ingresso transferido com sucesso para ${targetUser.full_name || targetUser.email}!`,
            userName: targetUser.full_name || targetUser.email.split('@')[0]
          });
        }, 200);

        return { 
          success: true, 
          message: 'Transferência realizada com sucesso!', 
          userName: targetUser.full_name || targetUser.email.split('@')[0] 
        };
      } else {
        return { 
          success: false, 
          message: transferResult.message || 'Erro ao processar a transferência' 
        };
      }

    } catch (error) {
      console.error('❌ Erro na transferência:', error);
      return { 
        success: false, 
        message: 'Erro interno ao processar a transferência. Tente novamente.' 
      };
    }
  };

  const handleSetUser = async (userData) => {
    try {
      console.log('👤 Definindo usuário do ingresso com dados:', userData);
      
      // Salvar usuário no banco de dados
      const { data: savedUser, error: userError } = await supabase
        .from('ticket_users')
        .insert([
          {
            name: userData.name,
            email: userData.email,
            document: userData.document,
            ticket_id: ticketId
          }
        ])
        .select()
        .single();
      
      if (userError) {
        console.error('❌ Erro ao salvar usuário:', userError);
        throw userError;
      }
      
      console.log('✅ Usuário salvo no banco:', savedUser);
      
      // Atualizar o ingresso com o ID do usuário
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          ticket_user_id: savedUser.id,
          status: 'active' // Ativar o ingresso
        })
        .eq('id', ticketId);
      
      if (ticketError) {
        console.error('❌ Erro ao atualizar ingresso:', ticketError);
        throw ticketError;
      }
      
      console.log('✅ Ingresso atualizado com usuário');
      
      // Atualizar o estado local
      setTicketUser(savedUser);
      setIsUserDefined(true);
      
      // Fechar o modal de usuário
      setIsUserModalOpen(false);
      
      // Mostrar modal de sucesso com os dados
      setSuccessModal({
        isOpen: true,
        userName: savedUser.name?.trim() || 'Usuário',
        userEmail: savedUser.email?.trim() || '',
        userDocument: savedUser.document?.trim() || ''
      });
      
      console.log('✅ Usuário definido com sucesso:', savedUser);
    } catch (error) {
      console.error('❌ Erro ao definir usuário:', error);
      alert('Erro ao definir usuário. Tente novamente.');
    }
  };

  // Debug: mostrar estados atuais
  console.log('🔍 Estados atuais:', {
    isLoading,
    ticket: !!ticket,
    event: !!event,
    ticketUser: !!ticketUser,
    isUserDefined
  });

  // Mostrar loading enquanto carrega
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#f3eeec] min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando ingresso...</p>
        </div>
      </div>
    );
  }

  // Verificar se há dados básicos do ingresso
  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#f3eeec] min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Ingresso não encontrado</p>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-[#f3eeec] p-5 min-h-screen">
                {/* Botão Voltar */}
          <div className="w-full max-w-[1000px] mb-4">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Voltar</span>
            </button>
          </div>
      
              <div ref={ticketRef} data-ticket-ref="true" className="flex flex-col lg:flex-row w-full max-w-[1000px] lg:h-[350px] rounded-lg shadow-lg overflow-hidden relative bg-transparent">
        {/* Lado esquerdo - mantém layout vertical em todas as telas */}
        <div className="flex flex-1 bg-[url('/parte2backgraund.png')] bg-cover bg-center bg-no-repeat p-4 lg:p-8 justify-center items-center relative min-h-[300px] lg:min-h-0">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className="flex flex-col items-center gap-4 lg:gap-3 text-center relative z-10 max-w-md">
            <div className="text-xs lg:text-xs tracking-[2px] font-semibold text-black uppercase">
              {event?.title || 'EVENTO'}
            </div>
            <div className="text-[40px] lg:text-[42px] font-black text-black leading-none">
              {event?.location_name || 'LOCAL'}
            </div>
            <div className="text-center space-y-2 lg:space-y-2">
              <div className="inline-block px-3 lg:px-3 py-2 lg:py-1.5 border-2 border-black rounded-md font-bold bg-transparent text-black text-sm lg:text-sm">
                {event?.start_date ? new Date(event.start_date).toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                }).toUpperCase() : 'DATA NÃO DEFINIDA'} - {event?.start_date ? new Date(event.start_date).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 'HORA NÃO DEFINIDA'}
              </div>
              <div className="flex flex-col gap-2 lg:gap-1.5 justify-center">
                <div className="px-3 lg:px-3 py-2 lg:py-1.5 border-2 border-black rounded-md font-bold bg-transparent text-black text-sm lg:text-sm">
                  VALOR: R${ticket?.price || event?.price || 0}
                </div>
                <div className="px-3 lg:px-3 py-2 lg:py-1.5 border-2 border-black rounded-md font-bold bg-transparent text-black text-sm lg:text-sm">
                  {event?.location_street ? `${event.location_street}${event.location_number ? `, ${event.location_number}` : ''}` : 'RUA NÃO DEFINIDA'}
                </div>
                
                {/* Logo posicionada após a rua - apenas em mobile */}
                <div className="flex justify-center mt-3 lg:hidden">
                  <img src="/logo-com-qr.png" alt="Logo com QR" className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Logo com QR - apenas em desktop */}
          <div className="absolute bottom-4 right-1 relative z-10 hidden lg:block">
            <img src="/logo-com-qr.png" alt="Logo com QR" className="w-36 h-36 xl:w-40 xl:h-40 object-contain" />
          </div>
        </div>

        {/* Perforação - só aparece em desktop */}
        <div className="hidden lg:block absolute left-[60%] top-0 w-[2px] h-full bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_8px,#ccc_8px,#ccc_12px)] z-10">
          <div className="absolute -top-[10px] left-[-9px] w-[20px] h-[20px] bg-[#f3eeec] rounded-full border border-gray-300"></div>
          <div className="absolute -bottom-[10px] left-[-9px] w-[20px] h-[20px] bg-[#f3eeec] rounded-full border border-gray-300"></div>
        </div>

        {/* Lado direito - se adapta ao tamanho da tela */}
        <div className="flex flex-col flex-[0.7] relative items-center justify-start p-3 text-white bg-[url('/parte1backgraund.jpg')] bg-cover bg-center min-h-[250px] lg:min-h-0">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>

          {/* Título QR */}
          <div className="relative text-lg lg:text-base font-bold mb-2 lg:mb-1 text-black">QR CODE</div>

          {/* QR Code maior - se adapta ao tamanho da tela */}
          <div className="relative bg-white p-3 lg:p-2 rounded-lg mb-3 lg:mb-2">
            <QRCodeSVG 
              value={qrValue} 
              size={window.innerWidth < 1024 ? 120 : 160} 
              fgColor="#ff007f" 
            />
          </div>

          {/* Container único branco para código de barras + data */}
          <div className="relative bg-white text-black p-1 lg:p-1 rounded-lg w-full flex flex-col items-center gap-1 lg:gap-1 shadow-lg border-2 border-gray-200">
            {/* Código de barras realista */}
            <div className="w-full h-8 bg-white border border-gray-300 rounded mb-1 flex items-center justify-center">
              <div className="flex gap-0.5">
                {[
                  // Padrão realista de código de barras
                  '1110101', '1011010', '1101011', '1010110', '1101101',
                  '1011011', '1101010', '1010111', '1101100', '1011001',
                 
                ].join('').split('').map((bit, i) => (
                  <div 
                    key={i} 
                    className={`h-6 w-0.5 ${bit === '1' ? 'bg-black' : 'bg-white'}`}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="w-full flex justify-between items-center px-2">
              <span className="text-xs font-bold text-black">TICKET NUMBER:</span>
              <span className="text-xs font-bold text-black">{qrValue}</span>
            </div>
            
            <div className="flex justify-between w-full font-bold text-center px-3 lg:px-2 py-2 lg:py-1">
              <div className="flex flex-col items-center">
                <span className="text-sm lg:text-sm text-gray-800 font-semibold mb-1">DIA</span>
                <span className="text-[28px] lg:text-[32px] font-black leading-none text-black">
                  {event?.start_date ? new Date(event.start_date).getDate().toString().padStart(2, '0') : '--'}
                </span>
              </div>
              
              <div className="flex items-center">
                <img src="/bunacodata1.png" alt="Separador" className="w-10 h-16 lg:w-12 lg:h-20" />
              </div>
              
              <div className="flex flex-col items-center">
                <span className="text-sm lg:text-sm text-gray-800 font-semibold mb-1">MÊS</span>
                <span className="text-[28px] lg:text-[32px] font-black leading-none text-black">
                  {event?.start_date ? (new Date(event.start_date).getMonth() + 1).toString().padStart(2, '0') : '--'} 
                </span>
              </div>
              
              <div className="flex items-center">
                <img src="/bunecodata2.jpg" alt="Separador" className="w-10 h-16 lg:w-12 lg:h-20" />
              </div>
              
              <div className="flex flex-col items-center">
                <span className="text-sm lg:text-sm text-gray-800 font-semibold mb-1">ANO</span>
                <span className="text-[28px] lg:text-[32px] font-black leading-none text-black">
                  {event?.start_date ? new Date(event.start_date).getFullYear().toString().slice(-2) : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões abaixo */}
      <div className="mt-6 lg:mt-8 flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Botão TRANSFERIR - só aparece quando não há utilizador definido */}
        {!isUserDefined && (
          <button 
            onClick={() => setIsTransferModalOpen(true)}
            className="px-8 lg:px-10 py-3 lg:py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-bold hover:from-pink-500 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 border-pink-400 text-sm lg:text-base"
          >
            TRANSFERIR
          </button>
        )}
        
        {/* Botão condicional baseado no status do utilizador */}
        {isUserDefined ? (
          <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="px-8 lg:px-10 py-3 lg:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 border-green-400 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Gerando PDF...
              </>
            ) : (
              'BAIXAR PDF'
            )}
          </button>
        ) : (
          <button 
            onClick={() => setIsUserModalOpen(true)}
            className="px-8 lg:px-10 py-3 lg:py-4 bg-white text-pink-600 rounded-xl font-bold hover:bg-pink-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 border-pink-500 hover:border-pink-600 text-sm lg:text-base"
          >
            DEFINIR UTILIZADOR
          </button>
        )}
        
        {/* Botão INFORMAÇÕES DO EVENTO - sempre visível */}
        <button 
          onClick={handleGoToEventInfo}
          className="px-8 lg:px-10 py-3 lg:py-4 bg-gray-200 text-pink-600 rounded-xl font-bold hover:bg-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 border-gray-300 hover:border-gray-400 text-sm lg:text-base"
        >
          INFORMAÇÕES DO EVENTO
        </button>
      </div>

      {/* Modal de Preencher Utilizador */}
      <TicketUserForm 
        ticketId={ticketId}
        onSuccess={handleSetUser}
        onCancel={() => setIsUserModalOpen(false)}
        isOpen={isUserModalOpen}
      />

      {/* Modal de Transferência */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeInUp">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 text-white relative">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="absolute top-4 right-4 text-white hover:text-pink-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <h2 className="text-xl font-bold pr-8">Transferir Ingresso</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Transferir Ingresso #{ticketId}
                </h3>
                <p className="text-gray-600 text-sm">
                  Digite o email do usuário PulaKatraca que receberá este ingresso
                </p>
              </div>

              <TransferForm 
                onSubmit={handleTransferTicket}
                onCancel={() => setIsTransferModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultado da Transferência */}
      {transferResultModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeInUp">
            {/* Header */}
            <div className={`px-6 py-4 text-white relative ${
              transferResultModal.success 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
              <button
                onClick={() => {
                  console.log('🔒 Fechando modal de resultado');
                  setTransferResultModal({ isOpen: false, success: false, message: '', userName: '' });
                }}
                className="absolute top-4 right-4 text-white hover:opacity-80 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                {transferResultModal.success ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <h2 className="text-xl font-bold pr-8">
                  {transferResultModal.success ? 'Transferência Realizada!' : 'Transferência Falhou'}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-6 text-center text-base">
                {transferResultModal.message || 'Operação concluída'}
              </p>
              
              {transferResultModal.success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">✓</span>
                    </div>
                    <h3 className="font-bold text-green-800">INGRESSO TRANSFERIDO</h3>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <div className="text-center">
                      <span className="text-gray-600 text-sm">Para:</span>
                      <div className="font-semibold text-gray-800 mt-1">
                        {transferResultModal.userName || 'Usuário PulaKatraca'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  console.log('🔒 Fechando modal de resultado via botão');
                  setTransferResultModal({ isOpen: false, success: false, message: '', userName: '' });
                }}
                className={`w-full py-3 px-4 rounded-lg font-bold text-base transition-all duration-200 ${
                  transferResultModal.success
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
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
}