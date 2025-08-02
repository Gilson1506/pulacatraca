import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, QrCode } from 'lucide-react';
import QrScanner from 'qr-scanner';

const CheckInTestPage = () => {
  const [scannerActive, setScannerActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    console.log('🚀 CheckInTestPage V2.0 - Melhorias de câmera carregadas!');
    
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const startQRScanner = async () => {
    if (!videoRef.current) {
      console.error('❌ Elemento de vídeo não encontrado');
      alert('Erro interno: elemento de vídeo não encontrado');
      return;
    }

    try {
      console.log('📱 Iniciando scanner QR...');
      setScannerActive(true);
      setIsScanning(true);

      // Verificar se já existe um scanner ativo
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }

      // Solicitar permissões de câmera primeiro
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        // Parar o stream temporário (o QrScanner vai gerenciar)
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Permissões de câmera concedidas');
      } catch (permissionError) {
        console.error('❌ Erro de permissão de câmera:', permissionError);
        throw new Error('Permissão de câmera negada. Por favor, permita o acesso à câmera e tente novamente.');
      }
      
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        result => {
          console.log('📸 QR Code detectado:', result.data);
          alert(`QR Code detectado: ${result.data}`);
          stopQRScanner();
        },
        {
          onDecodeError: (error) => {
            // Silenciar erros de decodificação normais
          },
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        }
      );

      await qrScannerRef.current.start();
      setIsScanning(false);
      console.log('✅ Scanner QR iniciado com sucesso');
      
    } catch (error: any) {
      console.error('❌ Erro ao iniciar scanner:', error);
      let errorMessage = 'Erro ao acessar a câmera';
      
      if (error.message?.includes('Permission')) {
        errorMessage = 'Permissão de câmera negada. Verifique as configurações do navegador.';
      } else if (error.message?.includes('NotFoundError')) {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (error.message?.includes('NotAllowedError')) {
        errorMessage = 'Acesso à câmera foi negado. Permita o acesso e tente novamente.';
      } else if (error.message?.includes('NotReadableError')) {
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      setScannerActive(false);
      setIsScanning(false);
    }
  };

  const stopQRScanner = () => {
    console.log('⏹️ Parando scanner QR...');
    
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
        console.log('✅ Scanner QR parado');
      } catch (error) {
        console.error('Erro ao parar scanner:', error);
      }
    }
    
    setScannerActive(false);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Teste das Melhorias Check-in V2.0
          </h1>
          <p className="text-gray-600">
            Esta página demonstra as melhorias implementadas no sistema de check-in
          </p>
        </div>

        {/* Scanner QR - Melhorado */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-l-4 border-pink-500 max-w-2xl mx-auto">
          <div className="flex items-center space-x-2 mb-4">
            <QrCode className="h-6 w-6 text-pink-600" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Scanner QR Code 🚀 V2.0</h2>
          </div>
          
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-3 sm:p-6 text-center mb-4 border border-pink-200">
            {scannerActive ? (
              <div className="space-y-4">
                <div className="relative mx-auto max-w-xs sm:max-w-sm">
                  <video 
                    ref={videoRef}
                    className="w-full aspect-square rounded-lg shadow-lg border-2 border-pink-300 object-cover"
                    playsInline
                    muted
                  />
                  
                  {/* Overlay de scanning */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white rounded-lg shadow-lg">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-pink-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-pink-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-pink-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-pink-500 rounded-br-lg"></div>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="font-medium">ESCANEANDO</span>
                  </div>
                  
                  {/* Processing indicator */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="bg-white px-4 py-2 rounded-lg flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-gray-700">Processando...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Aponte a câmera para qualquer QR code</p>
                  <button
                    onClick={stopQRScanner}
                    disabled={isScanning}
                    className="bg-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center space-x-2 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none text-sm sm:text-base"
                  >
                    <CameraOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Parar Scanner</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <QrCode className="h-16 w-16 sm:h-20 sm:w-20 text-pink-400 mx-auto animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-pink-300 rounded-lg animate-ping opacity-30"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium text-sm sm:text-base">
                    {isScanning ? 'Iniciando câmera...' : 'Teste o scanner QR melhorado'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Permita o acesso à câmera quando solicitado
                  </p>
                </div>
                
                <button
                  onClick={startQRScanner}
                  disabled={isScanning}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-3 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm sm:text-base"
                >
                  {isScanning ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold">Carregando...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span className="font-semibold">Ativar Scanner QR</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Instruções - Responsivas */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <div className="bg-blue-100 rounded-full p-1 flex-shrink-0">
                <svg className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-medium text-blue-900">Melhorias V2.0:</h4>
                <ul className="text-xs sm:text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Interface 100% responsiva</li>
                  <li>• Overlay visual para scanning</li>
                  <li>• Melhor tratamento de permissões</li>
                  <li>• Botão gradiente rosa → roxo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-4 bg-white rounded-lg p-4 shadow-sm">
            <span className="text-green-600 font-semibold">✅ Deploy V2.0 Funcionando</span>
            <span className="text-gray-400">|</span>
            <span className="text-pink-600 font-semibold">🚀 Scanner Melhorado</span>
            <span className="text-gray-400">|</span>
            <span className="text-purple-600 font-semibold">📱 Totalmente Responsivo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInTestPage;