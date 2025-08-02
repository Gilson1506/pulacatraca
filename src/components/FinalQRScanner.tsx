import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar, RotateCcw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [domReady, setDomReady] = useState(false);
  
  // Refs DOM seguros
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const readerId = "qr-reader-element";

  /**
   * Debug info helper
   */
  const addDebugInfo = (info: string) => {
    console.log(`[FinalQRScanner] ${info}`);
    setDebugInfo(prev => prev + `\n${new Date().toLocaleTimeString()}: ${info}`);
  };

  /**
   * Busca dados do ticket
   */
  const fetchTicketData = async (qrCode: string): Promise<TicketData | null> => {
    try {
      addDebugInfo(`Buscando ticket com QR: ${qrCode}`);
      
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
        addDebugInfo(`Erro no banco: ${error.message}`);
        throw new Error('Erro ao consultar banco de dados');
      }
      
      if (!data) {
        addDebugInfo('Ticket não encontrado no banco');
        return null;
      }

      addDebugInfo('Ticket encontrado com sucesso');
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        event_title: data.tickets.events.event_title,
        ticket_type: data.tickets.ticket_type,
        qr_code: data.qr_code
      };
    } catch (error) {
      addDebugInfo(`Erro fetchTicketData: ${error}`);
      throw error;
    }
  };

  /**
   * Processa resultado do QR
   */
  const handleQRResult = useCallback(async (decodedText: string) => {
    if (scanned || !isMountedRef.current) {
      addDebugInfo('QR ignorado - já processado ou component desmontado');
      return;
    }
    
    try {
      addDebugInfo(`QR detectado: ${decodedText}`);
      setScanned(true);
      
      // Para o scanner
      if (scannerRef.current) {
        try {
          addDebugInfo('Parando scanner...');
          await scannerRef.current.stop();
        } catch (e) {
          addDebugInfo(`Erro ao parar scanner: ${e}`);
        }
      }
      
      // Feedback tátil
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Busca dados do ticket
      const ticketData = await fetchTicketData(decodedText);
      
      if (ticketData) {
        setScanResult(ticketData);
        setError(null);
        addDebugInfo('Sucesso - ticket processado');
        
        if (onSuccess) {
          onSuccess(decodedText, ticketData);
        }
      } else {
        setError('Código QR inválido ou ticket não encontrado');
        setScanResult(null);
        addDebugInfo('Erro - ticket não encontrado');
        
        // Retoma após erro
        setTimeout(() => {
          if (isMountedRef.current && isOpen) {
            setScanned(false);
            startScanner();
          }
        }, 3000);
      }
    } catch (error) {
      addDebugInfo(`Erro handleQRResult: ${error}`);
      setError('Erro ao processar código QR. Tente novamente.');
      setScanResult(null);
      
      setTimeout(() => {
        if (isMountedRef.current && isOpen) {
          setScanned(false);
          startScanner();
        }
      }, 3000);
    }
  }, [scanned, isOpen, onSuccess]);

  /**
   * Inicia o scanner - SOLUÇÃO DEFINITIVA COM SETTIMEOUT
   */
  const startScanner = useCallback(async () => {
    if (!isMountedRef.current || !domReady) {
      addDebugInfo('Componente desmontado ou DOM não pronto - abortando');
      return;
    }

    addDebugInfo('=== INICIANDO SCANNER ===');
    
    try {
      setIsLoading(true);
      setError(null);
      setScanned(false);
      
      // 1. Verifica ambiente seguro
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('Scanner requer HTTPS ou localhost');
      }
      addDebugInfo('✅ Ambiente seguro verificado');

      // 2. Para scanner anterior se existir
      if (scannerRef.current) {
        try {
          addDebugInfo('Limpando scanner anterior...');
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (e) {
          addDebugInfo(`Aviso ao limpar scanner: ${e}`);
        }
        scannerRef.current = null;
      }

      // 3. Verifica suporte a getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não suportado pelo navegador');
      }
      addDebugInfo('✅ getUserMedia suportado');

      // 4. Testa acesso à câmera
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        testStream.getTracks().forEach(track => track.stop());
        addDebugInfo('✅ Acesso à câmera confirmado');
      } catch (e) {
        addDebugInfo(`Erro de acesso à câmera: ${e}`);
        throw new Error('Erro ao acessar câmera. Verifique as permissões.');
      }

      addDebugInfo('Aguardando estabilidade total...');
      
      // 5. SOLUÇÃO DEFINITIVA: setTimeout para garantir DOM real
      setTimeout(async () => {
        try {
          if (!isMountedRef.current) {
            addDebugInfo('Componente desmontado durante setTimeout');
            return;
          }

          // 6. Verifica se elemento existe via document.getElementById
          const domElement = document.getElementById(readerId);
          if (!domElement || !readerRef.current) {
            throw new Error('Elemento DOM não encontrado via getElementById');
          }
          addDebugInfo(`✅ Elemento encontrado via getElementById: ${readerId}`);

          // 7. Cria Html5Qrcode usando ID
          addDebugInfo(`Criando Html5Qrcode com elemento: ${readerId}`);
          scannerRef.current = new Html5Qrcode(readerId);
          addDebugInfo('✅ Html5Qrcode criado com sucesso');
          
          // 8. Configuração robusta
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
            rememberLastUsedCamera: true
          };

          addDebugInfo('Iniciando scanner com configuração...');

          // 9. Inicia scanner
          await scannerRef.current.start(
            { 
              facingMode: "environment"
            },
            config,
            (decodedText) => {
              addDebugInfo(`✅ QR LIDO: ${decodedText.substring(0, 20)}...`);
              if (!scanned && isMountedRef.current) {
                handleQRResult(decodedText);
              }
            },
            (error) => {
              // Erro na leitura (normal durante tentativas)
            }
          );
          
          if (isMountedRef.current) {
            setIsScanning(true);
            setIsLoading(false);
            addDebugInfo('✅ Scanner iniciado com sucesso - TUDO OK!');
          }

        } catch (error) {
          addDebugInfo(`❌ Erro no setTimeout: ${error}`);
          if (isMountedRef.current) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar scanner';
            setError(errorMessage);
            setIsLoading(false);
          }
        }
      }, 100); // Tempo ideal para estabilizar DOM real

    } catch (error) {
      addDebugInfo(`❌ Erro startScanner: ${error}`);
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar scanner';
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [handleQRResult, scanned, domReady]);

  /**
   * Para e limpa o scanner
   */
  const stopScanner = useCallback(async () => {
    addDebugInfo('=== PARANDO SCANNER ===');
    isMountedRef.current = false;
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        addDebugInfo('Scanner parado e limpo');
      } catch (err) {
        addDebugInfo(`Erro ao parar scanner: ${err}`);
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setScanned(false);
    setDomReady(false);
  }, []);

  /**
   * Reinicia completamente
   */
  const restartScanner = useCallback(() => {
    addDebugInfo('=== REINICIANDO SCANNER ===');
    setDebugInfo(''); // Limpa debug info
    stopScanner();
    setTimeout(() => {
      isMountedRef.current = true;
      if (domReady) {
        startScanner();
      }
    }, 1000);
  }, [stopScanner, startScanner, domReady]);

  /**
   * Retoma scan
   */
  const restartScan = useCallback(() => {
    addDebugInfo('=== RETOMANDO SCAN ===');
    setScanned(false);
    setScanResult(null);
    setError(null);
    startScanner();
  }, [startScanner]);

  /**
   * Callback do ref para detectar DOM pronto
   */
  const handleRefCallback = useCallback((element: HTMLDivElement | null) => {
    readerRef.current = element;
    if (element) {
      addDebugInfo('✅ Elemento DOM completamente renderizado via ref callback');
      setDomReady(true);
    } else {
      addDebugInfo('Aguardando elemento DOM ser renderizado...');
      setDomReady(false);
    }
  }, []);

  // Effect principal - aguarda DOM estar pronto
  useEffect(() => {
    isMountedRef.current = true;
    
    if (isOpen && domReady) {
      addDebugInfo('Modal aberto e DOM pronto - iniciando scanner');
      const timer = setTimeout(() => {
        startScanner();
      }, 200); // Delay menor já que temos setTimeout interno
      
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      addDebugInfo('Modal fechado - parando scanner');
      stopScanner();
    }
  }, [isOpen, domReady, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      addDebugInfo('Componente desmontando');
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white relative">
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
              <p className="text-green-100 text-sm">HTML5 com setTimeout Fix</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* QR Reader Container - SEMPRE PRESENTE NO DOM */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <div
                id={readerId}
                ref={handleRefCallback}
                className="w-full min-h-[300px] border-2 border-dashed border-green-300 rounded-lg bg-green-50 flex items-center justify-center"
              />
              
              {/* Status DOM */}
              {!domReady && (
                <div className="absolute inset-0 bg-green-50 bg-opacity-90 flex items-center justify-center">
                  <p className="text-green-600 text-sm font-medium">Preparando DOM...</p>
                </div>
              )}
              
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                  <div className="text-center">
                    <ProfessionalLoader size="lg" className="mb-4" />
                    <p className="text-gray-600">Inicializando scanner...</p>
                    <p className="text-xs text-gray-500 mt-2">Aguardando DOM + setTimeout</p>
                  </div>
                </div>
              )}
              
              {/* Status Overlay */}
              {isScanning && (
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                  ATIVO
                </div>
              )}
              
              {/* Scanning Indicator */}
              {isScanning && (
                <div className="absolute inset-0 border-2 border-green-500 rounded-lg animate-pulse pointer-events-none"></div>
              )}
            </div>
            
            {/* Instructions */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Aponte a câmera para o código QR
              </p>
              <p className="text-xs text-gray-500">
                Scanner com setTimeout fix - DOM: {domReady ? '✅' : '⏳'}
              </p>
            </div>
            
            {/* Debug Info */}
            {debugInfo && (
              <div className="bg-gray-100 rounded p-2">
                <p className="text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {debugInfo.split('\n').slice(-6).join('\n')}
                </p>
              </div>
            )}
            
            {/* Manual Controls */}
            <div className="flex space-x-3">
              <button
                onClick={restartScanner}
                disabled={!domReady}
                className="flex-1 text-sm text-green-600 hover:text-green-700 font-medium transition-colors flex items-center justify-center space-x-1 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
          
          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro do Scanner</h3>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              
              {/* Debug Info */}
              {debugInfo && (
                <div className="bg-gray-100 rounded p-2 mb-4 text-left">
                  <p className="text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {debugInfo}
                  </p>
                </div>
              )}
              
              <button
                onClick={restartScanner}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
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
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Concluir
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