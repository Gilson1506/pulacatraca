import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar, RotateCcw, Eye } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';

interface UltraRobustQRScannerProps {
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

const UltraRobustQRScanner: React.FC<UltraRobustQRScannerProps> = ({
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
  
  // Refs
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const qrReaderElementId = "ultra-robust-qr-reader";

  /**
   * Adiciona informação de debug
   */
  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `${timestamp}: ${info}`;
    console.log(`🔍 UltraRobust: ${message}`);
    setDebugInfo(prev => [...prev.slice(-6), message]);
  };

  /**
   * Configuração ultra-simplificada
   */
  const getUltraSimpleConfig = () => {
    addDebugInfo('Criando configuração ultra-simples...');
    
    return {
      fps: 3, // Ainda mais reduzido
      qrbox: 200, // Menor para ser mais simples
      aspectRatio: 1.0,
      disableFlip: false,
      videoConstraints: {
        facingMode: "environment"
      },
      // Configurações mínimas
      formatsToSupport: [],
      showTorchButtonIfSupported: false,
      showZoomSliderIfSupported: false,
      experimentalFeatures: undefined
    };
  };

  /**
   * Aguarda elemento DOM usando MutationObserver
   */
  const waitForElement = (elementId: string): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
      addDebugInfo(`Aguardando elemento: ${elementId}`);
      
      // Verifica se já existe
      const existingElement = document.getElementById(elementId);
      if (existingElement) {
        addDebugInfo('Elemento encontrado imediatamente!');
        resolve(existingElement);
        return;
      }

      // Configura timeout
      const timeout = setTimeout(() => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
        addDebugInfo('Timeout: Elemento não encontrado em 10s');
        reject(new Error('Timeout: Elemento não encontrado'));
      }, 10000); // 10 segundos

