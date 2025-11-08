// Tipos para integração com Pagar.me v5
// Baseado na documentação oficial: https://docs.pagar.me/docs/overview-transacao

// =====================================================
// TIPOS DE PEDIDO (ORDER)
// =====================================================

export interface PagarmeOrder {
  id?: string;
  code: string; // Código de referência do pedido
  amount: number; // Valor total em centavos
  currency: string; // Moeda (BRL)
  items: PagarmeOrderItem[];
  customer: PagarmeCustomer;
  payments: PagarmePayment[];
  billing_address?: PagarmeAddress;
  shipping?: PagarmeShipping;
  session_id?: string; // Para antifraude
  ip?: string; // IP do cliente
  location?: PagarmeLocation; // Dados de localização
  device?: PagarmeDevice; // Dados do dispositivo
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

export interface PagarmeOrderItem {
  amount: number; // Valor em centavos
  description: string;
  quantity: number;
  code: string; // Código do item
  category?: string;
  brand?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
}

// =====================================================
// TIPOS DE CLIENTE (CUSTOMER)
// =====================================================

export interface PagarmeCustomer {
  id?: string;
  name: string;
  email: string;
  type: 'individual' | 'company';
  document: string; // CPF ou CNPJ
  document_type: 'cpf' | 'cnpj';
  phone_numbers: string[];
  address?: PagarmeAddress;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface PagarmeAddress {
  street: string;
  number: string;
  complement?: string;
  zip_code: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  metadata?: Record<string, any>;
}

// =====================================================
// TIPOS DE PAGAMENTO (PAYMENTS)
// =====================================================

export interface PagarmePayment {
  id?: string;
  payment_method: 'credit_card' | 'debit_card' | 'pix' | 'voucher';
  credit_card?: PagarmeCreditCard;
  debit_card?: PagarmeDebitCard;
  pix?: PagarmePix;
  voucher?: PagarmeVoucher;
  amount: number; // Valor em centavos
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// CARTÃO DE CRÉDITO
// =====================================================

export interface PagarmeCreditCard {
  operation_type?: 'auth_and_capture' | 'auth_only' | 'pre_auth';
  installments: number;
  statement_descriptor?: string;
  card: PagarmeCard;
  card_token_id?: string;
  recurrence?: boolean;
  capture?: boolean;
  postback_url?: string;
  antifraud?: PagarmeAntifraud;
  metadata?: Record<string, any>;
}

export interface PagarmeCard {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  brand?: string;
  label?: string;
  billing_address?: PagarmeAddress;
  options?: {
    verify_card?: boolean;
  };
}

// =====================================================
// CARTÃO DE DÉBITO
// =====================================================

export interface PagarmeDebitCard {
  statement_descriptor?: string;
  card: PagarmeCard;
  card_token_id?: string;
  recurrence?: boolean;
  postback_url?: string;
  antifraud?: PagarmeAntifraud;
  metadata?: Record<string, any>;
}


// =====================================================
// PIX
// =====================================================
  our_bank?: string;
  document_number_type?: 'cpf' | 'cnpj';
  metadata?: Record<string, any>;
}

// =====================================================
// PIX
// =====================================================

export interface PagarmePix {
  expiration_date?: string; // Data de expiração
  additional_information?: Array<{
    name: string;
    value: string;
  }>;
  metadata?: Record<string, any>;
}

// =====================================================
// VOUCHER
// =====================================================

export interface PagarmeVoucher {
  statement_descriptor?: string;
  card: PagarmeCard;
  card_token_id?: string;
  recurrence?: boolean;
  postback_url?: string;
  antifraud?: PagarmeAntifraud;
  metadata?: Record<string, any>;
}

// =====================================================
// ANTIFRAUDE
// =====================================================

export interface PagarmeAntifraud {
  type: 'clearsale' | 'sift';
  clearsale?: {
    custom_sla: string;
  };
  sift?: {
    session_id: string;
    event: string;
    event_time: number;
    page_title: string;
    page_url: string;
    referrer_url?: string;
    user_email: string;
    user_phone?: string;
    user_name?: string;
    user_id?: string;
    amount?: number;
    currency?: string;
    payment_method_type?: string;
    payment_gateway?: string;
    risk_score?: number;
    ip?: string;
    user_agent?: string;
    location?: PagarmeLocation;
    device?: PagarmeDevice;
  };
}

// =====================================================
// LOCALIZAÇÃO E DISPOSITIVO
// =====================================================

export interface PagarmeLocation {
  latitude: number;
  longitude: number;
}

export interface PagarmeDevice {
  platform: string;
  user_agent: string;
  fingerprint?: string;
}

// =====================================================
// ENVIO (SHIPPING)
// =====================================================

export interface PagarmeShipping {
  amount: number; // Valor do frete em centavos
  description: string;
  recipient_name: string;
  recipient_phone: string;
  address: PagarmeAddress;
  max_delivery_date?: string;
  estimated_delivery_date?: string;
  type: 'flat' | 'free' | 'grid' | 'tiered' | 'weight';
  metadata?: Record<string, any>;
}

// =====================================================
// RESPOSTAS DA API
// =====================================================

export interface PagarmeApiResponse<T> {
  data: T;
  errors?: PagarmeError[];
}

export interface PagarmeError {
  type: string;
  message: string;
  parameter_name?: string;
}

export interface PagarmeOrderResponse {
  id: string;
  code: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  items: PagarmeOrderItem[];
  customer: PagarmeCustomer;
  payments: PagarmePaymentResponse[];
  billing_address?: PagarmeAddress;
  shipping?: PagarmeShipping;
  metadata?: Record<string, any>;
}

export interface PagarmePaymentResponse {
  id: string;
  payment_method: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  credit_card?: {
    installments: number;
    statement_descriptor: string;
    acquirer_name: string;
    acquirer_tid: string;
    brand: string;
    last_four_digits: string;
    operation_type: string;
    capture: boolean;
    authorization_code: string;
    statement_descriptor: string;
    acquirer_message: string;
    acquirer_return_code: string;
    operation_type: string;
    card: {
      id: string;
      brand: string;
      last_four_digits: string;
      holder_name: string;
      exp_month: number;
      exp_year: number;
      brand: string;
      type: string;
      country: string;
      deleted: boolean;
      fingerprint: string;
      valid: boolean;
      expiration_date: string;
    };
  };
  // Boleto removido
  pix?: {
    qr_code: string;
    qr_code_url: string;
    expires_at: string;
    additional_information: Array<{
      name: string;
      value: string;
    }>;
  };
}

// =====================================================
// TIPOS DE FORMULÁRIO
// =====================================================

export interface PaymentFormData {
  paymentMethod: 'credit_card' | 'debit_card' | 'pix';
  customer: {
    name: string;
    email: string;
    document: string;
    phone: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      zip_code: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
  card?: {
    number: string;
    holder_name: string;
    exp_month: string;
    exp_year: string;
    cvv: string;
    installments: number;
  };
  items: Array<{
    amount: number;
    description: string;
    quantity: number;
    code: string;
  }>;
}

// =====================================================
// TIPOS DE VALIDAÇÃO
// =====================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CardValidation {
  number: ValidationResult;
  holder_name: ValidationResult;
  expiry: ValidationResult;
  cvv: ValidationResult;
  installments: ValidationResult;
}

// =====================================================
// TIPOS DE ESTADO
// =====================================================

export interface PaymentState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  orderId: string | null;
  paymentStatus: string | null;
}

export interface FormState {
  isValid: boolean;
  isDirty: boolean;
  errors: Record<string, string>;
}

