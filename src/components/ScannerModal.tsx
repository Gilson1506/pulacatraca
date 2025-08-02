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
      // Reset estados
      setError(null);
      setIsInitializing(false);
      
      console.log('🎯 Modal aberto - Elemento de vídeo sempre disponível');
      
      // Delay reduzido pois elemento sempre existe no DOM
      const timer = setTimeout(() => {
        if (isOpen) {
          console.log('🚀 Iniciando scanner...');
          startScanner();
        }
      }, 200); // Reduzido para 200ms pois elemento sempre existe
      
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      console.log('📱 Modal fechado - Parando scanner...');
      stopScanner();
    }
  }, [isOpen]);

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      setScanCount(0);

      console.log('🚀 Iniciando scanner ultra-rápido...');

      // Verificação simples - elemento sempre no DOM
      console.log('🔍 Verificando elemento de vídeo...');
      
      if (!videoRef.current) {
        throw new Error('❌ Referência de vídeo não encontrada. Feche e abra o scanner novamente.');
      }

      console.log('✅ Elemento de vídeo confirmado (sempre presente no DOM)');

      // Verificar suporte à câmera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera');
      }

      // Verificar dispositivos disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('Nenhuma câmera encontrada no dispositivo');
      }

      console.log(`📷 ${videoDevices.length} câmera(s) encontrada(s)`);

      // Configurações de câmera simplificadas e mais compatíveis
      const cameraConfigs = [
        // Configuração 1: Básica (mais compatível)
        { video: { facingMode: 'environment' } },
        // Configuração 2: Qualquer câmera
        { video: true },
        // Configuração 3: Câmera frontal
        { video: { facingMode: 'user' } }
      ];

      let stream = null;
      let lastError = null;

      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          console.log(`📷 Tentando acesso à câmera (método ${i + 1}/3)...`);
          stream = await navigator.mediaDevices.getUserMedia(cameraConfigs[i]);
          console.log(`✅ Câmera acessada com sucesso!`);
          break;
        } catch (err) {
          lastError = err;
          console.log(`⚠️ Método ${i + 1} falhou:`, err.message);
        }
      }

      if (!stream) {
        const errorMessage = lastError?.name === 'NotAllowedError' 
          ? 'Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.'
          : `Erro ao acessar câmera: ${lastError?.message || 'Dispositivo não suportado'}`;
        throw new Error(errorMessage);
      }

      // Configuração direta do stream de vídeo
      console.log('🔗 Configurando stream de vídeo...');
      
      try {
        // Configurar stream com proteção
        videoRef.current.srcObject = stream;
        console.log('✅ Stream configurado com sucesso');
        
        // Aguardar vídeo carregar
        await videoRef.current.play();
        console.log('📹 Vídeo reproduzindo perfeitamente');
        
      } catch (error) {
        // Se falhar, limpar tudo
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        throw new Error(`❌ Erro ao configurar vídeo: ${error.message}. Tente fechar e abrir o scanner novamente.`);
      }

      // Configuração ULTRA-RÁPIDA para leitura instantânea
      const qrScanner = new QrScannerLib(
        videoRef.current,
        (result) => {
          try {
            const qrData = typeof result === 'string' ? result : (result.data || result);
            console.log('⚡ QR DETECTADO INSTANTANEAMENTE:', qrData);
            
            // Parar scanner IMEDIATAMENTE (sem delay)
            qrScanner.stop();
            qrScanner.destroy();
            
            // Processar QR instantaneamente
            onScan(qrData);
            
            // Fechar modal instantaneamente
            onClose();
          } catch (error) {
            console.error('Erro ao processar QR:', error);
          }
        },
        {
          // CONFIGURAÇÕES ULTRA-RÁPIDAS
          preferredCamera: 'environment',
          highlightScanRegion: false,      // Performance máxima
          highlightCodeOutline: false,     // Performance máxima
          maxScansPerSecond: 60,           // TRIPLICADO: 60 scans/segundo
          returnDetailedScanResult: false, // Resultado direto
          // Área de scan AMPLIADA para captura mais fácil
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight) * 0.8; // Aumentado para 80%
            return {
              x: (video.videoWidth - size) / 2,
              y: (video.videoHeight - size) / 2,
              width: size,
              height: size,
            };
          },
          // SUPORTE AVANÇADO DE LEITURA
          onDecodeError: () => {
            // Silencioso - não logar erros de decode para máxima performance
          },
        }
      );

      qrScannerRef.current = qrScanner;

      // Iniciar scanner
      await qrScanner.start();

      setIsInitializing(false);
      console.log('✅ Scanner ultra-rápido ativo');

    } catch (error: any) {
      console.error('❌ Erro ao iniciar scanner:', error);
      
      let userFriendlyMessage = 'Erro ao acessar a câmera';
      
      if (error.name === 'NotAllowedError') {
        userFriendlyMessage = 'Permissão de câmera negada. Permita o acesso e tente novamente.';
      } else if (error.name === 'NotFoundError') {
        userFriendlyMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (error.name === 'NotReadableError') {
        userFriendlyMessage = 'Câmera está sendo usada por outro aplicativo.';
      } else if (error.name === 'OverconstrainedError') {
        userFriendlyMessage = 'Configuração de câmera não suportada neste dispositivo.';
      } else if (error.message?.includes('suporta')) {
        userFriendlyMessage = error.message;
      } else if (error.message?.includes('encontrada')) {
        userFriendlyMessage = error.message;
      } else {
        userFriendlyMessage = `${error.message || 'Erro desconhecido'}`;
      }
      
      setError(userFriendlyMessage);
      setIsInitializing(false);
    }
  };

  const stopScanner = () => {
    try {
      console.log('⏹️ Parando scanner...');
      
      // Parar QR Scanner
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        } catch (err) {
          console.warn('Erro ao parar QR scanner:', err);
        }
        qrScannerRef.current = null;
      }

      // Parar stream de vídeo
      if (videoRef.current) {
        try {
          if (videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach(track => {
                try {
                  track.stop();
                } catch (err) {
                  console.warn('Erro ao parar track:', err);
                }
              });
            }
            videoRef.current.srcObject = null;
          }
          
          // Limpar eventos
          videoRef.current.onloadedmetadata = null;
          videoRef.current.onerror = null;
        } catch (err) {
          console.warn('Erro ao limpar vídeo:', err);
        }
      }

      console.log('✅ Scanner parado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao parar scanner:', error);
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
          {/* Elemento de vídeo sempre presente no DOM (oculto quando necessário) */}
          <div className="relative mx-auto max-w-xs sm:max-w-sm">
            <video 
              ref={videoRef}
              className={`w-full aspect-square rounded-lg shadow-lg border-2 border-pink-300 object-cover ${
                error || isInitializing ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              playsInline
              muted
              autoPlay
            />
            
                          {/* Indicador de velocidade - só quando ativo */}
              {!error && !isInitializing && (
                <div className="absolute top-2 left-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg animate-pulse">
                  <Zap className="h-3 w-3" />
                  <span>ULTRA-RÁPIDO</span>
                </div>
              )}

            {/* Área de scan visual - só quando ativo */}
            {!error && !isInitializing && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white rounded-lg shadow-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pink-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-pink-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-pink-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-pink-500 rounded-br-lg"></div>
                </div>
              </div>
            )}
          </div>

          {/* Estados de UI sobrepostos */}
          {error && (
            // Erro - Overlay absoluto
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center rounded-lg">
              <div className="text-center py-4 px-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-red-600 font-medium mb-2">Erro de Câmera</p>
                <p className="text-xs text-gray-600 mb-4">{error}</p>
                <button
                  onClick={startScanner}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {isInitializing && (
            // Carregando - Overlay absoluto
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center rounded-lg">
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-pink-600 font-medium mb-1">Inicializando Câmera</p>
                <p className="text-xs text-gray-600">Aguarde um momento...</p>
              </div>
            </div>
          )}

          {/* Instruções e botões - só quando ativo */}
          {!error && !isInitializing && (
            <div className="space-y-4 mt-4">
              {/* Instruções */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Aponte a câmera para o QR code do ingresso
                </p>
                <p className="text-xs text-gray-500">
                  Leitura ultra-rápida (60 scans/segundo) + área ampliada
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