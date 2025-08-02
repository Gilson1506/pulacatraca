import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar, RotateCcw } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScannerConfig, Html5QrcodeResult } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';

interface ImprovedQRScannerProps {
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

const ImprovedQRScanner: React.FC<ImprovedQRScannerProps> = ({
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
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderElementId = "improved-qr-reader";
  const maxRetries = 3;

  /**
   * Configuração otimizada do scanner
   */
  const getScannerConfig = (): Html5QrcodeScannerConfig => ({
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    disableFlip: false,
    supportedScanTypes: [], // Todos os tipos
    videoConstraints: {
      facingMode: "environment", // Câmera traseira
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 }
    },
    rememberLastUsedCamera: true,
    showTorchButtonIfSupported: true,
    showZoomSliderIfSupported: false,
    defaultZoomValueIfSupported: 1,
    // Configurações adicionais para estabilidade
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    }
  });

  /**
   * Verifica suporte do navegador
   */
  const checkBrowserSupport = (): { supported: boolean; message?: string } => {
    // Verifica se está em HTTPS ou localhost
    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      return {
        supported: false,
        message: 'Câmera requer HTTPS. Use localhost para desenvolvimento.'
      };
    }

    // Verifica suporte a getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        message: 'Navegador não suporta acesso à câmera.'
      };
    }

    return { supported: true };
  };

  /**
   * Testa acesso direto à câmera
   */
  const testCameraAccess = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Para o stream imediatamente após teste
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('❌ Teste de câmera falhou:', error);
      return false;
    }
  };

  /**
   * Busca dados do ticket no Supabase
   */
  const fetchTicketData = async (qrCode: string): Promise<TicketData | null> => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Buscando ticket com QR:', qrCode);
      
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
   * Callback quando QR é escaneado
   */
  const onScanSuccess = async (decodedText: string, result: Html5QrcodeResult) => {
    try {
      console.log('📱 QR Code escaneado:', decodedText);
      
      // Para o scanner
      if (scannerRef.current) {
        await scannerRef.current.pause(true);
      }
      
      // Feedback tátil
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      // Busca dados do ticket
      const ticketData = await fetchTicketData(decodedText);
      
      if (ticketData) {
        setScanResult(ticketData);
        setError(null);
        
        if (onSuccess) {
          onSuccess(decodedText, ticketData);
        }
      } else {
        setError('Código inválido ou ticket não encontrado');
        setScanResult(null);
        
        // Retoma após erro
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
      
      setTimeout(() => {
        if (scannerRef.current && isOpen) {
          scannerRef.current.resume();
        }
      }, 2000);
    }
  };

  /**
   * Callback para erros de scan
   */
  const onScanFailure = (error: string) => {
    // Silencioso - erros de scan são normais
  };

  /**
   * Inicializa o scanner com retry logic
   */
  const initializeScanner = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verifica suporte do navegador
      const browserCheck = checkBrowserSupport();
      if (!browserCheck.supported) {
        throw new Error(browserCheck.message);
      }

      // Verifica permissão de câmera
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(permission.state);
        
        if (permission.state === 'denied') {
          throw new Error('Permissão da câmera negada. Habilite nas configurações do navegador.');
        }
      } catch (permError) {
        console.warn('⚠️ Não foi possível verificar permissão:', permError);
      }

      // Testa acesso direto à câmera
      const cameraWorking = await testCameraAccess();
      if (!cameraWorking) {
        throw new Error('Não foi possível acessar a câmera. Verifique as permissões.');
      }

      // Aguarda o elemento DOM estar disponível
      await new Promise(resolve => {
        const checkElement = () => {
          const element = document.getElementById(qrReaderElementId);
          if (element) {
            resolve(element);
          } else {
            setTimeout(checkElement, 100);
          }
        };
        checkElement();
      });

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
      setRetryCount(0);
      
      console.log('✅ Scanner inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao inicializar scanner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao acessar câmera';
      setError(errorMessage);
      
      // Sistema de retry
      if (retryCount < maxRetries) {
        console.log(`🔄 Tentativa ${retryCount + 1}/${maxRetries}`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          if (isOpen) {
            initializeScanner();
          }
        }, 2000);
      }
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
      setRetryCount(0);
      console.log('✅ Scanner parado e limpo');
    } catch (error) {
      console.error('❌ Erro ao parar scanner:', error);
    }
  };

  /**
   * Reinicia o scanner manualmente
   */
  const manualRestart = () => {
    setScanResult(null);
    setError(null);
    setRetryCount(0);
    initializeScanner();
  };

  /**
   * Reinicia apenas o scan
   */
  const restartScan = () => {
    setScanResult(null);
    setError(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  // Effect para gerenciar ciclo de vida
  useEffect(() => {
    if (isOpen) {
      // Delay para garantir que o modal está totalmente renderizado
      setTimeout(() => {
        initializeScanner();
      }, 200);
    } else {
      stopScanner();
    }

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
              <h2 className="text-lg font-bold">Scanner QR Melhorado</h2>
              <p className="text-pink-100 text-sm">Detecção otimizada</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <ProfessionalLoader size="lg" className="mb-4" />
              <p className="text-gray-600">
                {retryCount > 0 ? `Tentativa ${retryCount}/${maxRetries}` : 'Inicializando câmera...'}
              </p>
              {retryCount > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Otimizando configurações...
                </p>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro de Câmera</h3>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              
              <div className="space-y-3">
                <button
                  onClick={manualRestart}
                  className="w-full bg-pink-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Tentar Novamente</span>
                </button>
                
                {retryCount >= maxRetries && (
                  <div className="bg-blue-50 p-3 rounded-lg text-left">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Dicas para resolver:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Permita acesso à câmera no navegador</li>
                      <li>• Use HTTPS ou localhost</li>
                      <li>• Feche outros apps que usam a câmera</li>
                      <li>• Recarregue a página</li>
                    </ul>
                  </div>
                )}
              </div>
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
                  className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden min-h-[300px]"
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
                    Scanner otimizado para melhor detecção
                  </p>
                </div>
              )}
              
              {/* Manual Restart Button */}
              {isScanning && (
                <div className="text-center pt-4 border-t border-gray-100">
                  <button
                    onClick={manualRestart}
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors flex items-center justify-center space-x-1 mx-auto"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reiniciar Scanner</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImprovedQRScanner;