import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertTriangle, CreditCard, Loader2, Check, XCircle, Tag } from 'lucide-react';
import PagBankService from '../services/pagbankService';
import { useAffiliateCode } from '../hooks/useAffiliateTracking';
import { createAffiliateSale } from '../services/affiliateTracking';
import { validateCoupon, registerCouponUsage } from '../services/couponService';
import CouponField from '../components/CouponField';

const CheckoutPagePagBank = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const affiliateCode = useAffiliateCode(); // Obter código do afiliado do cookie

  // Ref para armazenar timeouts e garantir cleanup
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  // Função helper para criar timeouts com cleanup automático
  const createTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timeout = setTimeout(() => {
      timeoutRefs.current.delete(timeout);
      callback();
    }, delay);
    timeoutRefs.current.add(timeout);
    return timeout;
  };

  // Cleanup de todos os timeouts ao desmontar
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'credit_card' | null>(null);
  const [paymentStep, setPaymentStep] = useState<'select' | 'form' | 'processing' | 'success' | 'pending' | 'failed'>('select');
  const [pixData, setPixData] = useState<any>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Estado local para dados restaurados do localStorage
  const [restoredData, setRestoredData] = useState(null);

  // Estados do formulário de dados do cliente
  const [customerData, setCustomerData] = useState({
    document: '',
    phone: ''
  });

  // Estados do formulário de cartão
  const [cardData, setCardData] = useState({
    number: '',
    holder_name: '',
    exp_month: '',
    exp_year: '',
    security_code: ''
  });

  // Estados do cupom de desconto
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Usar restoredData se disponível, senão usar state do useLocation
  const finalData = restoredData || state || {};
  const { event, selectedTickets, totalAmount, ticket } = finalData;

  // Calcular valores usando dados finais (restoredData ou state) - DECLARAR ANTES DOS CALLBACKS
  const finalSelectedTickets = (restoredData as any)?.selectedTickets || selectedTickets;
  const finalTicket = (restoredData as any)?.ticket || ticket;
  const finalEvent = (restoredData as any)?.event || event;
  const finalTotalAmount = (restoredData as any)?.totalAmount || totalAmount;

  // Garantir que use a URL correta do backend
  const backendUrl = import.meta.env.VITE_PAGBANK_API_URL || 'http://localhost:3000/api/payments';
  const pagBankService = new PagBankService(backendUrl);

  // Declarar funções ANTES dos useEffect para evitar re-renderizações
  const loadUserData = useCallback(async () => {
    try {
      if (!user?.id) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      if (profile.role === 'organizer') {
        alert('Organizadores não podem comprar ingressos.');
        navigate('/');
        return;
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  }, [user, navigate]);

  const loadEventData = useCallback(async () => {
    try {
      // Usar finalEvent se disponível
      const eventIdToLoad = finalEvent?.id;

      if (!eventIdToLoad) {
        console.error('❌ ID do evento não encontrado');
        console.error('📦 Dados disponíveis:', { finalEvent, restoredData, event });
        return;
      }

      const { data: eventDetails, error } = await supabase
        .from('events')
        .select('*, service_fee_payer, service_fee_type')
        .eq('id', eventIdToLoad)
        .eq('status', 'approved')
        .single();

      if (error) {
        console.error('Erro ao carregar evento:', error);
        alert('Evento não encontrado ou não está disponível para compra.');
        navigate('/');
        return;
      }

      console.log('🔍 Evento carregado para checkout:', {
        id: eventDetails.id,
        title: eventDetails.title,
        service_fee_payer: eventDetails.service_fee_payer,
        service_fee_type: eventDetails.service_fee_type
      });

      setEventData(eventDetails);
    } catch (error) {
      console.error('Erro inesperado ao carregar evento:', error);
    } finally {
      setIsLoading(false);
    }
  }, [finalEvent, navigate]);

  // useEffect para restaurar dados do localStorage (executa apenas uma vez)
  useEffect(() => {
    console.log('🔄 CheckoutPagePagBank - useEffect de restauração iniciado');
    console.log('📦 state do useLocation:', state);
    console.log('📦 restoredData atual:', restoredData);

    // Se já temos dados via useLocation, não precisamos restaurar do localStorage
    if (state && (state.event || state.selectedTickets || state.ticket)) {
      console.log('✅ Dados já recebidos via useLocation, não precisa restaurar do localStorage');
      if (state.event && (state.selectedTickets || state.ticket)) {
        setRestoredData(state);
        return;
      }
    }

    // Se já temos restoredData válido, não fazer nada
    if (restoredData && restoredData.event && (restoredData.selectedTickets || restoredData.ticket)) {
      console.log('✅ restoredData já está válido, não precisa restaurar novamente');
      return;
    }

    // Tentar restaurar de checkout_restore_data primeiro
    const localStorageData = localStorage.getItem('checkout_restore_data');
    if (localStorageData) {
      try {
        const parsedData = JSON.parse(localStorageData);
        console.log('💾 Dados encontrados no checkout_restore_data:', parsedData);

        // Validar se os dados são completos
        if (parsedData.event && (parsedData.selectedTickets || parsedData.ticket)) {
          console.log('✅ Dados válidos encontrados, restaurando...');
          localStorage.removeItem('checkout_restore_data');
          setRestoredData(parsedData);
          return;
        } else {
          console.log('⚠️ Dados incompletos no checkout_restore_data, limpando...');
          localStorage.removeItem('checkout_restore_data');
        }
      } catch (error) {
        console.error('❌ Erro ao parsear checkout_restore_data:', error);
        localStorage.removeItem('checkout_restore_data');
      }
    }

    // Fallback: tentar restaurar do cartStorage
    try {
      const { hasValidCartData, getCartData, clearCartData } = require('../utils/cartStorage');
      if (hasValidCartData()) {
        const cartData = getCartData();
        if (cartData && cartData.state) {
          console.log('💾 Dados encontrados no cartStorage:', cartData);
          const restoredState = {
            event: cartData.state.event,
            selectedTickets: cartData.state.selectedTickets,
            totalAmount: cartData.state.totalAmount,
            ticket: cartData.state.ticket
          };

          // Validar se os dados são completos
          if (restoredState.event && (restoredState.selectedTickets || restoredState.ticket)) {
            console.log('✅ Dados válidos do cartStorage, restaurando...');
            setRestoredData(restoredState);
            clearCartData();
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao restaurar do cartStorage:', error);
    }
  }, []); // SEM dependências - executa apenas uma vez

  // useEffect para carregar dados (executa quando dados mudarem)
  useEffect(() => {
    console.log('🔄 CheckoutPagePagBank - Dados recebidos:', {
      event: finalEvent?.id,
      selectedTickets: finalSelectedTickets?.length,
      totalAmount: finalTotalAmount,
      ticket: finalTicket?.id,
      state: !!state,
      restoredData: !!restoredData
    });
    console.log('🌐 Backend URL configurada:', backendUrl);

    console.log('🔍 Validação de dados:', {
      hasEvent: !!finalEvent,
      eventId: finalEvent?.id,
      hasSelectedTickets: !!finalSelectedTickets && finalSelectedTickets.length > 0,
      ticketsCount: finalSelectedTickets?.length,
      hasTicket: !!finalTicket
    });

    if (!finalEvent || (!finalSelectedTickets?.length && !finalTicket)) {
      console.warn('❌ Dados do evento ou dos ingressos não encontrados. Redirecionando...');
      console.warn('📦 Dados disponíveis:', {
        event: finalEvent,
        selectedTickets: finalSelectedTickets,
        ticket: finalTicket,
        restoredData: restoredData
      });
      // Dar um pequeno delay antes de redirecionar para dar tempo de restaurar
      const timeoutId = createTimeout(() => {
        // Verificar novamente antes de redirecionar
        const currentFinalEvent = (restoredData as any)?.event || event;
        const currentFinalTickets = (restoredData as any)?.selectedTickets || selectedTickets;
        const currentFinalTicket = (restoredData as any)?.ticket || ticket;

        if (!currentFinalEvent || (!currentFinalTickets?.length && !currentFinalTicket)) {
          navigate('/');
        }
      }, 500);
    }

    if (user && finalEvent) {
      loadUserData();
      loadEventData();
    } else if (!user) {
      setIsLoading(false);
    }
  }, [restoredData, event, selectedTickets, ticket, navigate, user, state, loadUserData, loadEventData, finalEvent, finalSelectedTickets, finalTicket]);

  // Calcular valores usando dados finais (já declarados acima)
  const subtotalReais = finalSelectedTickets?.reduce((sum: number, t: any) => sum + (t.price * t.quantity), 0) || finalTicket?.price || 0;
  const subtotal = Math.round(subtotalReais * 100); // Centavos

  // Determinar quem paga as taxas baseado no evento (usar finalEvent se eventData ainda não carregou)
  const serviceFeePayer = eventData?.service_fee_payer || finalEvent?.service_fee_payer || 'buyer'; // Default para buyer se não definido
  const isBuyerPayingConvenienceFee = serviceFeePayer === 'buyer';

  console.log('💰 Configuração de taxas:', {
    serviceFeePayer,
    isBuyerPayingConvenienceFee,
    eventTitle: eventData?.title
  });

  // SEMPRE calcular as taxas
  const taxaConveniencia = subtotal < 3000 ? 300 : Math.round(subtotal * 0.10);
  const taxaProcessadora = selectedPaymentMethod === 'credit_card' ? Math.round(subtotal * 0.06) : Math.round(subtotal * 0.025);

  // LÓGICA CORRETA:
  // - Taxa da Processadora: SEMPRE paga pelo cliente
  // - Taxa de Conveniência: paga pelo cliente OU pelo organizador (conforme configuração)
  const totalPrice = subtotal + taxaProcessadora + (isBuyerPayingConvenienceFee ? taxaConveniencia : 0);

  console.log('💰 Cálculo final de taxas:', {
    subtotal,
    taxaConveniencia,
    taxaProcessadora,
    totalPrice,
    serviceFeePayer,
    isBuyerPayingConvenienceFee,
    selectedPaymentMethod,
    clientePagaConveniencia: isBuyerPayingConvenienceFee,
    clientePagaProcessadora: true, // Sempre
    organizadorPagaConveniencia: !isBuyerPayingConvenienceFee,
    totalCliente: totalPrice,
    totalOrganizadorPaga: !isBuyerPayingConvenienceFee ? taxaConveniencia : 0
  });

  // Função para validar e aplicar cupom
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    // Regra: Não permitir cupom se houver código de afiliado
    if (affiliateCode) {
      setCouponError('Não é possível usar cupom com link de afiliado');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const result = await validateCoupon(
        couponCode,
        finalEvent.id,
        user!.id,
        subtotalReais
      );

      if (result.isValid && result.coupon) {
        setAppliedCoupon(result.coupon);
        setCouponError(null);
        console.log('✅ Cupom aplicado:', result.coupon.code, '- Desconto:', result.discountAmount);
      } else {
        setCouponError(result.error || 'Cupom inválido');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      setCouponError('Erro ao validar cupom. Tente novamente.');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Calcular desconto do cupom
  const calculateCouponDiscount = () => {
    if (!appliedCoupon) return 0;

    let discount = 0;
    if (appliedCoupon.discount_type === 'percentage') {
      discount = subtotal * (appliedCoupon.discount_value / 100);
    } else {
      discount = Math.round(appliedCoupon.discount_value * 100); // Converter para centavos
    }

    // Garantir que o desconto não seja maior que o subtotal
    return Math.min(discount, subtotal);
  };

  const couponDiscount = calculateCouponDiscount();
  const subtotalAfterDiscount = subtotal - couponDiscount;

  // Recalcular taxas baseadas no subtotal com desconto
  const taxaConvenienciaFinal = subtotalAfterDiscount < 3000 ? 300 : Math.round(subtotalAfterDiscount * 0.10);
  const taxaProcessadoraFinal = selectedPaymentMethod === 'credit_card'
    ? Math.round(subtotalAfterDiscount * 0.06)
    : Math.round(subtotalAfterDiscount * 0.025);

  // Total final com desconto aplicado
  const totalPriceWithDiscount = subtotalAfterDiscount + taxaProcessadoraFinal + (isBuyerPayingConvenienceFee ? taxaConvenienciaFinal : 0);

  const handlePaymentMethodSelect = (method: 'pix' | 'credit_card') => {
    setSelectedPaymentMethod(method);
    setPaymentStep('form');
  };

  const createOrder = async () => {
    try {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Preparar itens do pedido usando dados finais
      const orderItems = [];
      const ticketsToUse = finalSelectedTickets || selectedTickets;
      const ticketToUse = finalTicket || ticket;
      const eventToUse = finalEvent || event;

      if (ticketsToUse && ticketsToUse.length > 0) {
        ticketsToUse.forEach((ticket: any) => {
          orderItems.push({
            amount: Math.round(ticket.price * 100),
            description: `${ticket.ticketName} - ${eventToUse.title}`,
            quantity: ticket.quantity,
            code: `TICKET_${ticket.ticketId || Date.now()}`,
            name: `${ticket.ticketName} - ${ticket.gender === 'masculine' ? 'Masculino' : 'Feminino'}`
          });
        });
      } else if (ticketToUse) {
        orderItems.push({
          amount: Math.round(ticketToUse.price * 100),
          description: `${ticketToUse.name} - ${eventToUse.title}`,
          quantity: 1,
          code: `TICKET_${Date.now()}`,
          name: ticket.name
        });
      }

      // Criar order no Supabase com metadata completo
      const orderData = {
        user_id: user.id,
        customer_id: user.id,
        customer_name: userProfile?.name || user.email,
        customer_email: user.email,
        customer_document: userProfile?.document || null,
        customer_phone: userProfile?.phone || null,
        event_id: eventToUse.id,
        order_code: `ORD-${Date.now()}`,
        quantity: ticketsToUse?.reduce((sum: number, t: any) => sum + t.quantity, 0) || 1,
        total_amount: (appliedCoupon ? totalPriceWithDiscount : totalPrice) / 100,
        payment_status: 'pending',
        ticket_type: ticketsToUse?.[0]?.ticketName || ticketToUse?.name || 'Ingresso',
        payment_method: selectedPaymentMethod === 'pix' ? 'pix' : 'credit_card',
        metadata: {
          items: orderItems,
          fees: {
            convenience_fee_cents: appliedCoupon ? taxaConvenienciaFinal : taxaConveniencia,
            processor_fee_cents: appliedCoupon ? taxaProcessadoraFinal : taxaProcessadora,
            subtotal_cents: subtotal,
            discount_cents: couponDiscount,
            subtotal_after_discount_cents: subtotalAfterDiscount,
            total_cents: appliedCoupon ? totalPriceWithDiscount : totalPrice,
            service_fee_payer: serviceFeePayer,
            is_buyer_paying_convenience_fee: isBuyerPayingConvenienceFee,
            buyer_pays_convenience: isBuyerPayingConvenienceFee,
            buyer_pays_processor: true, // Sempre
            organizer_pays_convenience: !isBuyerPayingConvenienceFee,
            buyer_total_fees: taxaProcessadora + (isBuyerPayingConvenienceFee ? taxaConveniencia : 0),
            organizer_total_fees: !isBuyerPayingConvenienceFee ? taxaConveniencia : 0
          },
          coupon: appliedCoupon ? {
            id: appliedCoupon.id,
            code: appliedCoupon.code,
            discount_type: appliedCoupon.discount_type,
            discount_value: appliedCoupon.discount_value,
            discount_amount_cents: couponDiscount
          } : null,
          event_id: eventToUse.id,
          customer: {
            name: userProfile?.name || user.email,
            email: user.email,
            document: userProfile?.document || null,
            phone: userProfile?.phone || null
          }
        },
        created_at: new Date().toISOString()
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Order criado:', order);
      return order;
    } catch (error) {
      console.error('❌ Erro ao criar order:', error);
      throw error;
    }
  };

  const handlePixPayment = async () => {
    if (!user || !userProfile) {
      alert('Dados do usuário incompletos.');
      return;
    }

    // Definir eventToUse no escopo da função
    const eventToUse = finalEvent || event;

    // Validar CPF
    const cpf = (customerData.document || userProfile.document || '').replace(/\D/g, '');
    if (!cpf || cpf === '00000000000' || cpf.length !== 11) {
      alert('Por favor, informe um CPF válido para continuar.');
      return;
    }

    // Validar telefone
    const phone = (customerData.phone || userProfile.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      alert('Por favor, informe um telefone válido para continuar.');
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      // 1. Criar order no Supabase
      const order = await createOrder();

      // 2. Preparar dados para PagBank
      const pixOrder = {
        reference_id: order.order_code,
        customer: {
          name: userProfile.name || user.email,
          email: user.email,
          tax_id: cpf,
          phones: [{
            country: '55',
            area: phone.substring(0, 2),
            number: phone.substring(2),
            type: 'MOBILE'
          }]
        },
        items: [{
          name: `Ingresso - ${eventToUse.title}`,
          quantity: order.quantity,
          unit_amount: Math.round((order.total_amount * 100) / order.quantity)
        }],
        qr_codes: [{
          amount: {
            value: Math.round(order.total_amount * 100)
          },
          expiration_date: new Date(Date.now() + 3600000).toISOString() // 1 hora
        }],
        notification_urls: [import.meta.env.VITE_PAGBANK_WEBHOOK_URL || 'http://localhost:3000/api/payments/webhook']
      };

      // 3. Criar PIX no PagBank
      const response = await pagBankService.createPixOrder(pixOrder);

      console.log('✅ PIX criado:', response);

      // 4. Atualizar order com ID do PagBank
      const { error: updateError } = await supabase
        .from('orders')
        .update({ pagbank_order_id: response.id })
        .eq('id', order.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar pagbank_order_id:', updateError);
      } else {
        console.log('✅ pagbank_order_id salvo:', response.id);
      }

      // Registrar uso do cupom (se aplicado)
      if (appliedCoupon) {
        try {
          await registerCouponUsage(
            appliedCoupon.id,
            user.id,
            order.id,
            subtotalReais,
            couponDiscount / 100,
            subtotalAfterDiscount / 100
          );
          console.log('✅ Uso do cupom registrado');
        } catch (couponError) {
          console.error('❌ Erro ao registrar uso do cupom:', couponError);
          // Não bloquear a compra por erro no cupom
        }
      }

      // 5. Criar transactions expandidas por quantidade
      const transactionRows: any[] = [];
      if (response.qr_codes && response.qr_codes[0]) {
        const paymentId = (response.qr_codes[0] as any).id || response.id;
        const orderItems = order.metadata?.items || [];

        let globalIndex = 0; // Contador global para garantir que apenas a primeira transaction tenha pagbank_transaction_id

        orderItems.forEach((it: any) => {
          const qty = Number(it.quantity || 1);
          const unitReais = Number((it.amount / 100).toFixed(2));
          for (let i = 0; i < qty; i++) {
            transactionRows.push({
              order_id: order.id,
              user_id: user.id,
              buyer_id: user.id,
              event_id: eventToUse.id,
              ticket_id: null,
              amount: unitReais,
              status: 'pending', // PIX inicia como pending
              payment_method: 'pix',
              payment_id: paymentId,
              // Só a primeira transaction tem pagbank_transaction_id (evita duplicação)
              pagbank_transaction_id: globalIndex === 0 ? paymentId : null,
              metadata: {
                order_id: order.id,
                pagbank_order_id: response.id,
                item: {
                  code: it.code,
                  name: it.name || it.description,
                  amount_cents: it.amount
                }
              }
            });
            globalIndex++; // Incrementar contador global
          }
        });

        if (transactionRows.length > 0) {
          console.log('📝 Inserindo transactions PIX =>', { count: transactionRows.length });
          const { data: trxInserted, error: trxErr } = await supabase
            .from('transactions')
            .insert(transactionRows)
            .select('id, status, amount, payment_method');

          if (trxErr) {
            console.error('❌ Erro ao criar transactions:', trxErr);
          } else {
            console.log('✅ Transactions PIX inseridas:', trxInserted?.length || 0);
          }
        }
      }

      setPixData(response);
      setPaymentStep('success');
    } catch (error: any) {
      console.error('❌ Erro ao processar PIX:', error);
      alert(`Erro ao gerar PIX: ${error.message}`);
      setPaymentStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!user || !userProfile) {
      alert('Dados do usuário incompletos.');
      return;
    }

    // Definir eventToUse no escopo da função
    const eventToUse = finalEvent || event;

    // Validar CPF
    const cpf = (customerData.document || userProfile.document || '').replace(/\D/g, '');
    if (!cpf || cpf === '00000000000' || cpf.length !== 11) {
      alert('Por favor, informe um CPF válido para continuar.');
      return;
    }

    // Validar telefone
    const phone = (customerData.phone || userProfile.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      alert('Por favor, informe um telefone válido para continuar.');
      return;
    }

    // Validar campos do cartão
    if (!cardData.number || !cardData.holder_name || !cardData.exp_month || !cardData.exp_year || !cardData.security_code) {
      alert('Preencha todos os dados do cartão.');
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      // **IMPORTANTE: Criptografar o cartão usando o SDK do PagBank**
      const publicKey = import.meta.env.VITE_PAGBANK_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error('Chave pública do PagBank não configurada. Configure VITE_PAGBANK_PUBLIC_KEY no arquivo .env');
      }

      // Verificar se o SDK do PagBank está disponível
      if (typeof window.PagSeguro === 'undefined') {
        throw new Error('SDK do PagBank não carregado. Recarregue a página e tente novamente.');
      }

      console.log('🔐 Criptografando dados do cartão...');

      // Converter ano de 2 para 4 dígitos
      const fullYear = cardData.exp_year.length === 2 ? `20${cardData.exp_year}` : cardData.exp_year;

      const cardEncryption = window.PagSeguro.encryptCard({
        publicKey: publicKey,
        holder: cardData.holder_name,
        number: cardData.number.replace(/\s/g, ''),
        expMonth: cardData.exp_month.padStart(2, '0'),
        expYear: fullYear,
        securityCode: cardData.security_code
      });

      // Verificar se houve erros na criptografia
      if (cardEncryption.hasErrors) {
        const errorMessages = cardEncryption.errors.map(err => `${err.code}: ${err.message}`).join('\n');
        console.error('❌ Erros na criptografia do cartão:', cardEncryption.errors);
        throw new Error(`Erro ao validar dados do cartão:\n${errorMessages}`);
      }

      if (!cardEncryption.encryptedCard) {
        throw new Error('Falha ao criptografar o cartão. Tente novamente.');
      }

      console.log('✅ Cartão criptografado com sucesso');

      // 1. Criar order no Supabase
      const order = await createOrder();

      // 2. Preparar dados para PagBank com CARTÃO CRIPTOGRAFADO
      const cardOrder = {
        reference_id: order.order_code,
        customer: {
          name: userProfile.name || user.email,
          email: user.email,
          tax_id: cpf,
          phones: [{
            country: '55',
            area: phone.substring(0, 2),
            number: phone.substring(2),
            type: 'MOBILE'
          }]
        },
        items: [{
          name: `Ingresso - ${eventToUse.title}`,
          quantity: order.quantity,
          unit_amount: Math.round((order.total_amount * 100) / order.quantity)
        }],
        charges: [{
          reference_id: `charge-${Date.now()}`,
          description: `Pagamento - ${eventToUse.title}`,
          amount: {
            value: Math.round(order.total_amount * 100),
            currency: 'BRL'
          },
          payment_method: {
            type: 'CREDIT_CARD',
            installments: 1,
            capture: true,
            soft_descriptor: 'PulaKatraca',
            card: {
              // Enviar cartão CRIPTOGRAFADO
              encrypted: cardEncryption.encryptedCard
            }
          }
        }],
        notification_urls: [import.meta.env.VITE_PAGBANK_WEBHOOK_URL || 'http://localhost:3000/api/payments/webhook']
      };

      // 3. Processar pagamento no PagBank
      const response = await pagBankService.createCardOrder(cardOrder);

      console.log('✅ Cartão processado:', response);
      console.log('🔍 Status do PagBank:', response.charges?.[0]?.status);

      // Detectar status do pagamento
      const chargeStatus = response.charges?.[0]?.status;
      const paymentId = response.charges?.[0]?.id;
      const paymentResponse = response.charges?.[0]?.payment_response;

      // Mapear status do PagBank para nosso sistema
      const getPaymentStatus = (status: string) => {
        switch (status) {
          case 'PAID': return 'paid';
          case 'DECLINED':
          case 'CANCELED': return 'failed';
          case 'IN_ANALYSIS':
          case 'WAITING': return 'pending';
          default: return 'pending';
        }
      };

      const orderStatus = getPaymentStatus(chargeStatus);
      const isPaid = chargeStatus === 'PAID';
      const isDeclined = chargeStatus === 'DECLINED' || chargeStatus === 'CANCELED';

      console.log('📊 Status mapeado:', {
        chargeStatus,
        orderStatus,
        isPaid,
        isDeclined,
        paymentResponse: paymentResponse?.message || paymentResponse?.code
      });

      // 4. Atualizar order com ID do PagBank e status CORRETO
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          pagbank_order_id: response.id,
          payment_status: orderStatus,
          paid_at: orderStatus === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar pagbank_order_id:', updateError);
      } else {
        console.log('✅ pagbank_order_id e status salvos:', { id: response.id, status: orderStatus });
      }

      // Registrar uso do cupom (se aplicado)
      if (appliedCoupon) {
        try {
          await registerCouponUsage(
            appliedCoupon.id,
            user.id,
            order.id,
            subtotalReais,
            couponDiscount / 100,
            subtotalAfterDiscount / 100
          );
          console.log('✅ Uso do cupom registrado');
        } catch (couponError) {
          console.error('❌ Erro ao registrar uso do cupom:', couponError);
          // Não bloquear a compra por erro no cupom
        }
      }

      // 5. Criar transaction com status CORRETO
      const transactionRows: any[] = [];
      if (response.charges && response.charges[0]) {
        const orderItems = order.metadata?.items || [];

        let globalIndex = 0;

        orderItems.forEach((it: any) => {
          const qty = Number(it.quantity || 1);
          const unitReais = Number((it.amount / 100).toFixed(2));
          for (let i = 0; i < qty; i++) {
            transactionRows.push({
              order_id: order.id,
              user_id: user.id,
              buyer_id: user.id,
              event_id: eventToUse.id,
              ticket_id: null,
              amount: unitReais,
              status: isPaid ? 'completed' : (isDeclined ? 'failed' : 'pending'),
              payment_method: 'credit_card',
              payment_id: paymentId,
              pagbank_transaction_id: globalIndex === 0 ? paymentId : null,
              metadata: {
                order_id: order.id,
                pagbank_order_id: response.id,
                charge_status: chargeStatus,
                item: {
                  code: it.code,
                  name: it.name || it.description,
                  amount_cents: it.amount
                }
              }
            });
            globalIndex++;
          }
        });

        if (transactionRows.length > 0) {
          console.log('📝 Inserindo transactions =>', { count: transactionRows.length });
          const { data: trxInserted, error: trxErr } = await supabase
            .from('transactions')
            .insert(transactionRows)
            .select('id, status, amount, payment_method');

          if (trxErr) {
            console.error('❌ Erro ao criar transactions:', trxErr);
          } else {
            console.log('✅ Transactions inseridas:', trxInserted?.length || 0);
          }
        }

        // 6. Criar tickets SOMENTE se pagamento aprovado
        if (isPaid) {
          const ticketsRows: any[] = [];
          orderItems.forEach((it: any) => {
            const qty = Number(it.quantity || 1);
            const unitReais = Number((it.amount / 100).toFixed(2));
            for (let i = 0; i < qty; i++) {
              const qrCode = `PLKTK_${eventToUse.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              ticketsRows.push({
                user_id: user.id,
                event_id: eventToUse.id,
                price: unitReais,
                status: 'active',
                qr_code: qrCode,
                ticket_type: it.name || it.description || 'ticket',
                metadata: {
                  order_id: order.id,
                  pagbank_order_id: response.id,
                  payment_id: paymentId,
                  item: { code: it.code, amount_cents: it.amount }
                }
              });
            }
          });

          if (ticketsRows.length > 0) {
            console.log('🎟️ Inserindo tickets =>', { count: ticketsRows.length });
            const { data: ticketsInserted, error: ticketsErr } = await supabase
              .from('tickets')
              .insert(ticketsRows)
              .select('id, status, qr_code, price');

            if (ticketsErr) {
              console.error('❌ Erro ao criar tickets:', ticketsErr);
            } else {
              console.log('✅ Tickets criados:', ticketsInserted?.length || 0);
            }
          }
        }
      }

      // 7. Determinar próximo passo baseado no status REAL
      if (isPaid) {
        // Pagamento aprovado - mostrar sucesso
        console.log('✅ Pagamento aprovado!');

        // Registrar venda de afiliado se houver código
        if (affiliateCode) {
          console.log('💰 Registrando venda de afiliado:', affiliateCode);
          const affiliateSaleSuccess = await createAffiliateSale(
            affiliateCode,
            eventToUse.id,
            {
              transactionId: order.id,
              ticketId: ticketsInserted?.[0]?.id || null,
              saleAmount: order.total_amount,
            }
          );

          if (affiliateSaleSuccess) {
            console.log('✅ Venda de afiliado registrada com sucesso!');
          } else {
            console.warn('⚠️ Falha ao registrar venda de afiliado');
          }
        }

        setPaymentStep('success');
        createTimeout(() => {
          navigate('/profile', {
            state: {
              message: '🎉 Pagamento aprovado! Seus ingressos estão disponíveis.',
              showSuccess: true
            }
          });
        }, 3000);
      } else if (isDeclined) {
        // Pagamento recusado - mostrar erro
        const errorMessage = paymentResponse?.message
          || paymentResponse?.code
          || 'Pagamento recusado pelo banco. Tente outro cartão.';

        console.error('❌ Pagamento recusado:', errorMessage);
        setDeclineError(errorMessage);
        setShowDeclineModal(true);
      } else {
        // Em análise ou pendente - mostrar warning
        console.log('⏳ Pagamento em análise');
        alert('⏳ Seu pagamento está sendo analisado. Aguarde a confirmação.\n\nVocê será redirecionado para ver o status.');
        setPaymentStep('pending');
        createTimeout(() => {
          navigate('/profile');
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar cartão:', error);
      alert(`Erro ao processar pagamento: ${error.message}`);
      setPaymentStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (!finalEvent || (!finalSelectedTickets?.length && !finalTicket)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dados inválidos</h2>
          <p className="text-gray-600">Selecione um evento antes de prosseguir.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-4 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Finalizar Compra</h1>
            <p className="text-sm sm:text-base text-gray-600">Pagamento seguro via PagBank</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Side: Payment Forms */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Event Details */}
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
                <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Detalhes do Evento</h2>
                <div className="flex items-start space-x-3 sm:space-x-4">
                  {finalEvent.image && (
                    <img
                      src={finalEvent.image}
                      alt={finalEvent.title}
                      className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{finalEvent.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      📅 {new Date(finalEvent.date || finalEvent.start_date).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      📍 {finalEvent.location || finalEvent.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cupom de Desconto */}
              {paymentStep === 'select' && (
                <CouponField
                  couponCode={couponCode}
                  setCouponCode={setCouponCode}
                  appliedCoupon={appliedCoupon}
                  couponError={couponError}
                  isValidatingCoupon={isValidatingCoupon}
                  onValidate={handleValidateCoupon}
                  onRemove={handleRemoveCoupon}
                  disabled={!!affiliateCode}
                />
              )}

              {/* Payment Method Selection or Forms */}
              {paymentStep === 'select' && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-800 text-center sm:text-left">
                    Escolha o Método de Pagamento
                  </h2>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <button
                      onClick={() => handlePaymentMethodSelect('pix')}
                      className="group p-4 sm:p-6 border-2 border-pink-200 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-all active:scale-98"
                    >
                      <div className="flex items-center sm:flex-col sm:items-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-pink-100 rounded-full flex items-center justify-center mr-4 sm:mr-0 sm:mb-4 group-hover:bg-pink-200 transition-colors flex-shrink-0">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-left sm:text-center">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 sm:mb-2">PIX</h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Pagamento instantâneo • Aprovação imediata
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePaymentMethodSelect('credit_card')}
                      className="group p-4 sm:p-6 border-2 border-pink-200 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-all active:scale-98"
                    >
                      <div className="flex items-center sm:flex-col sm:items-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-pink-100 rounded-full flex items-center justify-center mr-4 sm:mr-0 sm:mb-4 group-hover:bg-pink-200 transition-colors flex-shrink-0">
                          <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600" />
                        </div>
                        <div className="flex-1 text-left sm:text-center">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 sm:mb-2">Cartão de Crédito</h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Visa, Mastercard, Elo • Parcelamento disponível
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* PIX Form */}
              {paymentStep === 'form' && selectedPaymentMethod === 'pix' && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
                  <button
                    onClick={() => {
                      setPaymentStep('select');
                      setSelectedPaymentMethod(null);
                    }}
                    className="text-pink-600 hover:text-pink-700 mb-4 text-sm font-medium"
                  >
                    ← Voltar
                  </button>

                  <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-800">Pagamento via PIX</h2>

                  {/* Campos de dados do cliente */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        CPF *
                      </label>
                      <input
                        type="text"
                        value={customerData.document}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setCustomerData({ ...customerData, document: value });
                        }}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {userProfile?.document ? `Perfil: ${userProfile.document}` : 'Obrigatório para pagamento'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Telefone *
                      </label>
                      <input
                        type="text"
                        value={customerData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setCustomerData({ ...customerData, phone: value });
                        }}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {userProfile?.phone ? `Perfil: ${userProfile.phone}` : 'Obrigatório para pagamento'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-pink-900">Pagamento PIX</h3>
                        <p className="text-sm text-pink-700 mt-1">
                          Preencha seus dados e clique no botão abaixo para gerar o QR Code. O pagamento é instantâneo e seguro.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePixPayment}
                    disabled={isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-pink-600 hover:to-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="animate-spin mr-2" />
                        Gerando PIX...
                      </span>
                    ) : (
                      'Gerar QR Code PIX'
                    )}
                  </button>
                </div>
              )}

              {/* Card Form */}
              {paymentStep === 'form' && selectedPaymentMethod === 'credit_card' && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
                  <button
                    onClick={() => {
                      setPaymentStep('select');
                      setSelectedPaymentMethod(null);
                    }}
                    className="text-pink-600 hover:text-pink-700 mb-4 text-sm font-medium"
                  >
                    ← Voltar
                  </button>

                  <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-800">Dados do Cartão de Crédito</h2>

                  <div className="space-y-4">
                    {/* Campos de dados do cliente */}
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        CPF *
                      </label>
                      <input
                        type="text"
                        value={customerData.document}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setCustomerData({ ...customerData, document: value });
                        }}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {userProfile?.document ? `Perfil: ${userProfile.document}` : 'Obrigatório para pagamento'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Telefone *
                      </label>
                      <input
                        type="text"
                        value={customerData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setCustomerData({ ...customerData, phone: value });
                        }}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {userProfile?.phone ? `Perfil: ${userProfile.phone}` : 'Obrigatório para pagamento'}
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Número do Cartão</label>
                      <input
                        type="text"
                        value={cardData.number}
                        onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Nome no Cartão</label>
                      <input
                        type="text"
                        value={cardData.holder_name}
                        onChange={(e) => setCardData({ ...cardData, holder_name: e.target.value.toUpperCase() })}
                        placeholder="NOME COMO NO CARTÃO"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 uppercase transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Mês</label>
                        <input
                          type="text"
                          value={cardData.exp_month}
                          onChange={(e) => setCardData({ ...cardData, exp_month: e.target.value })}
                          placeholder="MM"
                          maxLength={2}
                          className="w-full p-2 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">Ano</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-semibold">20</span>
                          <input
                            type="text"
                            value={cardData.exp_year}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                              setCardData({ ...cardData, exp_year: value });
                            }}
                            placeholder="00"
                            maxLength={2}
                            className="w-full p-2 sm:p-3 pl-8 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all text-center"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold mb-2 text-gray-700">CVV</label>
                        <input
                          type="text"
                          value={cardData.security_code}
                          onChange={(e) => setCardData({ ...cardData, security_code: e.target.value })}
                          placeholder="123"
                          maxLength={3}
                          className="w-full p-2 sm:p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all text-center"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                      <p className="text-xs text-pink-800">
                        🔒 <strong>Pagamento Seguro:</strong> Seus dados são criptografados e processados com segurança pelo PagBank.
                      </p>
                    </div>

                    <button
                      onClick={handleCardPayment}
                      disabled={isProcessing}
                      className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-pink-600 hover:to-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl mt-6"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="animate-spin mr-2" />
                          Processando...
                        </span>
                      ) : (
                        `Pagar R$ ${(totalPrice / 100).toFixed(2)}`
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Processing State */}
              {paymentStep === 'processing' && (
                <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 border border-gray-200 text-center">
                  <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-pink-600 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Processando Pagamento...</h3>
                  <p className="text-sm sm:text-base text-gray-600">Aguarde alguns instantes</p>
                </div>
              )}

              {/* Success State - PIX */}
              {paymentStep === 'success' && selectedPaymentMethod === 'pix' && pixData && (
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-2 border-pink-500">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-pink-600" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-pink-800 mb-2">PIX Gerado com Sucesso!</h2>
                    <p className="text-sm sm:text-base text-gray-600">Escaneie o QR Code ou copie o código abaixo</p>
                  </div>

                  {pixData.qr_codes && pixData.qr_codes[0] && (
                    <>
                      {/* QR Code */}
                      <div className="flex justify-center mb-6">
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xl border-4 border-pink-500">
                          {pixData.qr_codes[0].links?.find((l: any) => l.media === 'image/png') ? (
                            <img
                              src={pixData.qr_codes[0].links.find((l: any) => l.media === 'image/png').href}
                              alt="QR Code PIX"
                              className="w-48 h-48 sm:w-64 sm:h-64"
                            />
                          ) : (
                            <div className="w-48 h-48 sm:w-64 sm:h-64">
                              <QRCodeSVG
                                value={pixData.qr_codes[0].text}
                                size={256}
                                level="H"
                                includeMargin={true}
                                className="w-full h-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PIX Copy/Paste */}
                      <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                        <p className="text-sm font-semibold text-pink-900 mb-2">📋 PIX Copia e Cola:</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={pixData.qr_codes[0].text}
                            readOnly
                            className="flex-1 p-2 sm:p-3 text-xs bg-white border border-pink-300 rounded-lg font-mono"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(pixData.qr_codes[0].text);
                              setShowCopySuccess(true);
                              createTimeout(() => setShowCopySuccess(false), 3000);
                            }}
                            className="px-4 py-2 sm:py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold whitespace-nowrap transition-all"
                          >
                            {showCopySuccess ? '✅ Copiado!' : '📋 Copiar'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 text-center">
                        <p className="text-xs sm:text-sm text-gray-600 mb-3">
                          ⏰ Expira em: {new Date(pixData.qr_codes[0].expiration_date).toLocaleString('pt-BR')}
                        </p>
                        <button
                          onClick={() => navigate('/profile')}
                          className="inline-block px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold transition-all"
                        >
                          Ver Meus Pedidos →
                        </button>
                      </div>
                    </>
                  )}

                  {/* Popup de sucesso ao copiar */}
                  {showCopySuccess && (
                    <div className="fixed top-4 right-4 z-50 animate-bounce-in">
                      <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold">Código PIX copiado!</p>
                          <p className="text-sm text-green-100">Cole no app do seu banco</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success State - Card */}
              {paymentStep === 'success' && selectedPaymentMethod === 'credit_card' && (
                <div className="bg-white rounded-xl shadow-md p-6 sm:p-12 border-2 border-green-500 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-green-800 mb-3 sm:mb-4">Pagamento Aprovado!</h2>
                  <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6">
                    Sua compra foi concluída com sucesso.
                  </p>
                  <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                    Você será redirecionado para ver seus ingressos...
                  </p>
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-pink-600 mx-auto" />
                </div>
              )}

              {/* Pending State - Em Análise */}
              {paymentStep === 'pending' && selectedPaymentMethod === 'credit_card' && (
                <div className="bg-white rounded-xl shadow-md p-6 sm:p-12 border-2 border-yellow-500 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 animate-spin" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-yellow-800 mb-3 sm:mb-4">
                    Pagamento em Análise
                  </h2>
                  <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6">
                    Seu pagamento está sendo analisado pela operadora.
                  </p>
                  <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                    Você será notificado quando o pagamento for confirmado.
                  </p>
                  <button
                    onClick={() => navigate('/profile')}
                    className="inline-block px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold transition-all"
                  >
                    Ver Meus Pedidos →
                  </button>
                </div>
              )}
            </div>

            {/* Right Side: Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 lg:sticky lg:top-24">
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Resumo da Compra</h2>

                {/* Tickets */}
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  {finalSelectedTickets?.map((t: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">
                        {t.ticketName} x{t.quantity}
                      </span>
                      <span className="font-medium">
                        R$ {(t.price * t.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 sm:pt-4 space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({finalSelectedTickets ? finalSelectedTickets.reduce((sum: number, t: any) => sum + t.quantity, 0) : 1} {(finalSelectedTickets ? finalSelectedTickets.reduce((sum: number, t: any) => sum + t.quantity, 0) : 1) > 1 ? 'ingressos' : 'ingresso'})</span>
                    <span className="font-medium">R$ {(subtotal / 100).toFixed(2)}</span>
                  </div>

                  {/* Taxa da Processadora - SEMPRE paga pelo cliente */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxa da Processadora ({selectedPaymentMethod === 'credit_card' ? 'Cartão' : 'PIX'})</span>
                    <span className="font-medium">R$ {(taxaProcessadora / 100).toFixed(2)}</span>
                  </div>

                  {/* Taxa de Conveniência - pode ser paga pelo cliente OU organizador */}
                  {isBuyerPayingConvenienceFee && taxaConveniencia > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxa de Conveniência</span>
                      <span className="font-medium">R$ {(taxaConveniencia / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {!isBuyerPayingConvenienceFee && taxaConveniencia > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-green-600">
                        <span className="text-xs sm:text-sm">💰 Taxa de Conveniência (paga pelo organizador)</span>
                        <span className="font-medium">R$ 0,00</span>
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span>Taxa conveniência (organizador):</span>
                          <span>R$ {(taxaConveniencia / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t mt-3 sm:mt-4 pt-3 sm:pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-bold text-gray-900">Total</span>
                    <span className="text-xl sm:text-2xl font-bold text-pink-600">
                      R$ {(totalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <p className="text-xs text-pink-800 text-center">
                    🔒 <strong>Pagamento 100% seguro</strong><br />
                    Processado pelo PagBank
                  </p>
                </div>

                {/* Logos dos métodos de pagamento */}
                <div className="flex justify-center items-center gap-4 mt-6">
                  <img src="https://i.postimg.cc/W1ry1x4P/Visa-Logo.png" alt="Visa" className="h-8 w-auto object-contain" />
                  <img src="https://i.postimg.cc/m27qb0kW/Mastercard-2019-logo-svg.png" alt="MasterCard" className="h-8 w-auto object-contain" />
                  <img src="/elo-card-icon.png" alt="Elo" className="h-8 w-auto object-contain" />
                  <img src="https://i.postimg.cc/nr4kJfkd/fb76ffd73ce19c109f029168de01ff95.webp" alt="Pix" className="h-8 w-auto object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento Recusado */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-center text-red-800 mb-3">
              Pagamento Recusado
            </h2>

            <p className="text-base sm:text-lg text-gray-700 text-center mb-4">
              {declineError || 'Não foi possível processar seu pagamento.'}
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 text-center">
                <strong>O que fazer:</strong>
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                <li>Verifique os dados do cartão</li>
                <li>Confirme se há limite disponível</li>
                <li>Tente com outro cartão</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineError(null);
                  setPaymentStep('form');
                  setIsProcessing(false);
                }}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineError(null);
                  setPaymentStep('select');
                  setSelectedPaymentMethod(null);
                  setIsProcessing(false);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-all"
              >
                Mudar Método
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPagePagBank;

