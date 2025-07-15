import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

const QrScanner: React.FC<{ onResult: (result: string) => void }> = ({ onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let isMounted = true;

    codeReader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, err) => {
          if (result && isMounted) {
            onResult(result.getText());
            codeReader.stopContinuousDecode();
          }
          if (err) {
            setError('Erro ao acessar a câmera ou ler o QR Code.');
          }
        }
      )
      .catch(() => setError('Não foi possível acessar a câmera.'));

    return () => {
      isMounted = false;
      codeReader.stopContinuousDecode();
    };
  }, [onResult]);

  return (
    <div>
      <video ref={videoRef} style={{ width: '100%' }} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default QrScanner; 