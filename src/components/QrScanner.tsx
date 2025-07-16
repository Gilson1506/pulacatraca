import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { CheckCircle, XCircle } from 'lucide-react';

const QrScanner: React.FC<{ onResult: (result: string) => void }> = ({ onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    let isMounted = true;

    codeReader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, err) => {
          if (result && isMounted && !scanned) {
            const value = result.getText();
            setQrValue(value);
            setScanned(true);
            // Exemplo de validação: válido se não for vazio e não for "DUPLICADO"
            const valid = value && value !== 'DUPLICADO';
            setIsValid(valid);
            setTimeout(() => {
              onResult(value);
            }, 1200); // Dá tempo de mostrar o feedback visual
            codeReader.reset();
          }
          if (err && !result) {
            setError('Erro ao acessar a câmera ou ler o QR Code.');
          }
        }
      )
      .catch(() => setError('Não foi possível acessar a câmera.'));

    return () => {
      isMounted = false;
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch {}
      }
    };
  }, [onResult, scanned]);

  const handleClose = () => {
    setScanned(false);
    setIsValid(null);
    setQrValue(null);
    setError(null);
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <video ref={videoRef} style={{ width: '100%', borderRadius: 12 }} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {scanned && (
        <div className="flex flex-col items-center mt-4 animate-fade-in">
          {isValid ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 animate-bounce" />
              <span className="text-green-700 font-bold text-lg mt-2">QR Code válido!</span>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 animate-shake" />
              <span className="text-red-700 font-bold text-lg mt-2">QR Code inválido!</span>
            </>
          )}
          <span className="text-gray-600 mt-2">{qrValue}</span>
        </div>
      )}
    </div>
  );
};

export default QrScanner;
