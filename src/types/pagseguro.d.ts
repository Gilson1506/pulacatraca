// Tipos para o SDK do PagBank/PagSeguro
interface PagSeguroEncryptCardParams {
  publicKey: string;
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
}

interface PagSeguroEncryptCardError {
  code: string;
  message: string;
}

interface PagSeguroEncryptCardResult {
  encryptedCard: string;
  hasErrors: boolean;
  errors: PagSeguroEncryptCardError[];
}

interface PagSeguroSDK {
  encryptCard(params: PagSeguroEncryptCardParams): PagSeguroEncryptCardResult;
}

interface Window {
  PagSeguro: PagSeguroSDK;
}

declare const PagSeguro: PagSeguroSDK;

