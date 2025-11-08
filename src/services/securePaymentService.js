import { supabase } from '../lib/supabase';
import frontendCardHashService from './frontendCardHashService';

/**
 * Serviço de pagamento seguro
 * Envia apenas card_hash ou valor para PIX
 * Processamento acontece no backend (Supabase Functions)
 */
class SecurePaymentService {
  constructor() {
    this.supabase = supabase;
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://backend-pula.onrender.com';
  }

  // Converte valores possivelmente em reais para centavos (inteiro)
  // Heurística: se vier número com decimais, multiplica por 100; se for inteiro < 1000 e o carrinho tiver decimais em algum item, também multiplica
  toCents(value) {
    if (value == null) return 0;
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    if (!Number.isInteger(num)) return Math.round(num * 100);
    return num;
  }

  /**
   * Processa pagamento com cartão de crédito
   */
  async processCreditCardPayment(paymentData) {
    try {
      console.log('🔐 Processando pagamento com cartão de crédito');

      // Gerar card_hash seguro no frontend usando SDK Pagar.me
      const cardHash = await frontendCardHashService.generateCardHash(paymentData.card);
      
      console.log('🔐 Card hash gerado:', {
        hash_length: cardHash ? cardHash.length : 0,
        hash_preview: cardHash ? cardHash.substring(0, 20) + '...' : 'N/A',
        card_data_received: {
          number_length: paymentData.card?.number?.length || 0,
          holder_name: paymentData.card?.holder_name ? 'presente' : 'ausente',
          exp_month: paymentData.card?.exp_month,
          exp_year: paymentData.card?.exp_year,
          cvv_length: paymentData.card?.cvv?.length || 0
        }
      });

      // Preparar payload para o backend (estrutura esperada: amount, customer, items, payments[])
      const items = paymentData.items.map(item => ({
        code: item.code,
        description: item.description,
        amount: item.amount, // Já está em centavos
        quantity: Number(item.quantity || 1)
      }));

      // Usar o valor total com taxas se disponível, senão calcular baseado nos itens
      const totalAmount = paymentData.amount_with_fee || paymentData.amount || items.reduce((sum, it) => sum + (it.amount * it.quantity), 0);
      
      console.log('🔍 DEBUG securePaymentService CREDIT CARD - Valores:', {
        amount_with_fee: paymentData.amount_with_fee,
        amount: paymentData.amount,
        calculated_from_items: items.reduce((sum, it) => sum + (it.amount * it.quantity), 0),
        final_totalAmount: totalAmount,
        items: items.map(item => ({ amount: item.amount, quantity: item.quantity, total: item.amount * item.quantity }))
      });

      console.log('🔍 DEBUG securePaymentService - Payload final antes do envio:', {
        amount: totalAmount,
        amount_in_reais: totalAmount / 100
      });

      const securePayload = {
        code: `ORDER_${Date.now()}`,
        currency: 'BRL',
        amount: totalAmount,
        payment_method: 'credit_card',
        customer: {
          name: paymentData.customer.name,
          email: paymentData.customer.email,
          document: paymentData.customer.document.replace(/\D/g, '')
        },
        items,
        payments: [
          {
            payment_method: 'credit_card',
            amount: totalAmount,
            credit_card: {
              installments: Number(paymentData.card?.installments || 1),
              capture: true,
              statement_descriptor: 'PULACATRACA',
              card: { id: cardHash }
            }
          }
        ]
      };
      
      console.log('💳 Payload seguro preparado (SEM dados do cartão):', {
        payment_method: securePayload.payments?.[0]?.payment_method || securePayload.payment_method,
        amount: securePayload.amount,
        token_present: !!cardHash,
        customer_name: securePayload.customer.name,
        items_count: securePayload.items.length
      });

      // Enviar ao backend Node
      const result = await this.callBackendPayments(securePayload);

      console.log('✅ Pagamento com cartão processado:', result);
      return result;

    } catch (error) {
      console.error('❌ Erro no pagamento com cartão:', error);
      throw error;
    }
  }

  /**
   * Processa pagamento com cartão de débito
   */
  async processDebitCardPayment(paymentData) {
    try {
      console.log('🔐 Processando pagamento com cartão de débito');

      // Gerar card_hash seguro no frontend usando SDK Pagar.me
      const cardHash = await frontendCardHashService.generateCardHash(paymentData.card);

      // Preparar payload backend para débito (estrutura com payments[])
      const items = paymentData.items.map(item => ({
        code: item.code,
        description: item.description,
        amount: this.toCents(item.amount),
        quantity: Number(item.quantity || 1)
      }));

      // Usar o valor total com taxas se disponível, senão calcular baseado nos itens
      const totalAmount = paymentData.amount_with_fee || paymentData.amount || items.reduce((sum, it) => sum + (it.amount * it.quantity), 0);

      const securePayload = {
        code: `ORDER_${Date.now()}`,
        currency: 'BRL',
        amount: totalAmount,
        payment_method: 'debit_card',
        customer: {
          name: paymentData.customer.name,
          email: paymentData.customer.email,
          document: paymentData.customer.document.replace(/\D/g, '')
        },
        items,
        payments: [
          {
            payment_method: 'debit_card',
            amount: totalAmount,
            debit_card: {
              capture: true,
              statement_descriptor: 'PULACATRACA',
              card: { id: cardHash }
            }
          }
        ]
      };
      
      console.log('💳 Payload débito seguro preparado:', {
        payment_method: securePayload.payment_method,
        amount: securePayload.amount,
        card_hash_length: cardHash ? cardHash.length : 0,
        customer_name: securePayload.customer.name,
        items_count: securePayload.items.length
      });

      // Enviar ao backend Node
      const result = await this.callBackendPayments(securePayload);

      console.log('✅ Pagamento com débito processado:', result);
      return result;

    } catch (error) {
      console.error('❌ Erro no pagamento com débito:', error);
      throw error;
    }
  }

