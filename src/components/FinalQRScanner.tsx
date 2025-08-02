import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isMountedRef = useRef(true);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      if (error) throw new Error('Erro ao consultar banco de dados');
      if (!data) return null;

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
  const handleQRResult = useCallback(async (qrValue: string) => {
    if (scanned) return; // Evita múltiplos processamentos
    
    try {
      setScanned(true);
      
      // Para o scanner
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch {}
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
          if (isMountedRef.current && isOpen) {
            setScanned(false);
            initializeScanner();
          }
        }, 3000);
      }
    } catch (error) {
      setError('Erro ao processar código QR. Tente novamente.');
      setScanResult(null);
      
      setTimeout(() => {
        if (isMountedRef.current && isOpen) {
          setScanned(false);
          initializeScanner();
        }
      }, 3000);
    }
  }, [scanned, isOpen, onSuccess]);

  /**
   * Aguarda vídeo estar pronto
   */
  const waitForVideo = (): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: Elemento de vídeo não encontrado'));
      }, 5000);

      const checkVideo = () => {
        if (videoRef.current && videoReady) {
          clearTimeout(timeout);
          resolve(videoRef.current);
        } else {
          setTimeout(checkVideo, 100);
        }
      };

      checkVideo();
    });
  };

  /**
   * Inicializa o scanner de forma ultra-robusta
   */
  const initializeScanner = useCallback(async () => {
    if (!isMountedRef.current || !isOpen) return;
    
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

      // Aguarda vídeo estar pronto
      const videoElement = await waitForVideo();
      
      if (!isMountedRef.current) return; // Check se ainda está montado

      // Para qualquer scanner anterior
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch {}
        codeReaderRef.current = null;
      }

      // Cria novo BrowserMultiFormatReader
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Inicia decodificação
      await codeReader.decodeFromVideoDevice(
        undefined, // deviceId padrão
        videoElement,
        (result, err) => {
          if (result && isMountedRef.current && !scanned) {
            const qrValue = result.getText();
            handleQRResult(qrValue);
          }
        }
      );
      
      if (isMountedRef.current) {
        setIsScanning(true);
      }

    } catch (error) {
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar scanner';
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isOpen, videoReady, handleQRResult, scanned]);

  /**
   * Para e limpa o scanner
   */
  const stopScanner = useCallback(async () => {
    isMountedRef.current = false;
    
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
      codeReaderRef.current = null;
    }
    
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setScanned(false);
    setVideoReady(false);
  }, []);

  /**
   * Reinicia completamente
   */
  const restartScanner = useCallback(() => {
    stopScanner();
    setTimeout(() => {
      isMountedRef.current = true;
      if (videoReady) {
        initializeScanner();
      }
    }, 1000);
  }, [stopScanner, initializeScanner, videoReady]);

  /**
   * Retoma scan
   */
  const restartScan = useCallback(() => {
    setScanned(false);
    setScanResult(null);
    setError(null);
    if (videoReady) {
      initializeScanner();
    }
  }, [initializeScanner, videoReady]);

  /**
   * Handler quando vídeo está carregado
   */
  const handleVideoLoaded = useCallback(() => {
    setVideoReady(true);
  }, []);

  // Effect principal
  useEffect(() => {
    isMountedRef.current = true;
    
    if (isOpen && videoReady) {
      // Aguarda um pouco para garantir que tudo está pronto
      initTimeoutRef.current = setTimeout(() => {
        initializeScanner();
      }, 1500);
    } else if (!isOpen) {
      stopScanner();
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isOpen, videoReady, initializeScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

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
              <p className="text-purple-100 text-sm">Detector ultra-robusto</p>
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
              {!videoReady && (
                <p className="text-sm text-gray-500 mt-2">Aguardando vídeo...</p>
              )}
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
              
              {/* Video Container - SEMPRE PRESENTE */}
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                  playsInline
                  muted
                  autoPlay
                  onLoadedMetadata={handleVideoLoaded}
                  onCanPlay={handleVideoLoaded}
                />
                
                {/* Video Ready Indicator */}
                {!videoReady && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-sm">Preparando vídeo...</div>
                  </div>
                )}
                
                {/* Status Overlay */}
                {isScanning && videoReady && (
                  <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium">
                    ATIVO
                  </div>
                )}
                
                {/* Scanning Indicator */}
                {isScanning && videoReady && (
                  <div className="absolute inset-0 border-2 border-purple-500 rounded-lg animate-pulse"></div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Aponte a câmera para o código QR
                </p>
                <p className="text-xs text-gray-500">
                  {videoReady ? 'Scanner pronto para uso' : 'Aguardando vídeo carregar...'}
                </p>
              </div>
              
              {/* Manual Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={restartScanner}
                  disabled={!videoReady}
                  className="flex-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center justify-center space-x-1 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
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