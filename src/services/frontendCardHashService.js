/**
 * Serviço de geração de card hash no frontend
 * Implementa criptografia local seguindo o padrão do SDK da Pagar.me
 * Gera card_hash diretamente no frontend usando a encryption_key
 */

import { PAGARME_CONFIG } from '../config/pagarme';

class FrontendCardHashService {
  constructor() {
    this.encryptionKey = PAGARME_CONFIG.ENCRYPTION_KEY;
    this.publicKey = PAGARME_CONFIG.API_KEY;
  }

  /**
   * Gera card_hash localmente no frontend usando a encryption_key
   * Segue exatamente o padrão do SDK da Pagar.me
   */
  async generateCardHash(cardData) {
    try {
      console.log('🔐 Gerando card_hash no frontend...');
      
      // Validar configuração das chaves
      this.validatePublicKey();
      console.log('✅ Public key validada:', this.publicKey.substring(0, 10) + '...');

      // Validar dados do cartão
      this.validateCardData(cardData);

      // Preparar dados no formato correto do SDK
      const formattedCardData = this.formatCardData(cardData);

      console.log('📋 Dados do cartão formatados:', {
        number_preview: formattedCardData.number.substring(0, 4) + '****',
        holder_name: formattedCardData.holder_name,
        exp_month: formattedCardData.exp_month,
        exp_year: formattedCardData.exp_year,
        brand: formattedCardData.brand
      });

      // Gerar card_hash usando a API de tokens do Pagar.me
      const cardHash = await this.createCardToken(formattedCardData);

      console.log('✅ Card hash gerado com sucesso:', {
        hash_length: cardHash.length,
        hash_preview: cardHash.substring(0, 10) + '...'
      });

      return cardHash;

    } catch (error) {
      console.error('❌ Erro ao gerar card_hash:', error);
      throw new Error(`Falha ao gerar card_hash: ${error.message}`);
    }
  }

  /**
   * Cria token do cartão usando a API do Pagar.me
   * Segue o padrão do SDK: POST /tokens?appId={publicKey}
   */
  async createCardToken(cardData) {
    try {
      const tokenPayload = {
        type: 'card',
        card: {
          number: cardData.number,
          holder_name: cardData.holder_name,
          exp_month: cardData.exp_month,
          exp_year: cardData.exp_year,
          cvv: cardData.cvv,
          brand: cardData.brand,
          label: cardData.label || 'Cartão de Crédito'
        }
      };
      
      console.log('📤 Enviando para API de tokens:', {
        url: `https://api.pagar.me/core/v5/tokens?appId=${this.publicKey.substring(0, 10)}...`,
        payload: {
          type: tokenPayload.type,
          card: {
            number_preview: cardData.number.substring(0, 4) + '****',
            holder_name: cardData.holder_name,
            exp_month: cardData.exp_month,
            exp_year: cardData.exp_year,
            cvv_length: cardData.cvv.length,
            brand: cardData.brand
          }
        }
      });
      
      const response = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${this.publicKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(tokenPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || 'Erro ao criar token do cartão');
      }

      const tokenData = await response.json();
      
      console.log('📥 Resposta da API de tokens:', {
        success: response.ok,
        status: response.status,
        token_id: tokenData.id ? tokenData.id.substring(0, 10) + '...' : 'N/A',
        token_type: tokenData.type,
        card_brand: tokenData.card?.brand
      });
      
      if (!tokenData.id) {
        console.error('❌ Token ID não retornado:', tokenData);
        throw new Error('Token ID não retornado pela API');
      }

      return tokenData.id;

    } catch (error) {
      console.error('❌ Erro ao criar token:', error);
      throw error;
    }
  }

  /**
   * Valida dados do cartão antes de processar
   */
  validateCardData(cardData) {
    const { number, holder_name, exp_month, exp_year, cvv } = cardData;

    if (!number || !holder_name || !exp_month || !exp_year || !cvv) {
      throw new Error('Dados do cartão incompletos');
    }

    // Validar número do cartão
    if (!this.validateCardNumber(number)) {
      throw new Error('Número do cartão inválido');
    }

    // Validar CVV
    const brand = this.getCardBrand(number);
    if (!this.validateCVV(cvv, brand)) {
      throw new Error('CVV inválido');
    }

    // Validar data de expiração
    if (!this.validateExpiry(exp_month, exp_year)) {
      throw new Error('Data de expiração inválida');
    }

    // Validar nome do portador
    if (holder_name.trim().length < 2) {
      throw new Error('Nome do portador deve ter pelo menos 2 caracteres');
    }
  }

  /**
   * Formata dados do cartão para o formato do SDK
   */
  formatCardData(cardData) {
    const { number, holder_name, exp_month, exp_year, cvv } = cardData;
    // Normaliza ano com 2 dígitos para formato YYYY
    const parsedYear = parseInt(exp_year);
    const normalizedYear = parsedYear < 100 ? 2000 + parsedYear : parsedYear;

    return {
      number: number.replace(/\s/g, ''), // Remove espaços
      holder_name: holder_name.trim().toUpperCase(),
      exp_month: parseInt(exp_month),
      exp_year: normalizedYear,
      cvv: cvv,
      brand: this.getCardBrand(number),
      label: this.getCardLabel(number)
    };
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
   * Valida CVV baseado na bandeira do cartão
   */
  validateCVV(cvv, brand) {
    const cleanCVV = cvv.replace(/\D/g, '');
    
    switch (brand) {
      case 'amex':
        return cleanCVV.length === 4;
      default:
        return cleanCVV.length === 3;
    }
  }

  /**
   * Valida data de expiração
   */
  validateExpiry(month, year) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const expMonth = parseInt(month);
    const rawYear = parseInt(year);
    const expYear = rawYear < 100 ? 2000 + rawYear : rawYear;

    if (expMonth < 1 || expMonth > 12) {
      return false;
    }

    if (expYear < currentYear) {
      return false;
    }

    if (expYear === currentYear && expMonth < currentMonth) {
      return false;
    }

    return true;
  }

  /**
   * Identifica a bandeira do cartão
   */
  getCardBrand(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6/.test(cleanNumber)) return 'discover';
    if (/^3[0-6]/.test(cleanNumber)) return 'diners';
    if (/^2/.test(cleanNumber)) return 'mastercard';
    
    return 'unknown';
  }

  /**
   * Retorna label amigável da bandeira
   */
  getCardLabel(cardNumber) {
    const brand = this.getCardBrand(cardNumber);
    
    const labels = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'discover': 'Discover',
      'diners': 'Diners Club',
      'unknown': 'Cartão de Crédito'
    };

    return labels[brand] || 'Cartão de Crédito';
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
   * Valida se a encryption_key está configurada
   */
  validateEncryptionKey() {
    if (!this.encryptionKey || !this.encryptionKey.startsWith('ek_')) {
      throw new Error('Encryption key inválida. Configure VITE_PAGARME_ENCRYPTION_KEY no .env');
    }
  }

  /**
   * Valida se a public key está configurada
   */
  validatePublicKey() {
    if (!this.publicKey || !this.publicKey.startsWith('pk_')) {
      throw new Error('Public key inválida. Configure VITE_PAGARME_PUBLIC_KEY no .env');
    }
  }
}

// Instância única do serviço
const frontendCardHashService = new FrontendCardHashService();

export default frontendCardHashService;