      // Configura MutationObserver
      observerRef.current = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const element = document.getElementById(elementId);
            if (element) {
              addDebugInfo('Elemento detectado pelo MutationObserver!');
              clearTimeout(timeout);
              observerRef.current?.disconnect();
              resolve(element);
              return;
            }
          }
        }
      });

      // Inicia observação
      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      addDebugInfo('MutationObserver configurado e ativo');
    });
  };

  /**
   * Busca dados do ticket
   */
  const fetchTicketData = async (qrCode: string): Promise<TicketData | null> => {
    try {
      addDebugInfo(`Buscando ticket: ${qrCode}`);
      
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
        addDebugInfo(`Erro Supabase: ${error.message}`);
        throw new Error('Erro ao consultar banco de dados');
      }

      if (!data) {
        addDebugInfo('Ticket não encontrado no banco');
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

      addDebugInfo(`Ticket encontrado: ${ticketData.name}`);
      return ticketData;

    } catch (error) {
      addDebugInfo(`Erro na busca: ${error}`);
      throw error;
    }
  };

  /**
   * Callback quando QR é detectado
   */
  const onScanSuccess = async (decodedText: string, result: any) => {
    try {
      addDebugInfo(`QR DETECTADO: ${decodedText}`);
      
      // Para o scanner
      if (scannerRef.current) {
        scannerRef.current.pause(true);
        addDebugInfo('Scanner pausado para processamento');
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
        addDebugInfo('✅ SUCESSO: Ticket válido encontrado!');
        
        if (onSuccess) {
          onSuccess(decodedText, ticketData);
        }
      } else {
        setError('Código QR inválido ou ticket não encontrado');
        setScanResult(null);
        addDebugInfo('❌ ERRO: Ticket inválido');
        
        // Retoma após erro
        setTimeout(() => {
          if (scannerRef.current && isOpen) {
            scannerRef.current.resume();
            addDebugInfo('Scanner retomado após erro');
          }
        }, 3000);
      }

    } catch (error) {
      addDebugInfo(`❌ Erro no processamento: ${error}`);
      setError('Erro ao processar código QR. Tente novamente.');
      setScanResult(null);
      
      setTimeout(() => {
        if (scannerRef.current && isOpen) {
          scannerRef.current.resume();
        }
      }, 3000);
    }
  };

  /**
   * Callback para erros de scan
   */
  const onScanFailure = (error: string) => {
    // Log apenas 1 em cada 100 tentativas para evitar spam
    if (Math.random() < 0.01) {
      addDebugInfo(`Tentativa de scan: ${error.substring(0, 30)}...`);
    }
  };

  /**
   * Inicializa o scanner com máxima robustez
   */
  const initializeScanner = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addDebugInfo('🚀 INICIANDO SCANNER ULTRA-ROBUSTO...');
      
      // 1. Verifica ambiente seguro
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('Scanner requer HTTPS ou localhost');
      }
      addDebugInfo('✅ Ambiente seguro verificado');

      // 2. Testa acesso à câmera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        stream.getTracks().forEach(track => track.stop());
        addDebugInfo('✅ Teste de câmera: SUCESSO');
      } catch (cameraError) {
        addDebugInfo(`❌ Teste de câmera falhou: ${cameraError}`);
        throw new Error('Não foi possível acessar a câmera');
      }

      // 3. Aguarda elemento DOM com MutationObserver
      addDebugInfo('🔍 Aguardando elemento DOM...');
      const element = await waitForElement(qrReaderElementId);
      addDebugInfo('✅ Elemento DOM encontrado e disponível!');

      // 4. Aguarda um momento para estabilizar
      await new Promise(resolve => setTimeout(resolve, 500));
      addDebugInfo('⏱️ Aguardou estabilização (500ms)');

      // 5. Cria scanner
      addDebugInfo('🔧 Criando instância do scanner...');
      const scanner = new Html5QrcodeScanner(
        qrReaderElementId,
        getUltraSimpleConfig(),
        false // verbose = false
      );
      addDebugInfo('✅ Scanner criado com sucesso');

      // 6. Renderiza o scanner
      addDebugInfo('🎬 Renderizando scanner...');
      await scanner.render(onScanSuccess, onScanFailure);
      
      scannerRef.current = scanner;
      setIsScanning(true);
      addDebugInfo('🎉 SCANNER TOTALMENTE ATIVO E FUNCIONANDO!');

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
      
      // Para MutationObserver
      if (observerRef.current) {
        observerRef.current.disconnect();
        addDebugInfo('MutationObserver desconectado');
      }
      
      // Para scanner
      if (scannerRef.current) {
        await scannerRef.current.clear();
        scannerRef.current = null;
        addDebugInfo('Scanner limpo');
      }
      
      setIsScanning(false);
      setScanResult(null);
      setError(null);
      setDebugInfo([]);
      
    } catch (error) {
      addDebugInfo(`Erro ao parar: ${error}`);
    }
  };

  /**
   * Reinicia completamente
   */
  const restartScanner = () => {
    addDebugInfo('🔄 REINICIANDO COMPLETAMENTE...');
    setScanResult(null);
    setError(null);
    setDebugInfo([]);
    initializeScanner();
  };

  /**
   * Retoma scan
   */
  const restartScan = () => {
    setScanResult(null);
    setError(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
      addDebugInfo('Scanner retomado');
    }
  };

  // Effect para gerenciar ciclo de vida
  useEffect(() => {
    if (isOpen) {
      // Delay muito conservador para garantir renderização
      setTimeout(() => {
        initializeScanner();
      }, 1000); // 1 segundo
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden max-h-[90vh]" ref={containerRef}>
        
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
              <Eye className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Scanner Ultra-Robusto</h2>
              <p className="text-green-100 text-sm">MutationObserver + DOM Watching</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Debug Info - Mais detalhado */}
          {debugInfo.length > 0 && (
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">🔍 Debug Ultra-Detalhado:</h4>
              <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
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
              <p className="text-gray-600 mb-2">Inicializando scanner ultra-robusto...</p>
              <p className="text-sm text-gray-500">
                Testando câmera, aguardando DOM, configurando MutationObserver...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro Ultra-Scanner</h3>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              
              <div className="space-y-2">
                <button
                  onClick={restartScanner}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reiniciar Ultra-Scanner</span>
                </button>
                
                <p className="text-xs text-gray-500 mt-2">
                  Este scanner usa MutationObserver para aguardar o DOM
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {scanResult && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Ticket Encontrado!</h3>
              
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

          {/* Scanner Area */}
          {!isLoading && !error && !scanResult && (
            <div className="space-y-4">
              
              {/* QR Reader Container - Sempre visível */}
              <div className="relative">
                <div 
                  id={qrReaderElementId}
                  className="border-2 border-dashed border-green-300 rounded-lg overflow-hidden min-h-[300px] bg-green-50"
                />
                
                {/* Status Overlay */}
                {isScanning && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium animate-pulse">
                    🎯 ULTRA-ATIVO
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  🎯 Aponte a câmera para o código QR
                </p>
                <p className="text-xs text-gray-500">
                  Scanner ultra-robusto com MutationObserver
                </p>
              </div>
              
              {/* Manual Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={restartScanner}
                  className="flex-1 text-sm text-green-600 hover:text-green-700 font-medium transition-colors flex items-center justify-center space-x-1 py-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reiniciar Ultra</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UltraRobustQRScanner;