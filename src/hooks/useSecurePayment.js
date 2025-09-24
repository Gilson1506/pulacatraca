import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import securePaymentService from '../services/securePaymentService';
import frontendCardHashService from '../services/frontendCardHashService';

/**
 * Hook personalizado para pagamentos seguros
 * Usa card_hash para cartões e processamento na sua API
 */
export const useSecurePayment = (preCalculatedTotal = null) => {
  const { user } = useAuth();

  // Estado do pagamento
  const [paymentState, setPaymentState] = useState({
    isLoading: false,
    error: null,
    success: false,
    orderId: null,
    paymentStatus: null,
    paymentMethod: null,
    pixQrCode: null, // imagem base64 (data:image/...)
    pixCodeString: null // código EMV/qr_code em texto
  });

  // Estado do formulário
  const [formState, setFormState] = useState({
    isValid: false,
    isDirty: false,
    errors: {}
  });

  // Dados do formulário
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
      cvv: ''
    },
    items: []
  });

  // Validação em tempo real
  const [validationState, setValidationState] = useState({
    card: { number: {}, holder_name: {}, expiry: {}, cvv: {} },
    customer: { name: {}, email: {}, document: {}, phone: {} },
    address: { street: {}, number: {}, zip_code: {}, neighborhood: {}, city: {}, state: {} }
  });

  /** Atualiza campo do formulário */
  const updateFormData = useCallback((field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (field.includes('.')) {
        const keys = field.split('.');
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      } else {
        newData[field] = value;
      }
      return newData;
    });
    setFormState(prev => ({ ...prev, isDirty: true }));
  }, []);

  /** Valida campo específico */
  const validateField = useCallback((field, value, type = 'text') => {
    let isValid = false;
    let errors = [];

    switch (type) {
      case 'card_number':
        isValid = frontendCardHashService.validateCardNumber(value);
        if (!isValid) errors.push('Número do cartão inválido');
        break;
      case 'cvv':
        const cardBrand = getCardBrand(formData.card?.number || '');
        isValid = frontendCardHashService.validateCVV(value, cardBrand);
        if (!isValid) errors.push('CVV inválido');
        break;
      case 'expiry':
        const [month, year] = value.split('/');
        isValid = frontendCardHashService.validateExpiry(month, year);
        if (!isValid) errors.push('Data de expiração inválida');
        break;
      case 'cpf':
        isValid = validateCPF(value);
        if (!isValid) errors.push('CPF inválido');
        break;
      case 'cnpj':
        isValid = validateCNPJ(value);
        if (!isValid) errors.push('CNPJ inválido');
        break;
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!isValid) errors.push('Email inválido');
        break;
      case 'phone':
        isValid = /^\+?[1-9]\d{1,14}$/.test(value.replace(/\D/g, ''));
        if (!isValid) errors.push('Telefone inválido');
        break;
      case 'required':
      default:
        isValid = value && value.trim().length > 0;
        if (!isValid) errors.push('Campo obrigatório');
    }

    return { isValid, errors };
  }, [formData.card?.number]);

  const getCardBrand = useCallback(cardNumber => frontendCardHashService.getCardBrand(cardNumber), []);

  /** Valida todo o formulário */
  const validateForm = useCallback(() => {
    const errors = {};
    let isValid = true;

    // Cliente
    ['name','email','document','phone'].forEach(field => {
      const value = formData.customer[field];
      const validation = validateField(field, value, field === 'email' ? 'email' : 'required');
      if (!validation.isValid) {
        errors[`customer.${field}`] = validation.errors[0];
        isValid = false;
      }
    });

    // Endereço
    ['street','number','zip_code','neighborhood','city','state'].forEach(field => {
      const value = formData.customer.address[field];
      const validation = validateField(field, value, 'required');
      if (!validation.isValid) {
        errors[`address.${field}`] = validation.errors[0];
        isValid = false;
      }
    });

    // Cartão
    if (['credit_card','debit_card'].includes(formData.paymentMethod)) {
      ['number','holder_name','exp_month','exp_year','cvv'].forEach(field => {
        const value = formData.card[field];
        let validation;
        switch (field) {
          case 'number': validation = validateField(field, value, 'card_number'); break;
          case 'cvv': validation = validateField(field, value, 'cvv'); break;
          case 'exp_month':
          case 'exp_year':
            validation = validateField('expiry', `${formData.card.exp_month}/${formData.card.exp_year}`, 'expiry');
            break;
          default: validation = validateField(field, value, 'required');
        }
        if (!validation.isValid) {
          errors[`card.${field}`] = validation.errors[0];
          isValid = false;
        }
      });
    }

    // Itens
    if (!formData.items || formData.items.length === 0) {
      errors.items = 'Adicione pelo menos um item';
      isValid = false;
    }

    setFormState(prev => ({ ...prev, isValid, errors }));
    return isValid;
  }, [formData, validateField]);

  /** Processa pagamento */
  const processPayment = useCallback(async () => {
    try {
      if (!validateForm()) {
        setPaymentState(prev => ({ ...prev, error: 'Verifique os dados do formulário' }));
        return;
      }

      setPaymentState(prev => ({ ...prev, isLoading: true, error: null }));

      // Manter todos os itens, não consolidar por código
      const uniqueItems = formData.items;

      // Gerar card_hash quando for cartão e incluir no orderData
      let generatedCardHash = null;
      if (['credit_card','debit_card'].includes(formData.paymentMethod)) {
        generatedCardHash = await frontendCardHashService.generateCardHash(formData.card);
      }

      const subtotal = uniqueItems.reduce((sum,item)=>sum+item.amount*item.quantity,0);
      const fee = calculateFee();
      const totalWithFee = preCalculatedTotal !== null ? preCalculatedTotal : subtotal + fee;
      
      console.log('🔍 DEBUG useSecurePayment - Cálculos:', {
        subtotal,
        fee,
        totalWithFee,
        preCalculatedTotal,
        items: uniqueItems.map(item => ({ amount: item.amount, quantity: item.quantity, total: item.amount * item.quantity })),
        convenienceFee: calculateConvenienceFee(),
        processorFee: calculateProcessorFee()
      });

      const orderData = {
        code: `ORDER_${Date.now()}`,
        amount: subtotal,
        amount_with_fee: totalWithFee,
        currency: 'BRL',
        items: uniqueItems,
        customer: formData.customer,
        billing_address: formData.customer.address,
        customer_id: user?.id,
        payment_method: formData.paymentMethod,
        card: formData.card,
        ...(generatedCardHash ? { card_hash: generatedCardHash } : {})
      };

      let paymentResult;
      switch(formData.paymentMethod){
        case 'credit_card':
          paymentResult = await securePaymentService.processCreditCardPayment(orderData);
          break;
        case 'debit_card':
          paymentResult = await securePaymentService.processDebitCardPayment(orderData);
          break;
        case 'pix':
          paymentResult = await securePaymentService.processPixPayment(orderData);
          break;
        default:
          throw new Error('Método de pagamento não suportado');
      }

      await securePaymentService.saveOrderToSupabase(orderData, paymentResult);

      if (formData.paymentMethod === 'pix') {
        // Extrai dados do PIX do resultado
        const pixPayment = paymentResult?.payments?.find(p => p.payment_method === 'pix');
        // Estrutura v5: charges[].last_transaction
        let lastPixTx = paymentResult?.charges?.find(c => (
          c?.payment_method === 'pix' ||
          c?.last_transaction?.payment_method === 'pix' ||
          c?.last_transaction?.transaction_type === 'pix'
        ))?.last_transaction;
        // Fallback direto para a primeira charge
        if (!lastPixTx && Array.isArray(paymentResult?.charges) && paymentResult.charges.length > 0) {
          lastPixTx = paymentResult.charges[0]?.last_transaction;
        }

        const qrImage =
          pixPayment?.pix?.qr_code_base64 ||
          pixPayment?.pix?.qr_code_base64_image ||
          lastPixTx?.pix?.qr_code_base64 ||
          lastPixTx?.pix?.qr_code_base64_image ||
          lastPixTx?.qr_code_base64 ||
          // URL direta do QR (imagem) fornecida pela API
          lastPixTx?.qr_code_url ||
          paymentResult?.pix?.qr_code_base64 ||
          paymentResult?.pix?.qr_code_url;

        const qrText =
          pixPayment?.pix?.qr_code ||
          pixPayment?.pix?.emv ||
          lastPixTx?.pix?.qr_code ||
          lastPixTx?.pix?.emv ||
          lastPixTx?.qr_code ||
          paymentResult?.pix?.qr_code;

        // Determina um possível código EMV (texto copia e cola) evitando URLs
        const emvCandidate =
          lastPixTx?.pix?.emv ||
          pixPayment?.pix?.emv ||
          paymentResult?.pix?.emv ||
          (qrText && !/^https?:\/\//.test(qrText) ? qrText : null);

        // Se for URL http/https, usar o proxy do backend (usar URL absoluta como no restante do app)
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://backend-pula.onrender.com';
        const resolvedQrImage = qrImage && /^https?:\/\//.test(qrImage)
          ? `${backendUrl}/api/payments/qr-image?url=${encodeURIComponent(qrImage)}`
          : qrImage;

        const hasAnyQr = !!(resolvedQrImage || qrText);

        if (!hasAnyQr && paymentResult?.status === 'failed') {
          const gatewayMsg = paymentResult?.pix?.failure_reason
            || paymentResult?.last_transaction?.gateway_response?.errors?.[0]?.message
            || paymentResult?.charges?.[0]?.last_transaction?.gateway_response?.errors?.[0]?.message
            || 'Pagamento PIX retornou status failed. Tente novamente.';
          // Falha sem QR: tratar como erro e não como sucesso
          setPaymentState(prev => ({
            ...prev,
            isLoading: false,
            success: false,
            orderId: paymentResult.id,
            paymentStatus: paymentResult.status,
            paymentMethod: formData.paymentMethod,
            error: gatewayMsg
          }));
          return;
        }

        // Tentar recuperar EMV via backend se não veio junto
        let finalEmv = emvCandidate || null;
        const transactionId = lastPixTx?.id || paymentResult?.last_transaction?.id;
        if (!finalEmv && transactionId) {
          try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://backend-pula.onrender.com';
            const resp = await fetch(`${backendUrl}/api/payments/pix-details?transaction_id=${encodeURIComponent(transactionId)}`);
            if (resp.ok) {
              const data = await resp.json();
              const emvFromApi = data?.pix?.emv || (data?.pix?.qr_code && !/^https?:\/\//.test(data.pix.qr_code) ? data.pix.qr_code : null);
              if (emvFromApi) finalEmv = emvFromApi;
            }
          } catch(_) { /* ignore */ }
        }

        // Fallback adicional: se ainda não temos EMV, permitir copiar o próprio qr_code (mesmo que seja URL),
        // conforme sua solicitação para "Copiar Chave PIX" usando last_transaction.qr_code
        const fallbackCopyValue = lastPixTx?.qr_code
          || paymentResult?.charges?.[0]?.last_transaction?.qr_code
          || lastPixTx?.qr_code_url
          || null;

        setPaymentState(prev => ({
          ...prev,
          isLoading: false,
          success: true,
          orderId: paymentResult.id,
          paymentStatus: paymentResult.status,
          paymentMethod: formData.paymentMethod,
          // Se vier imagem base64, usamos no <img>; caso contrário, guardamos o texto para copiar
          pixQrCode: resolvedQrImage || (qrText && qrText.startsWith('data:image') ? qrText : null),
          pixCodeString: finalEmv || fallbackCopyValue || null
        }));

        if (paymentResult.status === 'paid') resetForm();
      } else {
        // Cartão/débito: tratar status diretamente
        const isSuccess = paymentResult?.status === 'paid' || paymentResult?.status === 'approved';
        const cardErrorMsg = paymentResult?.charges?.[0]?.last_transaction?.gateway_response?.errors?.[0]?.message
          || paymentResult?.charges?.[0]?.last_transaction?.gateway_response?.message
          || paymentResult?.error
          || 'Pagamento não aprovado. Tente outro cartão.';

        setPaymentState(prev => ({
          ...prev,
          isLoading: false,
          success: !!isSuccess,
          orderId: paymentResult.id,
          paymentStatus: paymentResult.status,
          paymentMethod: formData.paymentMethod,
          error: isSuccess ? null : cardErrorMsg
        }));

      if (isSuccess) resetForm();
      }

      // Retornar o resultado do pagamento para o chamador (onSuccess)
      return paymentResult;

    } catch(error) {
      console.error('Erro ao processar pagamento:', error);
      setPaymentState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao processar pagamento'
      }));
      return null;
    }
  }, [formData, user?.id, validateForm]);

  /** Cancelar pedido */
  const cancelOrder = useCallback(async (orderId, reason='Cancelamento') => {
    try {
      setPaymentState(prev => ({ ...prev, isLoading: true }));
      await securePaymentService.cancelPayment(orderId, reason);
      setPaymentState(prev => ({ ...prev, isLoading: false, success: true }));
    } catch(error) {
      console.error('Erro ao cancelar pedido:', error);
      setPaymentState(prev => ({ ...prev, isLoading: false, error: error.message || 'Erro ao cancelar pedido' }));
    }
  }, []);

  /** Resetar formulário */
  const resetForm = useCallback(() => {
    setFormData({
      paymentMethod: 'credit_card',
      customer: { name:'',email:'',document:'',phone:'',address:{street:'',number:'',complement:'',zip_code:'',neighborhood:'',city:'',state:''} },
      card: { number:'', holder_name:'', exp_month:'', exp_year:'', cvv:'' },
      items: []
    });
    setFormState({ isValid:false, isDirty:false, errors:{} });
    setPaymentState({ isLoading:false,error:null,success:false,orderId:null,paymentStatus:null,paymentMethod:null,pixQrCode:null });
  }, []);

  /** Adiciona item ao carrinho */
  const addItem = useCallback(item => {
    setFormData(prev => {
      if(prev.items.some(i=>i.code===item.code)) return prev;
      return { ...prev, items:[...prev.items,item] };
    });
  }, []);

  /** Cálculos */
  const calculateTotal = useCallback(()=>formData.items.reduce((sum,item)=>sum+item.amount*item.quantity,0),[formData.items]);
  
  // Taxa de conveniência
  const calculateConvenienceFee = useCallback(()=>{
    const subtotal = calculateTotal();
    if (subtotal < 3000) { // R$ 30,00 em centavos
      return 300; // R$ 3,00 em centavos
    } else {
      return Math.round(subtotal * 0.10); // 10%
    }
  },[calculateTotal]);

  // Taxa da processadora
  const calculateProcessorFee = useCallback(()=>{
    const subtotal = calculateTotal();
    switch(formData.paymentMethod){
      case 'credit_card': case 'debit_card': return Math.round(subtotal * 0.06); // 6%
      case 'pix': return Math.round(subtotal * 0.025); // 2,5%
      default: return 0;
    }
  },[formData.paymentMethod, calculateTotal]);

  // Taxa total (conveniência + processadora)
  const calculateFee = useCallback(()=>{
    return calculateConvenienceFee() + calculateProcessorFee();
  },[calculateConvenienceFee, calculateProcessorFee]);

  const calculateTotalWithFee = useCallback(() => {
    if (preCalculatedTotal !== null) {
      return preCalculatedTotal;
    }
    return calculateTotal() + calculateFee();
  }, [calculateTotal, calculateFee, preCalculatedTotal]);
  const formatCurrency = useCallback(value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100),[]);

  useEffect(()=>{ if(formState.isDirty) validateForm(); }, [formData, formState.isDirty, validateForm]);

  return {
    paymentState,
    formState,
    formData,
    validationState,
    updateFormData,
    setFormData,
    processPayment,
    cancelOrder,
    resetForm,
    addItem,
    validateField,
    getCardBrand,
    calculateTotal,
    calculateConvenienceFee,
    calculateProcessorFee,
    calculateFee,
    calculateTotalWithFee,
    formatCurrency
  };
};

// --- Auxiliares ---
function validateCPF(cpf){ const clean=cpf.replace(/\D/g,''); if(clean.length!==11 || /^(\d)\1{10}$/.test(clean)) return false; let sum=0; for(let i=0;i<9;i++) sum+=parseInt(clean[i])*(10-i); let r=sum%11,d1=r<2?0:11-r; sum=0; for(let i=0;i<10;i++) sum+=parseInt(clean[i])*(11-i); r=sum%11; let d2=r<2?0:11-r; return parseInt(clean[9])===d1 && parseInt(clean[10])===d2; }
function validateCNPJ(cnpj){ const clean=cnpj.replace(/\D/g,''); if(clean.length!==14 || /^(\d)\1{13}$/.test(clean)) return false; let sum=0,weight=5; for(let i=0;i<12;i++){sum+=parseInt(clean[i])*weight; weight=weight===2?9:weight-1;} let r=sum%11; let d1=r<2?0:11-r; sum=0; weight=6; for(let i=0;i<13;i++){sum+=parseInt(clean[i])*weight; weight=weight===2?9:weight-1;} r=sum%11; let d2=r<2?0:11-r; return parseInt(clean[12])===d1 && parseInt(clean[13])===d2; }
function formatCPF(cpf){ const clean=cpf.replace(/\D/g,''); return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'); }
function formatCNPJ(cnpj){ const clean=cnpj.replace(/\D/g,''); return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'); }
function formatPhone(phone){ const clean=phone.replace(/\D/g,''); return clean.length===11?clean.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3'):clean; }
function formatCEP(cep){ const clean=cep.replace(/\D/g,''); return clean.replace(/(\d{5})(\d{3})/,'$1-$2'); }
