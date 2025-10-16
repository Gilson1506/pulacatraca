// src/services/pagbankService.ts
export interface PagBankCustomer {
  name: string;
  email: string;
  tax_id: string;
  phones: Array<{
    country: string;
    area: string;
    number: string;
    type: string;
  }>;
}

export interface PagBankItem {
  name: string;
  quantity: number;
  unit_amount: number;
}

export interface PagBankCard {
  number: string;
  exp_month: string;
  exp_year: string;
  security_code: string;
  holder: {
    name: string;
    tax_id: string;
  };
}

export interface PagBankPixOrder {
  reference_id: string;
  customer: PagBankCustomer;
  items: PagBankItem[];
  qr_codes: Array<{
    amount: {
      value: number;
    };
    expiration_date: string;
  }>;
  shipping?: any;
  notification_urls?: string[];
}

export interface PagBankCardOrder {
  reference_id: string;
  customer: PagBankCustomer;
  items: PagBankItem[];
  charges: Array<{
    reference_id: string;
    description: string;
    amount: {
      value: number;
      currency: string;
    };
    payment_method: {
      type: string;
      installments: number;
      capture: boolean;
      soft_descriptor: string;
      card: PagBankCard;
    };
  }>;
  shipping?: any;
  notification_urls?: string[];
}

export interface PagBankResponse {
  id: string;
  status: string;
  amount?: any;
  customer?: any;
  items?: any[];
  qr_codes?: Array<{
    qr_code?: {
      text?: string;
      links?: Array<{
        href: string;
      }>;
    };
    expiration_date: string;
  }>;
  charges?: Array<{
    id: string;
    status: string;
    amount: any;
    payment_method: any;
  }>;
  pix?: any;
}

class PagBankService {
  private baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_PAGBANK_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async createPixOrder(orderData: PagBankPixOrder): Promise<PagBankResponse> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar pedido PIX:', error);
      throw error;
    }
  }

  async createCardOrder(orderData: PagBankCardOrder): Promise<PagBankResponse> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar pedido com cartão:', error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<PagBankResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
      }

      return data.order;
    } catch (error) {
      console.error('Erro ao consultar pedido:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<PagBankResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
      }

      return data.order;
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      throw error;
    }
  }

  async generateCardToken(cardData: {
    number: string;
    holder_name: string;
    exp_month: string;
    exp_year: string;
    cvv: string;
  }): Promise<{ card_token: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-card-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ card: cardData })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Erro ao gerar token do cartão:', error);
      throw error;
    }
  }

  // Métodos auxiliares para formatar dados
  formatCustomerData(customer: {
    name: string;
    email: string;
    tax_id: string;
    phone: string;
  }): PagBankCustomer {
    return {
      name: customer.name,
      email: customer.email,
      tax_id: customer.tax_id.replace(/\D/g, ''), // Remove caracteres não numéricos
      phones: [
        {
          country: '55',
          area: customer.phone.substring(0, 2),
          number: customer.phone.substring(2),
          type: 'MOBILE'
        }
      ]
    };
  }

  formatItemData(item: {
    name: string;
    quantity: number;
    unit_amount: number;
  }): PagBankItem {
    return {
      name: item.name,
      quantity: item.quantity,
      unit_amount: item.unit_amount
    };
  }

  formatCardData(card: {
    number: string;
    exp_month: string;
    exp_year: string;
    security_code: string;
    holder_name: string;
    holder_tax_id: string;
  }): PagBankCard {
    return {
      number: card.number.replace(/\s/g, ''), // Remove espaços
      exp_month: card.exp_month.padStart(2, '0'), // Garante 2 dígitos
      exp_year: card.exp_year,
      security_code: card.security_code,
      holder: {
        name: card.holder_name,
        tax_id: card.holder_tax_id.replace(/\D/g, '') // Remove caracteres não numéricos
      }
    };
  }

  getExpirationDate(minutesFromNow: number = 60): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutesFromNow);
    return date.toISOString();
  }
}

export default PagBankService;
