import { PAGARME_CONFIG } from '../config/pagarme';
import frontendCardHashService from './frontendCardHashService';

/**
 * Serviço de integração com Pagar.me
 * Implementa pagamento transparente com cartão e PIX
 */
class PagarmeService {
  constructor() {
    this.apiKey = PAGARME_CONFIG.API_KEY;
    this.baseUrl = PAGARME_CONFIG.BASE_URL;
    this.environment = PAGARME_CONFIG.ENVIRONMENT;
  }

  /**
   * Cria headers para requisições à API
   */
  getHeaders() {
    return {
      'Authorization': `Basic ${btoa(this.apiKey + ':')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Faz requisição para a API do Pagar.me
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : null
      };

      const response = await fetch(url, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.errors?.[0]?.message || 'Erro na requisição');
      }

      return responseData;
    } catch (error) {
      console.error('Erro na requisição Pagar.me:', error);
      throw error;
    }
  }

  /**
   * Cria um pedido completo no Pagar.me
   */
  async createOrder(orderData) {
    try {
      console.log('🔄 Criando pedido no Pagar.me:', orderData);

      // Validar dados do pedido
      this.validateOrderData(orderData);

      // Preparar dados para a API
      const orderPayload = await this.prepareOrderPayload(orderData);

      // Criar pedido
      const response = await this.makeRequest('/orders', 'POST', orderPayload);

      console.log('✅ Pedido criado com sucesso:', response);
      return response;
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      throw error;
    }
  }

  /**
   * Valida dados do pedido antes de enviar
   */
  validateOrderData(orderData) {
    const requiredFields = ['code', 'amount', 'currency', 'items', 'customer', 'payments'];
    
    for (const field of requiredFields) {
      if (!orderData[field]) {
        throw new Error(`Campo obrigatório não informado: ${field}`);
      }
    }

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('Pedido deve ter pelo menos um item');
    }

    if (!Array.isArray(orderData.payments) || orderData.payments.length === 0) {
      throw new Error('Pedido deve ter pelo menos um método de pagamento');
    }

    // Validar valor total
    const totalAmount = orderData.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    if (totalAmount !== orderData.amount) {
      throw new Error('Valor total não confere com a soma dos itens');
    }
  }

  /**
   * Prepara payload do pedido para a API
   */
  async prepareOrderPayload(orderData) {
    const payload = {
      code: orderData.code,
      amount: orderData.amount,
      currency: orderData.currency || 'BRL',
      items: orderData.items.map(item => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity,
        code: item.code
      })),
      customer: this.prepareCustomerPayload(orderData.customer),
      payments: await Promise.all(orderData.payments.map(payment => this.preparePaymentPayload(payment))),
      metadata: {
        system: 'PulaKatraca',
        created_at: new Date().toISOString()
      }
    };

    // Adicionar endereço de cobrança se existir
    if (orderData.billing_address) {
      payload.billing_address = this.prepareAddressPayload(orderData.billing_address);
    }

    // Adicionar dados de antifraude se habilitado
    if (PAGARME_CONFIG.ANTIFRAUD.enabled) {
      payload.session_id = this.generateSessionId();
      payload.ip = this.getClientIP();
      payload.location = this.getClientLocation();
      payload.device = this.getClientDevice();
    }

    return payload;
  }

  /**
   * Prepara dados do cliente
   */
  prepareCustomerPayload(customer) {
    return {
      name: customer.name,
      email: customer.email,
      type: customer.type || 'individual',
      document: customer.document.replace(/\D/g, ''), // Remove caracteres não numéricos
      document_type: customer.document.length === 11 ? 'cpf' : 'cnpj',
      phone_numbers: [customer.phone],
      address: this.prepareAddressPayload(customer.address)
    };
  }

  /**
   * Prepara dados do endereço
   */
  prepareAddressPayload(address) {
    return {
      street: address.street,
      number: address.number,
      complement: address.complement || '',
      zip_code: address.zip_code.replace(/\D/g, ''),
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      country: 'BR'
    };
  }

  /**
   * Prepara dados do pagamento
   */
  async preparePaymentPayload(payment) {
    const paymentPayload = {
      payment_method: payment.payment_method,
      amount: payment.amount
    };

    switch (payment.payment_method) {
      case 'credit_card':
        paymentPayload.credit_card = await this.prepareCreditCardPayload(payment.credit_card);
        break;
      
      case 'debit_card':
        paymentPayload.debit_card = await this.prepareDebitCardPayload(payment.debit_card);
        break;
      
      case 'pix':
        paymentPayload.pix = this.preparePixPayload(payment.pix);
        break;
    }

    return paymentPayload;
  }

  /**
   * Prepara dados do cartão de crédito
   */
  async prepareCreditCardPayload(creditCard) {
    // Gerar card_hash usando o novo serviço
    const cardHash = await frontendCardHashService.generateCardHash(creditCard.card);
    
    return {
      operation_type: 'auth_and_capture',
      installments: creditCard.installments || 1,
      statement_descriptor: 'PulaKatraca',
      card_hash: cardHash, // Usar card_hash em vez de dados do cartão
      capture: PAGARME_CONFIG.PAYMENT_CONFIG.CARD.capture,
      postback_url: PAGARME_CONFIG.PAYMENT_CONFIG.CARD.postbackUrl
    };
  }

  /**
   * Prepara dados do cartão de débito
   */
  async prepareDebitCardPayload(debitCard) {
    // Gerar card_hash usando o novo serviço
    const cardHash = await frontendCardHashService.generateCardHash(debitCard.card);
    
    return {
      statement_descriptor: 'PulaKatraca',
      card_hash: cardHash, // Usar card_hash em vez de dados do cartão
      postback_url: PAGARME_CONFIG.PAYMENT_CONFIG.CARD.postbackUrl
    };
  }

  // Função prepareBoletoPayload removida - Boleto não é mais suportado

  /**
   * Prepara dados do PIX
   */
  preparePixPayload(pix) {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + PAGARME_CONFIG.PAYMENT_CONFIG.PIX.expirationDate);

    return {
      expiration_date: expirationDate.toISOString(),
      additional_information: PAGARME_CONFIG.PAYMENT_CONFIG.PIX.additionalInformation
    };
  }

  /**
   * Busca um pedido pelo ID
   */
  async getOrder(orderId) {
    try {
      console.log('🔍 Buscando pedido:', orderId);
      const response = await this.makeRequest(`/orders/${orderId}`);
      return response;
    } catch (error) {
      console.error('❌ Erro ao buscar pedido:', error);
      throw error;
    }
  }

  /**
   * Cancela um pedido
   */
  async cancelOrder(orderId, reason = 'Cancelamento solicitado pelo cliente') {
    try {
      console.log('❌ Cancelando pedido:', orderId);
      const response = await this.makeRequest(`/orders/${orderId}/cancel`, 'POST', {
        reason
      });
      return response;
    } catch (error) {
      console.error('❌ Erro ao cancelar pedido:', error);
      throw error;
    }
  }

  /**
   * Captura um pagamento autorizado
   */
  async capturePayment(paymentId, amount = null) {
    try {
      console.log('💰 Capturando pagamento:', paymentId);
      const data = amount ? { amount } : {};
      const response = await this.makeRequest(`/payments/${paymentId}/capture`, 'POST', data);
      return response;
    } catch (error) {
      console.error('❌ Erro ao capturar pagamento:', error);
      throw error;
    }
  }

  /**
   * Cancela um pagamento
   */
  async cancelPayment(paymentId, reason = 'Cancelamento solicitado') {
    try {
      console.log('❌ Cancelando pagamento:', paymentId);
      const response = await this.makeRequest(`/payments/${paymentId}/cancel`, 'POST', {
        reason
      });
      return response;
    } catch (error) {
      console.error('❌ Erro ao cancelar pagamento:', error);
      throw error;
    }
  }

  /**
   * Gera ID de sessão para antifraude
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtém IP do cliente (simulado)
   */
  getClientIP() {
    // Em produção, isso deve vir do backend ou de um serviço externo
    return '127.0.0.1';
  }

  /**
   * Obtém localização do cliente (simulado)
   */
  getClientLocation() {
    // Em produção, isso deve vir do backend ou de um serviço externo
    return {
      latitude: -23.5505,
      longitude: -46.6333
    };
  }

  /**
   * Obtém dados do dispositivo do cliente
   */
  getClientDevice() {
    return {
      platform: navigator.platform,
      user_agent: navigator.userAgent,
      fingerprint: this.generateDeviceFingerprint()
    };
  }

  /**
   * Gera fingerprint do dispositivo
   */
  generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    return canvas.toDataURL();
  }

  /**
   * Valida número do cartão usando algoritmo de Luhn
   */
  validateCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Valida CVV do cartão
   */
  validateCVV(cvv, cardBrand) {
    const cvvLength = cardBrand === 'amex' ? 4 : 3;
    return cvv.length === cvvLength && /^\d+$/.test(cvv);
  }

  /**
   * Valida data de expiração
   */
  validateExpiry(expMonth, expYear) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const month = parseInt(expMonth);
    const year = parseInt(expYear);

    if (month < 1 || month > 12) {
      return false;
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return false;
    }

    return true;
  }

  /**
   * Valida CPF
   */
  validateCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) {
      return false;
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF[i]) * (10 - i);
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF[i]) * (11 - i);
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;

    return parseInt(cleanCPF[9]) === digit1 && parseInt(cleanCPF[10]) === digit2;
  }

  /**
   * Valida CNPJ
   */
  validateCNPJ(cnpj) {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      return false;
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return false;
    }

    // Validação do primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;

    // Validação do segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;

    return parseInt(cleanCNPJ[12]) === digit1 && parseInt(cleanCNPJ[13]) === digit2;
  }

  /**
   * Formata número do cartão com espaços
   */
  formatCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    const groups = cleanNumber.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleanNumber;
  }

  /**
   * Formata data de expiração
   */
  formatExpiry(expiry) {
    const cleanExpiry = expiry.replace(/\D/g, '');
    if (cleanExpiry.length >= 2) {
      return cleanExpiry.substring(0, 2) + '/' + cleanExpiry.substring(2, 4);
    }
    return cleanExpiry;
  }

  /**
   * Formata CPF
   */
  formatCPF(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formata CNPJ
   */
  formatCNPJ(cnpj) {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /**
   * Formata telefone
   */
  formatPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleanPhone;
  }

  /**
   * Formata CEP
   */
  formatCEP(cep) {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
}

// Instância única do serviço
const pagarmeService = new PagarmeService();

export default pagarmeService;

