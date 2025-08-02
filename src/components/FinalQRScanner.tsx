import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';

interface FinalQRScannerProps {
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

const FinalQRScanner: React.FC<FinalQRScannerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventId
}) => {
  // Estados do componente
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [scanned, setScanned] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Adiciona informação de debug
   */
  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `${timestamp}: ${info}`;
    console.log(`🔍 FinalScanner: ${message}`);
    setDebugInfo(prev => [...prev.slice(-8), message]);
  };

  /**
   * Busca dados do ticket
   */
  const fetchTicketData = async (qrCode: string): Promise<TicketData | null> => {
    try {
      addDebugInfo(`📡 Buscando ticket: ${qrCode}`);
      
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
        addDebugInfo(`❌ Erro Supabase: ${error.message}`);
        throw new Error('Erro ao consultar banco de dados');
      }

      if (!data) {
        addDebugInfo('❌ Ticket não encontrado no banco');
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

      addDebugInfo(`✅ Ticket encontrado: ${ticketData.name}`);
      return ticketData;

    } catch (error) {
      addDebugInfo(`💥 Erro na busca: ${error}`);
      throw error;
    }
  };

  /**
   * Processa resultado do QR
   */
  const handleQRResult = async (qrValue: string) => {
    try {
      addDebugInfo(`🎯 QR DETECTADO: ${qrValue}`);
      setScanned(true);
      
      // Para o scanner
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        addDebugInfo('🛑 Scanner pausado para processamento');
      }
      
      // Feedback tátil
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Busca dados do ticket
      const ticketData = await fetchTicketData(qrValue);
      
      if (ticketData) {
        setScanResult(ticketData);
        setError(null);
        addDebugInfo('🎉 SUCESSO: Ticket válido encontrado!');
        
        if (onSuccess) {
          onSuccess(qrValue, ticketData);
        }
      } else {
        setError('Código QR inválido ou ticket não encontrado');
        setScanResult(null);
        addDebugInfo('❌ ERRO: Ticket inválido');
        
        // Retoma após erro
        setTimeout(() => {
          setScanned(false);
          if (isMountedRef.current && isOpen) {
            initializeScanner();
          }
        }, 3000);
      }

    } catch (error) {
      addDebugInfo(`💥 Erro no processamento: ${error}`);
      setError('Erro ao processar código QR. Tente novamente.');
      setScanResult(null);
      
      setTimeout(() => {
        setScanned(false);
        if (isMountedRef.current && isOpen) {
          initializeScanner();
        }
      }, 3000);
    }
  };

  /**
   * Inicializa o scanner com a lógica que funcionava
   */
  const initializeScanner = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setScanned(false);
      addDebugInfo('🚀 INICIANDO SCANNER FINAL...');
      
      // Verifica se está em ambiente seguro
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('Scanner requer HTTPS ou localhost');
      }
      addDebugInfo('✅ Ambiente seguro verificado');

      // Aguarda elemento video estar disponível
      let videoAttempts = 0;
      while (!videoRef.current && videoAttempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        videoAttempts++;
        addDebugInfo(`⏳ Aguardando elemento video... tentativa ${videoAttempts}/20`);
      }

      if (!videoRef.current) {
        throw new Error('Elemento video não encontrado após 2s');
      }
      addDebugInfo('✅ Elemento video encontrado!');

      // Cria o BrowserMultiFormatReader (lógica que funcionava)
      addDebugInfo('🔧 Criando BrowserMultiFormatReader...');
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;
      addDebugInfo('✅ BrowserMultiFormatReader criado');

      // Inicia decodificação (LÓGICA ORIGINAL QUE FUNCIONAVA)
      addDebugInfo('🎬 Iniciando decodificação do video...');
      
      codeReader
        .decodeFromVideoDevice(
          undefined, // deviceId (usar padrão)
          videoRef.current, // elemento video
          (result, err) => {
            if (result && isMountedRef.current && !scanned) {
              const qrValue = result.getText();
              addDebugInfo(`🎯 QR LIDO: ${qrValue}`);
              handleQRResult(qrValue);
            }
            if (err && !result) {
              // Não loga erros normais de tentativa de leitura
              if (err.message && !err.message.includes('No MultiFormat Readers')) {
                addDebugInfo(`⚠️ Erro leitura: ${err.message}`);
              }
            }
          }
        )
        .then(() => {
          addDebugInfo('🎉 SCANNER ATIVO E FUNCIONANDO!');
          setIsScanning(true);
        })
        .catch((error) => {
          addDebugInfo(`💥 Erro ao iniciar: ${error.message}`);
          setError('Não foi possível acessar a câmera.');
        });

    } catch (error) {
      addDebugInfo(`💥 ERRO FATAL: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Para e limpa o scanner
   */
  const stopScanner = async () => {
    try {
      addDebugInfo('🛑 Parando scanner...');
      isMountedRef.current = false;
      
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
          addDebugInfo('✅ BrowserMultiFormatReader resetado');
        } catch (resetError) {
          addDebugInfo(`⚠️ Erro ao resetar: ${resetError}`);
        }
        codeReaderRef.current = null;
      }
      
      setIsScanning(false);
      setScanResult(null);
      setError(null);
      setScanned(false);
      setDebugInfo([]);
      
    } catch (error) {
      addDebugInfo(`💥 Erro ao parar: ${error}`);
    }
  };

  /**
   * Reinicia completamente
   */
  const restartScanner = () => {
    addDebugInfo('🔄 REINICIANDO COMPLETAMENTE...');
    stopScanner();
    setTimeout(() => {
      isMountedRef.current = true;
      initializeScanner();
    }, 500);
  };

  /**
   * Retoma scan
   */
  const restartScan = () => {
    setScanned(false);
    setScanResult(null);
    setError(null);
    initializeScanner();
  };

  // Effect para gerenciar ciclo de vida
  useEffect(() => {
    isMountedRef.current = true;
    
    if (isOpen) {
      // Delay para garantir renderização do video
      setTimeout(() => {
        initializeScanner();
      }, 500);
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white relative">
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
              <h2 className="text-lg font-bold">Scanner QR Final</h2>
              <p className="text-purple-100 text-sm">@zxing/browser (Lógica Original)</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Debug Info */}
          {debugInfo.length > 0 && (
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">🔍 Debug Scanner Final:</h4>
              <div className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index} className="font-mono break-words">{info}</div>
                ))}
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <ProfessionalLoader size="lg" className="mb-4" />
              <p className="text-gray-600 mb-2">Inicializando scanner final...</p>
              <p className="text-sm text-gray-500">
                Usando @zxing/browser + BrowserMultiFormatReader
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro Scanner Final</h3>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              
              <button
                onClick={restartScanner}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reiniciar Scanner Final</span>
              </button>
            </div>
          )}

          {/* Success State */}
          {scanResult && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎉 Ticket Encontrado!</h3>
              
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
                  <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded"></div>
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
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}

          {/* Scanner Area - Video Element (LÓGICA ORIGINAL) */}
          {!isLoading && !error && !scanResult && (
            <div className="space-y-4">
              
              {/* Video Container */}
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                  playsInline
                  muted
                />
                
                {/* Status Overlay */}
                {isScanning && (
                  <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium animate-pulse">
                    📹 ATIVO (ZXING)
                  </div>
                )}
                
                {/* Scanning Indicator */}
                {isScanning && (
                  <div className="absolute inset-0 border-2 border-purple-500 rounded-lg animate-pulse"></div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  📱 Aponte a câmera para o código QR
                </p>
                <p className="text-xs text-gray-500">
                  Scanner final com lógica original (@zxing/browser)
                </p>
              </div>
              
              {/* Manual Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={restartScanner}
                  className="flex-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center justify-center space-x-1 py-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reiniciar Final</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalQRScanner;