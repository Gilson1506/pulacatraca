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
  // Estados simplificados
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Busca dados do ticket
   */
  const fetchTicketData = async (qrCode: string): Promise<TicketData | null> => {
    try {
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
        throw new Error('Erro ao consultar banco de dados');
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        event_title: data.tickets.events.event_title,
        ticket_type: data.tickets.ticket_type,
        qr_code: data.qr_code
      };

    } catch (error) {
      throw error;
    }
  };

  /**
   * Processa resultado do QR
   */
  const handleQRResult = async (qrValue: string) => {
    try {
      setScanned(true);
      
      // Para o scanner
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
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
        
        if (onSuccess) {
          onSuccess(qrValue, ticketData);
        }
      } else {
        setError('Código QR inválido ou ticket não encontrado');
        setScanResult(null);
        
        // Retoma após erro
        setTimeout(() => {
          setScanned(false);
          if (isMountedRef.current && isOpen) {
            initializeScanner();
          }
        }, 3000);
      }

    } catch (error) {
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
   * Inicializa o scanner - OTIMIZADO SEM DEBUG
   */
  const initializeScanner = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setScanned(false);
      
      // Verifica ambiente seguro
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('Scanner requer HTTPS ou localhost');
      }

      // Aguarda elemento video - SIMPLIFICADO
      if (!videoRef.current) {
        // Aguarda um pouco mais para renderização
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!videoRef.current) {
          throw new Error('Elemento de vídeo não encontrado');
        }
      }

      // Cria o BrowserMultiFormatReader
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Inicia decodificação
      await codeReader.decodeFromVideoDevice(
        undefined, // deviceId padrão
        videoRef.current, // elemento video
        (result, err) => {
          if (result && isMountedRef.current && !scanned) {
            const qrValue = result.getText();
            handleQRResult(qrValue);
          }
          // Ignora erros normais de tentativa de leitura
        }
      );
      
      setIsScanning(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar scanner';
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
      isMountedRef.current = false;
      
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (resetError) {
          // Ignora erros de reset
        }
        codeReaderRef.current = null;
      }
      
      setIsScanning(false);
      setScanResult(null);
      setError(null);
      setScanned(false);
      
    } catch (error) {
      // Ignora erros de cleanup
    }
  };

  /**
   * Reinicia completamente
   */
  const restartScanner = () => {
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

  // Effect otimizado
  useEffect(() => {
    isMountedRef.current = true;
    
    if (isOpen) {
      // Delay otimizado para renderização
      const timer = setTimeout(() => {
        initializeScanner();
      }, 800);
      
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

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
              <h2 className="text-lg font-bold">Scanner QR</h2>
              <p className="text-purple-100 text-sm">Detector de códigos QR</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <ProfessionalLoader size="lg" className="mb-4" />
              <p className="text-gray-600">Inicializando scanner...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro do Scanner</h3>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              
              <button
                onClick={restartScanner}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Tentar Novamente</span>
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

          {/* Scanner Area - SEMPRE RENDERIZADO */}
          {!isLoading && !error && !scanResult && (
            <div className="space-y-4">
              
              {/* Video Container - SEMPRE PRESENTE NO DOM */}
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                
                {/* Status Overlay */}
                {isScanning && (
                  <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium">
                    ATIVO
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
                  Aponte a câmera para o código QR
                </p>
                <p className="text-xs text-gray-500">
                  Scanner otimizado para máxima performance
                </p>
              </div>
              
              {/* Manual Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={restartScanner}
                  className="flex-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center justify-center space-x-1 py-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reiniciar</span>
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