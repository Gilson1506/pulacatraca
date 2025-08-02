import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScannerConfig, Html5QrcodeResult } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';

interface ModernQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (qrData: string, ticketData?: any) => void;
  eventId?: string;
}

interface TicketData {
  id: string;
  name: string;
  email: string;
  event_title: string;
  ticket_type: string;
  qr_code: string;
}

const ModernQRScanner: React.FC<ModernQRScannerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventId
}) => {
  // Estados do componente
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  // Refs
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderElementId = "qr-reader";

  /**
   * Configuração do scanner HTML5-QRCode
   * Otimizada para performance e compatibilidade mobile
   */
  const getScannerConfig = (): Html5QrcodeScannerConfig => ({
    fps: 10, // Frames por segundo - balanceado para performance
    qrbox: { width: 250, height: 250 }, // Área de scan
    aspectRatio: 1.0, // Proporção quadrada
    disableFlip: false, // Permite espelhamento
    supportedScanTypes: [], // Todos os tipos suportados
    videoConstraints: {
      facingMode: "environment", // Câmera traseira por padrão
      aspectRatio: 1.0
    },
    rememberLastUsedCamera: true, // Lembra da última câmera usada
    showTorchButtonIfSupported: true, // Botão de flash se disponível
    showZoomSliderIfSupported: false, // Sem zoom para simplicidade
    defaultZoomValueIfSupported: 1 // Zoom padrão
  });

  /**
   * Busca dados do ticket no Supabase
   * @param qrCode - Código QR escaneado
   */
  const fetchTicketData = async (qrCode: string): Promise<TicketData | null> => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Buscando ticket com QR:', qrCode);
      
      // Query para buscar ticket_user com dados do evento
      const { data, error } = await supabase
        .from('ticket_users')
        .select(`
          id,
          name,
          email,
          qr_code,
          tickets!inner (
            name as ticket_type,
            events!inner (
              title as event_title
            )
          )
        `)
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro na consulta Supabase:', error);
        throw new Error('Erro ao consultar banco de dados');
      }

      if (!data) {
        console.log('❌ Ticket não encontrado para QR:', qrCode);
        return null;
      }

      // Formatar dados do ticket
      const ticketData: TicketData = {
        id: data.id,
        name: data.name,
        email: data.email,
        event_title: data.tickets.events.event_title,
        ticket_type: data.tickets.ticket_type,
        qr_code: data.qr_code
      };

      console.log('✅ Ticket encontrado:', ticketData);
      return ticketData;

    } catch (error) {
      console.error('❌ Erro ao buscar ticket:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Callback quando QR é escaneado com sucesso
   * @param decodedText - Texto decodificado do QR
   * @param result - Resultado completo do scan
   */
  const onScanSuccess = async (decodedText: string, result: Html5QrcodeResult) => {
    try {
      console.log('📱 QR Code escaneado:', decodedText);
      
      // Para o scanner temporariamente
      if (scannerRef.current) {
        await scannerRef.current.pause(true);
      }
      
      // Vibração de feedback (se disponível)
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      // Busca dados do ticket
      const ticketData = await fetchTicketData(decodedText);
      
      if (ticketData) {
        setScanResult(ticketData);
        setError(null);
        
        // Chama callback de sucesso se fornecido
        if (onSuccess) {
          onSuccess(decodedText, ticketData);
        }
      } else {
        setError('Código inválido ou ticket não encontrado');
        setScanResult(null);
        
        // Retoma o scanner após erro
        setTimeout(() => {
          if (scannerRef.current && isOpen) {
            scannerRef.current.resume();
          }
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Erro no processamento do QR:', error);
      setError('Erro ao processar código QR. Tente novamente.');
      setScanResult(null);
      
      // Retoma o scanner após erro
      setTimeout(() => {
        if (scannerRef.current && isOpen) {
          scannerRef.current.resume();
        }
      }, 2000);
    }
  };

  /**
   * Callback para erros de scan (silencioso)
   * @param error - Erro de scan
   */
  const onScanFailure = (error: string) => {
    // Log silencioso - normal durante o scan
    // console.log('Scan attempt:', error);
  };

  /**
   * Inicializa o scanner HTML5-QRCode
   */
  const initializeScanner = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verifica permissão da câmera
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(permission.state);
      
      if (permission.state === 'denied') {
        throw new Error('Permissão da câmera negada. Habilite nas configurações do navegador.');
      }

      // Cria e configura o scanner
      const scanner = new Html5QrcodeScanner(
        qrReaderElementId,
        getScannerConfig(),
        false // verbose logging
      );
      
      // Inicia o scanner
      await scanner.render(onScanSuccess, onScanFailure);
      
      scannerRef.current = scanner;
      setIsScanning(true);
      
      console.log('✅ Scanner inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao inicializar scanner:', error);
      setError(error instanceof Error ? error.message : 'Erro ao acessar câmera');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Para e limpa o scanner
   */
  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
      setIsScanning(false);
      setScanResult(null);
      setError(null);
      console.log('✅ Scanner parado e limpo');
    } catch (error) {
      console.error('❌ Erro ao parar scanner:', error);
    }
  };

  /**
   * Reinicia o scan
   */
  const restartScan = () => {
    setScanResult(null);
    setError(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  // Effect para gerenciar ciclo de vida do scanner
  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      stopScanner();
    }

    // Cleanup ao desmontar
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Não renderiza se modal estiver fechado
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Scanner QR</h2>
              <p className="text-pink-100 text-sm">Aponte para o código QR</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <ProfessionalLoader size="lg" className="mb-4" />
              <p className="text-gray-600">Inicializando câmera...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro</h3>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={restartScan}
                className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Success State */}
          {scanResult && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Encontrado!</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Participante</p>
                    <p className="font-semibold text-gray-900">{scanResult.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Evento</p>
                    <p className="font-semibold text-gray-900">{scanResult.event_title}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-pink-100 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-pink-600 rounded"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Ingresso</p>
                    <p className="font-semibold text-gray-900">{scanResult.ticket_type}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={restartScan}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Escanear Outro
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}

          {/* Scanner Area */}
          {!isLoading && !error && !scanResult && (
            <div className="space-y-4">
              
              {/* QR Reader Container */}
              <div className="relative">
                <div 
                  id={qrReaderElementId}
                  className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                />
                
                {/* Overlay corners */}
                {isScanning && (
                  <div className="absolute inset-4 pointer-events-none">
                    <div className="relative w-full h-full">
                      {/* Top corners */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-pink-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-pink-500 rounded-tr-lg"></div>
                      {/* Bottom corners */}
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-pink-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-pink-500 rounded-br-lg"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {isScanning && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Posicione o código QR dentro da área marcada
                  </p>
                  <p className="text-xs text-gray-500">
                    O scanner detectará automaticamente o código
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernQRScanner;