import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pagarmeService from '../services/pagarmeService';
import frontendCardHashService from '../services/frontendCardHashService';
import { supabase } from '../config/supabaseClient';

/**
 * Hook personalizado para gerenciar pagamentos com Pagar.me
 * Integra com Supabase para salvar histórico de transações
 */
export const usePagarmePayment = () => {
  const { user } = useAuth();
  
  // Estados do pagamento
  const [paymentState, setPaymentState] = useState({
    isLoading: false,
    error: null,
    success: false,
    orderId: null,
    paymentStatus: null,
    paymentMethod: null
  });

  // Estados do formulário
  const [formState, setFormState] = useState({
    isValid: false,
    isDirty: false,
    errors: {}
  });

  // Estados dos dados do formulário
  const [formData, setFormData] = useState({
    paymentMethod: 'credit_card',
    customer: {
      name: '',
      email: '',
      document: '',
      phone: '',
      address: {
        street: '',
        number: '',
        complement: '',
        zip_code: '',
        neighborhood: '',
        city: '',
        state: ''
      }
    },
    card: {
      number: '',
      holder_name: '',
      exp_month: '',
      exp_year: '',
      cvv: '',
      installments: 1
    },
    items: []
  });

  // Estados de validação em tempo real
  const [validationState, setValidationState] = useState({
    card: {
      number: { isValid: false, errors: [] },
      holder_name: { isValid: false, errors: [] },
      expiry: { isValid: false, errors: [] },
      cvv: { isValid: false, errors: [] },
      installments: { isValid: false, errors: [] }
    },
    customer: {
      name: { isValid: false, errors: [] },
      email: { isValid: false, errors: [] },
      document: { isValid: false, errors: [] },
      phone: { isValid: false, errors: [] }
    },
    address: {
      street: { isValid: false, errors: [] },
      number: { isValid: false, errors: [] },
      zip_code: { isValid: false, errors: [] },
      neighborhood: { isValid: false, errors: [] },
      city: { isValid: false, errors: [] },
      state: { isValid: false, errors: [] }
    }
  });

  /**
   * Atualiza dados do formulário
   */
  const updateFormData = useCallback((field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      
      if (field.includes('.')) {
        const [section, key] = field.split('.');
        if (newData[section]) {
          newData[section] = { ...newData[section], [key]: value };
        }
      } else {
        newData[field] = value;
      }
      
      return newData;
    });

    setFormState(prev => ({
      ...prev,
      isDirty: true
    }));
  }, []);

  /**
   * Valida campo específico
   */
  const validateField = useCallback((field, value, type = 'text') => {
    let isValid = false;
    let errors = [];

    switch (type) {
      case 'card_number':
        isValid = pagarmeService.validateCardNumber(value);
        if (!isValid) {
          errors.push('Número do cartão inválido');
        }
        break;

      case 'cvv':
        const cardBrand = getCardBrand(formData.card?.number || '');
        isValid = pagarmeService.validateCVV(value, cardBrand);
        if (!isValid) {
          errors.push('CVV inválido');
        }
        break;

      case 'expiry':
        const [month, year] = value.split('/');
        isValid = pagarmeService.validateExpiry(month, year);
        if (!isValid) {
          errors.push('Data de expiração inválida');
        }
        break;

      case 'cpf':
        isValid = pagarmeService.validateCPF(value);
        if (!isValid) {
          errors.push('CPF inválido');
        }
        break;

      case 'cnpj':
        isValid = pagarmeService.validateCNPJ(value);
        if (!isValid) {
          errors.push('CNPJ inválido');
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(value);
        if (!isValid) {
          errors.push('Email inválido');
        }
        break;

      case 'phone':
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        isValid = phoneRegex.test(value.replace(/\D/g, ''));
        if (!isValid) {
          errors.push('Telefone inválido');
        }
        break;

      case 'required':
        isValid = value && value.trim().length > 0;
        if (!isValid) {
          errors.push('Campo obrigatório');
        }
        break;

      default:
        isValid = value && value.trim().length > 0;
        if (!isValid) {
          errors.push('Campo obrigatório');
        }
    }

    return { isValid, errors };
  }, [formData.card?.number]);

  /**
   * Identifica a bandeira do cartão
   */
  const getCardBrand = useCallback((cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6/.test(cleanNumber)) return 'discover';
    if (/^3[0-6]/.test(cleanNumber)) return 'diners';
    if (/^2/.test(cleanNumber)) return 'mastercard';
    
    return 'unknown';
  }, []);

  /**
   * Formata campo específico
   */
  const formatField = useCallback((field, value, type = 'text') => {
    switch (type) {
      case 'card_number':
        return pagarmeService.formatCardNumber(value);
      
      case 'expiry':
        return pagarmeService.formatExpiry(value);
      
      case 'cpf':
        return pagarmeService.formatCPF(value);
      
      case 'cnpj':
        return pagarmeService.formatCNPJ(value);
      
      case 'phone':
        return pagarmeService.formatPhone(value);
      
      case 'cep':
        return pagarmeService.formatCEP(value);
      
      default:
        return value;
    }
  }, []);

  /**
   * Valida formulário completo
   */
  const validateForm = useCallback(() => {
    const errors = {};
    let isValid = true;

    // Validar dados do cliente
    const customerFields = ['name', 'email', 'document', 'phone'];
    customerFields.forEach(field => {
      const value = formData.customer[field];
      const validation = validateField(field, value, field === 'email' ? 'email' : 'required');
      
      if (!validation.isValid) {
        errors[`customer.${field}`] = validation.errors[0];
        isValid = false;
      }
    });

    // Validar endereço
    const addressFields = ['street', 'number', 'zip_code', 'neighborhood', 'city', 'state'];
    addressFields.forEach(field => {
      const value = formData.customer.address[field];
      const validation = validateField(field, value, 'required');
      
      if (!validation.isValid) {
        errors[`address.${field}`] = validation.errors[0];
        isValid = false;
      }
    });

    // Validar cartão se método for cartão
    if (formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card') {
      const cardFields = ['number', 'holder_name', 'exp_month', 'exp_year', 'cvv'];
      cardFields.forEach(field => {
        const value = formData.card[field];
        let validation;
        
        switch (field) {
          case 'number':
            validation = validateField(field, value, 'card_number');
            break;
          case 'cvv':
            validation = validateField(field, value, 'cvv');
            break;
          case 'exp_month':
          case 'exp_year':
            const expiry = `${formData.card.exp_month}/${formData.card.exp_year}`;
            validation = validateField('expiry', expiry, 'expiry');
            break;
          default:
            validation = validateField(field, value, 'required');
        }
        
        if (!validation.isValid) {
          errors[`card.${field}`] = validation.errors[0];
          isValid = false;
        }
      });
    }

    // Validar itens
    if (!formData.items || formData.items.length === 0) {
      errors.items = 'Adicione pelo menos um item ao carrinho';
      isValid = false;
    }

    setFormState(prev => ({
      ...prev,
      isValid,
      errors
    }));

    return isValid;
  }, [formData, validateField]);

  /**
   * Processa pagamento
   */
  const processPayment = useCallback(async () => {
    try {
      // Validar formulário
      if (!validateForm()) {
        setPaymentState(prev => ({
          ...prev,
          error: 'Por favor, verifique os dados informados'
        }));
        return;
      }

      setPaymentState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      // Preparar dados do pedido
      const orderData = {
        code: `ORDER_${Date.now()}`,
        amount: formData.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0),
        currency: 'BRL',
        items: formData.items,
        customer: formData.customer,
        payments: [{
          payment_method: formData.paymentMethod,
          amount: formData.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0),
          ...(formData.paymentMethod === 'credit_card' && {
            credit_card: {
              installments: formData.card.installments,
              card: formData.card
            }
          }),
          ...(formData.paymentMethod === 'debit_card' && {
            debit_card: {
              card: formData.card
            }
          }),
          ...(formData.paymentMethod === 'pix' && {
            pix: {}
          })
        }],
        billing_address: formData.customer.address
      };

      // Criar pedido no Pagar.me
      const pagarmeResponse = await pagarmeService.createOrder(orderData);

      // Salvar no Supabase
      const supabaseResponse = await saveOrderToSupabase(orderData, pagarmeResponse);

      setPaymentState(prev => ({
        ...prev,
        isLoading: false,
        success: true,
        orderId: pagarmeResponse.id,
        paymentStatus: pagarmeResponse.status,
        paymentMethod: formData.paymentMethod
      }));

      // Limpar formulário após sucesso
      if (pagarmeResponse.status === 'paid') {
        resetForm();
      }

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      
      setPaymentState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao processar pagamento'
      }));
    }
  }, [formData, validateForm]);

  /**
   * Salva pedido no Supabase
   */
  const saveOrderToSupabase = useCallback(async (orderData, pagarmeResponse) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          id: pagarmeResponse.id,
          code: orderData.code,
          amount: orderData.amount,
          currency: orderData.currency,
          status: pagarmeResponse.status,
          payment_method: orderData.payments[0].payment_method,
          customer_id: user?.id,
          customer_data: orderData.customer,
          items: orderData.items,
          pagarme_data: pagarmeResponse,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao salvar no Supabase:', error);
      throw error;
    }
  }, [user?.id]);

  /**
   * Busca pedido no Supabase
   */
  const getOrderFromSupabase = useCallback(async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      throw error;
    }
  }, []);

  /**
   * Atualiza status do pedido
   */
  const updateOrderStatus = useCallback(async (orderId, status, additionalData = {}) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...additionalData
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  }, []);

  /**
   * Cancela pedido
   */
  const cancelOrder = useCallback(async (orderId, reason = 'Cancelamento solicitado') => {
    try {
      setPaymentState(prev => ({
        ...prev,
        isLoading: true
      }));

      // Cancelar no Pagar.me
      await pagarmeService.cancelOrder(orderId, reason);

      // Atualizar no Supabase
      await updateOrderStatus(orderId, 'canceled', { cancel_reason: reason });

      setPaymentState(prev => ({
        ...prev,
        isLoading: false,
        success: true
      }));

    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      
      setPaymentState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao cancelar pedido'
      }));
    }
  }, [updateOrderStatus]);

  /**
   * Reseta formulário
   */
  const resetForm = useCallback(() => {
    setFormData({
      paymentMethod: 'credit_card',
      customer: {
        name: '',
        email: '',
        document: '',
        phone: '',
        address: {
          street: '',
          number: '',
          complement: '',
          zip_code: '',
          neighborhood: '',
          city: '',
          state: ''
        }
      },
      card: {
        number: '',
        holder_name: '',
        exp_month: '',
        exp_year: '',
        cvv: '',
        installments: 1
      },
      items: []
    });

    setFormState({
      isValid: false,
      isDirty: false,
      errors: {}
    });

    setPaymentState({
      isLoading: false,
      error: null,
      success: false,
      orderId: null,
      paymentStatus: null,
      paymentMethod: null
    });
  }, []);

  /**
   * Adiciona item ao carrinho
   */
  const addItem = useCallback((item) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
  }, []);

  /**
   * Remove item do carrinho
   */
  const removeItem = useCallback((itemIndex) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, index) => index !== itemIndex)
    }));
  }, []);

  /**
   * Atualiza quantidade de item
   */
  const updateItemQuantity = useCallback((itemIndex, quantity) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, index) => 
        index === itemIndex ? { ...item, quantity } : item
      )
    }));
  }, []);

  /**
   * Calcula total do carrinho
   */
  const calculateTotal = useCallback(() => {
    return formData.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  }, [formData.items]);

  /**
   * Formata valor para exibição
   */
  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100); // Converte de centavos para reais
  }, []);

  // Validar formulário sempre que dados mudarem
  useEffect(() => {
    if (formState.isDirty) {
      validateForm();
    }
  }, [formData, formState.isDirty, validateForm]);

  return {
    // Estados
    paymentState,
    formState,
    formData,
    validationState,
    
    // Ações
    updateFormData,
    processPayment,
    cancelOrder,
    resetForm,
    addItem,
    removeItem,
    updateItemQuantity,
    
    // Utilitários
    validateField,
    formatField,
    getCardBrand,
    calculateTotal,
    formatCurrency,
    getOrderFromSupabase,
    updateOrderStatus
  };
};

export default usePagarmePayment;

