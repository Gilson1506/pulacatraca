import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertTriangle, CheckCircle, User, Calendar, RotateCcw } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';

interface SimplifiedQRScannerProps {
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

const SimplifiedQRScanner: React.FC<SimplifiedQRScannerProps> = ({
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
  const qrReaderElementId = "simplified-qr-reader";

  /**
   * Adiciona informação de debug
   */
  const addDebugInfo = (info: string) => {
    console.log(`🔍 Debug: ${info}`);
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  /**
   * Configuração simplificada e robusta
   */
  const getSimplifiedConfig = () => {
    addDebugInfo('Configurando scanner...');
    
    return {
      fps: 5, // Reduzido para evitar sobrecarga
      qrbox: 250, // Simplificado
      aspectRatio: 1.0,
      disableFlip: false,
      // Configuração mínima para máxima compatibilidade
      videoConstraints: {
        facingMode: "environment"
      },
      // Configurações removidas que podem causar problemas
      formatsToSupport: [], // Auto-detect
      experimentalFeatures: undefined, // Removido para compatibilidade
      showTorchButtonIfSupported: false, // Desabilitado para simplicidade
      showZoomSliderIfSupported: false
    };
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
        addDebugInfo('Ticket não encontrado');
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
      addDebugInfo(`Erro busca: ${error}`);
      throw error;
    }
  };

  /**
   * Callback quando QR é detectado
   */
  const onScanSuccess = async (decodedText: string, result: any) => {
    try {
      addDebugInfo(`QR detectado: ${decodedText}`);
      
      // Para o scanner
      if (scannerRef.current) {
        scannerRef.current.pause(true);
        addDebugInfo('Scanner pausado');
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
        addDebugInfo('Sucesso - ticket válido');
        
        if (onSuccess) {
          onSuccess(decodedText, ticketData);
        }
      } else {
        setError('Código inválido ou ticket não encontrado');
        setScanResult(null);
        addDebugInfo('Erro - ticket inválido');
        
        // Retoma após erro
        setTimeout(() => {
          if (scannerRef.current && isOpen) {
            scannerRef.current.resume();
            addDebugInfo('Scanner retomado após erro');
          }
        }, 3000);
      }

    } catch (error) {
      addDebugInfo(`Erro processamento: ${error}`);
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
   * Callback para erros de scan (agora com log)
   */
  const onScanFailure = (error: string) => {
    // Log ocasional para debugging (não spam)
    if (Math.random() < 0.01) { // 1% das tentativas
      addDebugInfo(`Scan attempt: ${error.substring(0, 50)}...`);
    }
  };

  /**
   * Inicializa o scanner
   */
  const initializeScanner = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addDebugInfo('Iniciando scanner...');
      
      // Verifica se está em ambiente seguro
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('Scanner requer HTTPS ou localhost');
      }
      
      addDebugInfo('Ambiente seguro verificado');

      // Testa acesso à câmera primeiro
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        
        // Para o stream de teste
        stream.getTracks().forEach(track => track.stop());
        addDebugInfo('Teste de câmera: OK');
      } catch (cameraError) {
        addDebugInfo(`Teste de câmera falhou: ${cameraError}`);
        throw new Error('Não foi possível acessar a câmera');
      }

      // Aguarda elemento DOM com retry
      let element = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!element && attempts < maxAttempts) {
        element = document.getElementById(qrReaderElementId);
        if (!element) {
          addDebugInfo(`Aguardando elemento DOM... tentativa ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
      }
      
      if (!element) {
        addDebugInfo('Elemento DOM não encontrado após várias tentativas');
        throw new Error('Elemento scanner não encontrado');
      }
      
      addDebugInfo('Elemento DOM encontrado');

      // Cria scanner com configuração simplificada
      const scanner = new Html5QrcodeScanner(
        qrReaderElementId,
        getSimplifiedConfig(),
        false // verbose = false
      );
      
      addDebugInfo('Scanner criado');

      // Aguarda um momento antes de renderizar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Renderiza o scanner
      scanner.render(onScanSuccess, onScanFailure);
      
      scannerRef.current = scanner;
      setIsScanning(true);
      addDebugInfo('Scanner renderizado e ativo');

    } catch (error) {
      addDebugInfo(`Erro inicialização: ${error}`);
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
   * Reinicia o scanner
   */
  const restartScanner = () => {
    addDebugInfo('Reiniciando scanner...');
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
      // Delay inicial para garantir renderização completa
      setTimeout(() => {
        initializeScanner();
      }, 300);
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
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white relative">
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
              <h2 className="text-lg font-bold">Scanner QR Simplificado</h2>
              <p className="text-blue-100 text-sm">Versão de diagnóstico</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Debug Info */}
          {debugInfo.length > 0 && (
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">🔍 Debug Info:</h4>
              <div className="text-xs text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index} className="font-mono">{info}</div>
                ))}
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <ProfessionalLoader size="lg" className="mb-4" />
              <p className="text-gray-600">Inicializando scanner...</p>
              <p className="text-sm text-gray-500 mt-2">Aguarde, testando configurações...</p>
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
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reiniciar Scanner</span>
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
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
                  className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden min-h-[300px] bg-gray-50"
                />
                
                {/* Status Overlay */}
                {isScanning && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                    ATIVO
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Aponte a câmera para o código QR
                </p>
                <p className="text-xs text-gray-500">
                  Versão simplificada para máxima compatibilidade
                </p>
              </div>
              
              {/* Manual Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={restartScanner}
                  className="flex-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center justify-center space-x-1 py-2"
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

export default SimplifiedQRScanner;