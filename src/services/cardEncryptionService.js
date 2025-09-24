/**
 * Serviço de criptografia de cartão usando API Pagar.me
 * Gera card_hash seguro via backend proxy para evitar CORS
 */

class CardEncryptionService {
  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://backend-pula.onrender.com';
  }

  /**
   * Gera card_hash usando o backend como proxy para a API do Pagar.me
   * Evita problemas de CORS ao não chamar a API diretamente do frontend
   */
  async generateCardHash(card) {
    try {
      // Preparar dados do cartão no formato correto
      const cardData = {
        number: card.number.replace(/\s/g, ''),
        holder_name: card.holder_name,
        exp_month: String(card.exp_month).padStart(2, '0'),
        exp_year: String(card.exp_year).length === 2 ? `20${card.exp_year}` : String(card.exp_year),
        cvv: card.cvv,
      };

      console.log('Dados do cartão formatados:', {
        number_preview: cardData.number.substring(0, 4) + '****',
        holder_name: cardData.holder_name,
        exp_month: cardData.exp_month,
        exp_year: cardData.exp_year,
        cvv: '***'
      });

      // Chamar backend que serve como proxy para a API do Pagar.me
      const response = await fetch(`${this.backendUrl}/api/payments/generate-card-hash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // O backend espera { card: { number, holder_name, exp_month, exp_year, cvv } }
        body: JSON.stringify({ card: cardData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao gerar card_hash:', errorData);
        throw new Error(`Erro ao gerar card_hash: ${errorData.error || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      
      console.log('Card hash gerado com sucesso:', {
        hash_length: data.card_hash ? data.card_hash.length : 0,
        hash_preview: data.card_hash ? data.card_hash.substring(0, 10) + '...' : 'N/A',
        card_id: data.id
      });

      return data.card_hash;

    } catch (error) {
      console.error('Erro ao gerar card_hash:', error);
      throw new Error('Falha ao criptografar dados do cartão');
    }
  }

  /**
   * Valida número do cartão
   */
  validateCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    return cleanNumber.length >= 13 && cleanNumber.length <= 19;
  }

  /**
   * Valida CVV
   */
  validateCVV(cvv, cardBrand = 'unknown') {
    const cleanCVV = cvv.replace(/\D/g, '');
    
    switch (cardBrand) {
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
    const expYear = parseInt(year);
    
    if (expMonth < 1 || expMonth > 12) return false;
    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;
    
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
   * Formata número do cartão
   */
  formatCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    return cleanNumber.match(/.{1,4}/g)?.join(' ') || cleanNumber;
  }

  /**
   * Formata data de expiração
   */
  formatExpiry(expiry) {
    const cleanExpiry = expiry.replace(/\D/g, '');
    return cleanExpiry.replace(/(\d{2})(\d{0,2})/, '$1/$2');
  }
}

const cardEncryptionService = new CardEncryptionService();

export default cardEncryptionService;