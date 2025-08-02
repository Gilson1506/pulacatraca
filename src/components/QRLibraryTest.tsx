import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRLibraryTest: React.FC = () => {
  const [libraryStatus, setLibraryStatus] = useState<string>('Verificando...');

  useEffect(() => {
    // Testa se a biblioteca está carregada
    try {
      console.log('🔍 Testando html5-qrcode library...');
      
      // Verifica se a classe existe
      if (typeof Html5QrcodeScanner === 'undefined') {
        setLibraryStatus('❌ Html5QrcodeScanner não encontrado');
        return;
      }
      
      // Verifica se pode criar uma instância
      try {
        const testElement = document.createElement('div');
        testElement.id = 'test-qr-reader';
        document.body.appendChild(testElement);
        
        const scanner = new Html5QrcodeScanner(
          'test-qr-reader',
          { fps: 10, qrbox: 250 },
          false
        );
        
        // Se chegou até aqui, a biblioteca está funcionando
        setLibraryStatus('✅ Html5QrcodeScanner funcionando');
        
        // Limpa o teste
        document.body.removeChild(testElement);
        
        console.log('✅ Biblioteca html5-qrcode OK');
        
      } catch (instanceError) {
        setLibraryStatus(`❌ Erro ao criar instância: ${instanceError}`);
        console.error('❌ Erro ao criar scanner:', instanceError);
      }
      
    } catch (error) {
      setLibraryStatus(`❌ Erro geral: ${error}`);
      console.error('❌ Erro biblioteca:', error);
    }
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-2">🔬 Teste da Biblioteca html5-qrcode</h3>
      <p className="text-sm text-gray-700">{libraryStatus}</p>
    </div>
  );
};

export default QRLibraryTest;