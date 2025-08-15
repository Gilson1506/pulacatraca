import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, AlertTriangle, Info, Wifi, Lock } from 'lucide-react';

interface CameraDiagnosticProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

const CameraDiagnostic: React.FC<CameraDiagnosticProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  /**
   * Executa todos os testes de diagnóstico
   */
  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // 1. Teste de HTTPS
    try {
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      diagnosticResults.push({
        test: 'Protocolo HTTPS',
        status: isSecure ? 'success' : 'error',
        message: isSecure ? 'Site está em HTTPS ou localhost' : 'Câmera requer HTTPS para funcionar',
        details: `Protocolo atual: ${window.location.protocol}`
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'Protocolo HTTPS',
        status: 'error',
        message: 'Erro ao verificar protocolo',
        details: String(error)
      });
    }

    // 2. Teste de suporte do navegador
    try {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      diagnosticResults.push({
        test: 'Suporte do Navegador',
        status: hasGetUserMedia ? 'success' : 'error',
        message: hasGetUserMedia ? 'Navegador suporta acesso à câmera' : 'Navegador não suporta getUserMedia',
        details: `Navigator: ${navigator.userAgent.split(' ')[0]}`
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'Suporte do Navegador',
        status: 'error',
        message: 'Erro ao verificar suporte',
        details: String(error)
      });
    }

    // 3. Teste de permissões
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      let status: 'success' | 'error' | 'warning' = 'success';
      let message = '';
      
      switch (permission.state) {
        case 'granted':
          status = 'success';
          message = 'Permissão da câmera concedida';
          break;
        case 'denied':
          status = 'error';
          message = 'Permissão da câmera negada';
          break;
        case 'prompt':
          status = 'warning';
          message = 'Permissão da câmera será solicitada';
          break;
      }
      
      diagnosticResults.push({
        test: 'Permissões de Câmera',
        status,
        message,
        details: `Estado: ${permission.state}`
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'Permissões de Câmera',
        status: 'warning',
        message: 'Não foi possível verificar permissões',
        details: String(error)
      });
    }

    // 4. Teste de acesso direto à câmera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Obter informações sobre o stream
      const videoTracks = stream.getVideoTracks();
      const track = videoTracks[0];
      const settings = track.getSettings();
      
      // Para o stream
      stream.getTracks().forEach(track => track.stop());
      
      diagnosticResults.push({
        test: 'Acesso à Câmera',
        status: 'success',
        message: 'Câmera acessada com sucesso',
        details: `Resolução: ${settings.width}x${settings.height}, Device: ${track.label || 'Câmera'}`
      });
    } catch (error: any) {
      let message = 'Erro ao acessar câmera';
      let details = String(error);
      
      if (error.name === 'NotAllowedError') {
        message = 'Permissão negada pelo usuário';
        details = 'Clique no ícone de câmera na barra de endereços e permita o acesso';
      } else if (error.name === 'NotFoundError') {
        message = 'Nenhuma câmera encontrada';
        details = 'Verifique se há uma câmera conectada ao dispositivo';
      } else if (error.name === 'NotReadableError') {
        message = 'Câmera está sendo usada por outro aplicativo';
        details = 'Feche outros aplicativos que podem estar usando a câmera';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Configurações de câmera não suportadas';
        details = 'Tente com configurações diferentes';
      }
      
      diagnosticResults.push({
        test: 'Acesso à Câmera',
        status: 'error',
        message,
        details
      });
    }

    // 5. Teste de dispositivos disponíveis
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      diagnosticResults.push({
        test: 'Dispositivos de Vídeo',
        status: videoDevices.length > 0 ? 'success' : 'warning',
        message: `${videoDevices.length} dispositivo(s) de vídeo encontrado(s)`,
        details: videoDevices.map(device => device.label || 'Câmera').join(', ')
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'Dispositivos de Vídeo',
        status: 'error',
        message: 'Erro ao listar dispositivos',
        details: String(error)
      });
    }

    // 6. Teste de bibliotecas
    try {
      const html5QrcodeAvailable = typeof window !== 'undefined' && 
                                  !!(window as any).Html5QrcodeScanner;
      
      diagnosticResults.push({
        test: 'Biblioteca html5-qrcode',
        status: html5QrcodeAvailable ? 'success' : 'warning',
        message: html5QrcodeAvailable ? 'Biblioteca carregada corretamente' : 'Biblioteca pode não estar carregada',
        details: 'Necessária para o scanner QR funcionar'
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'Biblioteca html5-qrcode',
        status: 'error',
        message: 'Erro ao verificar biblioteca',
        details: String(error)
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  // Executa diagnósticos ao abrir
  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Diagnóstico de Câmera</h2>
                <p className="text-blue-100 text-sm">Verificação de compatibilidade</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Status Geral */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Resultado Geral</h3>
            
            {isRunning ? (
              <div className="flex items-center space-x-3 text-blue-600">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Executando diagnósticos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['success', 'error', 'warning', 'info'].map(status => {
                  const count = results.filter(r => r.status === status).length;
                  return (
                    <div key={status} className={`p-3 rounded-lg border ${getStatusColor(status as any)}`}>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(status as any)}
                        <span className="font-semibold">{count}</span>
                      </div>
                      <p className="text-sm mt-1 capitalize">{status === 'success' ? 'Sucessos' : status === 'error' ? 'Erros' : status === 'warning' ? 'Avisos' : 'Infos'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalhes dos Testes */}
          {!isRunning && results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalhes dos Testes</h3>
              
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{result.test}</h4>
                        <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                        {result.details && (
                          <p className="text-xs text-gray-600 mt-2 font-mono bg-gray-100 p-2 rounded">
                            {result.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Soluções Sugeridas */}
          {!isRunning && results.some(r => r.status === 'error') && (
            <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-3">🛠️ Soluções Sugeridas</h3>
              <ul className="text-sm text-orange-800 space-y-2">
                <li>• <strong>HTTPS:</strong> Use HTTPS em produção ou localhost para desenvolvimento</li>
                <li>• <strong>Permissões:</strong> Clique no ícone de câmera na barra de endereços e permita o acesso</li>
                <li>• <strong>Conflitos:</strong> Feche outros aplicativos que podem estar usando a câmera</li>
                <li>• <strong>Hardware:</strong> Verifique se há uma câmera conectada e funcionando</li>
                <li>• <strong>Navegador:</strong> Use Chrome, Firefox ou Safari atualizados</li>
                <li>• <strong>Recarregar:</strong> Recarregue a página após conceder permissões</li>
              </ul>
            </div>
          )}

          {/* Informações do Sistema */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Informações do Sistema</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>URL:</strong> {window.location.href}</p>
              <p><strong>Protocolo:</strong> {window.location.protocol}</p>
              <p><strong>Host:</strong> {window.location.hostname}</p>
              <p><strong>Navegador:</strong> {navigator.userAgent.split(' ')[0]}</p>
              <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isRunning ? 'Executando...' : 'Executar Novamente'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDiagnostic;