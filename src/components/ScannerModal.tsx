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
      
      // Delay para garantir renderização completa
      const timer = setTimeout(() => {
        if (isOpen && !error) {
          startScanner();
        }
      }, 300); // Aumentado para 300ms
      
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
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

      // Verificação simples e direta do elemento de vídeo
      if (!videoRef.current) {
        console.log('🔍 Aguardando elemento de vídeo...');
        
        // Aguardar elemento aparecer
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (videoRef.current) {
            console.log(`✅ Elemento encontrado após ${i + 1} tentativas`);
            break;
          }
        }
        
        if (!videoRef.current) {
          throw new Error('Elemento de vídeo não encontrado. Tente fechar e abrir o scanner novamente.');
        }
      }

      console.log('🎥 Elemento de vídeo pronto para configuração');

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

      // Configuração direta e simples do vídeo
      console.log('🔗 Configurando vídeo...');
      
      videoRef.current.srcObject = stream;
      
      // Aguardar vídeo carregar
      try {
        await videoRef.current.play();
        console.log('📹 Vídeo reproduzindo com sucesso');
      } catch (playError) {
        console.warn('⚠️ Erro ao reproduzir vídeo:', playError);
        // Continuar mesmo se play falhar - alguns browsers tem restrições
      }

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