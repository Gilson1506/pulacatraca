import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, Zap } from 'lucide-react';
import QrScannerLib from 'qr-scanner';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qrData: string) => void;
  title?: string;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ 
  isOpen, 
  onClose, 
  onScan,
  title = "Scanner QR Code"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScannerLib | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);

  // Inicializar scanner quando modal abrir
  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      setScanCount(0);

      console.log('🚀 Iniciando scanner ultra-rápido...');

      // Aguardar elemento de vídeo com mais tempo e tentativas
      let attempts = 0;
      const maxAttempts = 20;
      
      while (!videoRef.current && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
        console.log(`🔍 Aguardando elemento de vídeo... (${attempts}/${maxAttempts})`);
      }

      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado após aguardar');
      }

      // Solicitar acesso à câmera primeiro
      console.log('📷 Solicitando acesso à câmera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 640 }
        }
      });

      // Configurar o vídeo
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      console.log('📹 Vídeo configurado, iniciando scanner...');

      // Configuração otimizada para máxima velocidade
      const qrScanner = new QrScannerLib(
        videoRef.current,
        (result) => {
          try {
            const qrData = typeof result === 'string' ? result : (result.data || result);
            console.log('⚡ QR detectado:', qrData);
            
            // Parar scanner imediatamente
            qrScanner.stop();
            
            // Processar QR
            onScan(qrData);
            
            // Fechar modal
            onClose();
          } catch (error) {
            console.error('Erro ao processar QR:', error);
          }
        },
        {
          // Configurações para velocidade e confiabilidade
          preferredCamera: 'environment',
          highlightScanRegion: false,      // Desabilitar para performance
          highlightCodeOutline: false,     // Desabilitar para performance  
          maxScansPerSecond: 20,           // Velocidade otimizada
          returnDetailedScanResult: false, // Resultado simples
          // Área de scan otimizada
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight) * 0.6;
            return {
              x: (video.videoWidth - size) / 2,
              y: (video.videoHeight - size) / 2,
              width: size,
              height: size,
            };
          }
        }
      );

      qrScannerRef.current = qrScanner;

      // Iniciar scanner
      await qrScanner.start();

      setIsInitializing(false);
      console.log('✅ Scanner ultra-rápido ativo');

    } catch (error: any) {
      console.error('❌ Erro ao iniciar scanner:', error);
      setError(error.message || 'Erro ao acessar a câmera');
      setIsInitializing(false);
    }
  };

  const stopScanner = () => {
    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      console.log('⏹️ Scanner parado');
    } catch (error) {
      console.error('Erro ao parar scanner:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
              <Camera className="h-4 w-4 text-pink-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {error ? (
            // Erro
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-red-600 font-medium mb-2">Erro de Câmera</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={startScanner}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          ) : isInitializing ? (
            // Carregando
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-pink-600 font-medium mb-2">Inicializando Câmera</p>
              <p className="text-sm text-gray-600">Aguarde um momento...</p>
            </div>
          ) : (
            // Scanner Ativo
            <div className="space-y-4">
              <div className="relative mx-auto max-w-xs">
                <video 
                  ref={videoRef}
                  className="w-full aspect-square rounded-lg shadow-lg border-2 border-pink-300 object-cover"
                  playsInline
                  muted
                />
                
                {/* Indicador de velocidade */}
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                  <Zap className="h-3 w-3" />
                  <span>Rápido & Confiável</span>
                </div>

                {/* Área de scan visual */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white rounded-lg shadow-lg">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pink-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-pink-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-pink-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-pink-500 rounded-br-lg"></div>
                  </div>
                </div>
              </div>

              {/* Instruções */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Aponte a câmera para o QR code do ingresso
                </p>
                <p className="text-xs text-gray-500">
                  Detecção automática otimizada (20 scans/segundo)
                </p>
              </div>

              {/* Botão de cancelar */}
              <div className="flex justify-center">
                <button
                  onClick={onClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;