  /**
   * Processa pagamento PIX
   */
  async processPixPayment(paymentData) {
    try {
      console.log('📱 Processando pagamento PIX V5');

      // Normaliza itens para centavos e calcula total
      let normalizedItems = (paymentData.items || []).map(item => ({
        code: item.code,
        description: item.description,
        amount: item.amount, // Já está em centavos
        quantity: Number(item.quantity || 1)
      }));
      let itemsTotal = normalizedItems.reduce((sum, it) => sum + (it.amount * it.quantity), 0);

      // Usa o total calculado pelos itens; se informado amount estiver presente, confere consistência
      const hintedTotal = this.toCents(paymentData.amount_with_fee ?? paymentData.amount);
      // Priorizar o total com taxas se disponível, senão usar o total dos itens
      let totalAmount = (paymentData.amount_with_fee || paymentData.amount) ? hintedTotal : itemsTotal;
      
      console.log('🔍 DEBUG securePaymentService PIX - Valores:', {
        amount_with_fee: paymentData.amount_with_fee,
        amount: paymentData.amount,
        hintedTotal,
        itemsTotal,
        final_totalAmount: totalAmount,
        items: normalizedItems.map(item => ({ amount: item.amount, quantity: item.quantity, total: item.amount * item.quantity }))
      });

      // Se não houver itens válidos, cria um item único com o total
      if (itemsTotal === 0 && totalAmount > 0) {
        normalizedItems = [{
          code: 'pix',
          description: 'Pagamento PIX',
          amount: totalAmount,
          quantity: 1
        }];
        itemsTotal = totalAmount;
      }

      const hasPhone = !!paymentData.customer?.phone && paymentData.customer.phone.replace(/\D/g, '').length >= 8;
      const cleanPhone = hasPhone ? paymentData.customer.phone.replace(/\D/g, '') : '';

      const customer = {
        name: paymentData.customer.name,
        email: paymentData.customer.email,
        document: paymentData.customer.document?.replace(/\D/g, ''),
        type: 'individual'
      };
      if (hasPhone) {
        customer.phones = {
          mobile_phone: {
            country_code: '55',
            area_code: cleanPhone.substring(0, 2),
            number: cleanPhone.substring(2)
          }
        };
      }

      const securePayload = {
        amount: totalAmount,
        currency: 'BRL',
        items: normalizedItems,
        customer,
        payments: [
          {
            payment_method: 'pix',
            pix: { expires_in: 3600 },
            amount: totalAmount
          }
        ]
      };

      // Enviar diretamente ao backend Node (em vez da Supabase Edge Function)
      const result = await this.callBackendPayments(securePayload);
      return result;

    } catch (error) {
      console.error('❌ Erro no pagamento PIX:', error);
      throw error;
    }
  }

  /**
   * Chama o backend local para processar pagamento
   */
  async callPaymentFunction(payload) {
    try {
      console.log('🔄 Enviando pagamento para backend local:', this.backendUrl);
      
      const response = await fetch(`${this.backendUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro do backend:', response.status, errorText);
        throw new Error(`Erro do servidor (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Pagamento processado com sucesso:', data);
      return data;

    } catch (error) {
      console.error('❌ Erro na comunicação com backend:', error);
      throw new Error('Falha na comunicação com o servidor');
    }
  }

  /**
   * Chama o backend Node para processar pagamentos (rota: POST /api/payments)
   */
  async callBackendPayments(payload) {
    try {
      const response = await fetch(`${this.backendUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Erro no backend:', data);
        const detailsMsg = Array.isArray(data?.details?.errors)
          ? data.details.errors.map(e => e.message).join(' | ')
          : (typeof data?.details === 'string' ? data.details : undefined);
        const finalMsg = detailsMsg || data.error || 'Erro ao processar pagamento no backend';
        throw new Error(finalMsg);
      }

      return data;
    } catch (error) {
      console.error('❌ Falha na chamada ao backend:', error);
      throw new Error('Falha na comunicação com o backend');
    }
  }

  /**
   * Persistência do pedido no Supabase (stub para não bloquear o fluxo)
   * Ajuste aqui conforme o schema da sua base (tabela/colunas) quando disponível.
   */
  async saveOrderToSupabase(orderData, paymentResult) {
    try {
      // Evita quebra do fluxo caso não exista tabela/func em Supabase
      console.log('🗃️ [stub] Registro de pedido no Supabase (desativado):', {
        order_code: orderData?.code,
        pagarme_order_id: paymentResult?.id,
        status: paymentResult?.status,
        method: orderData?.payment_method || paymentResult?.payments?.[0]?.payment_method
      });
      return { success: true };
    } catch (err) {
      console.warn('⚠️ Falha ao salvar pedido (stub):', err?.message || err);
      return { success: false };
    }
  }

  /**
   * Cancelamento de pedido (ainda não implementado no backend)
   */
  async cancelPayment(orderId, reason = 'Cancelamento') {
    // Opcional: implementar rota no backend e chamar aqui
    throw new Error('Cancelamento ainda não implementado no backend');
  }
}

// Instância única do serviço
const securePaymentService = new SecurePaymentService();
export default securePaymentService;
