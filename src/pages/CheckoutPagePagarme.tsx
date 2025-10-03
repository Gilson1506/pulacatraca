/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertTriangle } from 'lucide-react';
// @ts-ignore - componente em JSX sem declarações de tipos
import SecureCheckoutForm from '../components/SecureCheckoutForm';

const CheckoutPagePagarme = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [showPagarmeForm, setShowPagarmeForm] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  
  // Estado local para dados restaurados do localStorage
  const [restoredData, setRestoredData] = useState(null);

  const { event, selectedTickets, totalAmount, ticket } = state || restoredData || {};

  useEffect(() => {
    console.log('🔄 CheckoutPagePagarme - Dados recebidos:', { event, selectedTickets, totalAmount, ticket, state });
    
    // Verificar localStorage se useLocation falhar
    const localStorageData = localStorage.getItem('checkout_restore_data');
    if (localStorageData && !restoredData) {
      try {
        const parsedData = JSON.parse(localStorageData);
        console.log('💾 Dados encontrados no localStorage:', parsedData);
        
        // Se não temos dados via useLocation, usar localStorage
        if (!event && !selectedTickets && !ticket) {
          console.log('🔄 Usando dados do localStorage como fallback');
          localStorage.removeItem('checkout_restore_data');
          setRestoredData(parsedData);
          return;
        }
      } catch (error) {
        console.error('❌ Erro ao parsear dados do localStorage:', error);
        localStorage.removeItem('checkout_restore_data');
      }
    }
    
    // Validar dados APÓS tentar restaurar do localStorage
    const finalEvent = event || restoredData?.event;
    const finalSelectedTickets = selectedTickets || restoredData?.selectedTickets;
    const finalTicket = ticket || restoredData?.ticket;
    
    if (!finalEvent || (!finalSelectedTickets && !finalTicket)) {
      console.warn('❌ Dados do evento ou dos ingressos não encontrados. Redirecionando...');
      console.warn('❌ Dados finais:', { finalEvent, finalSelectedTickets, finalTicket });
      navigate('/');
      return;
    }

    // Carregar dados do usuário e evento
    if (user) {
      loadUserData();
      loadEventData();
    } else {
      setIsLoading(false);
    }
  }, [event, selectedTickets, ticket, navigate, user, state, restoredData]);

  const loadUserData = async () => {
    try {
      if (!user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', (user as any)?.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      if (profile.role && profile.role === 'organizer') {
        alert('Organizadores não podem comprar ingressos. Use uma conta de usuário normal.');
        navigate('/');
        return;
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error);
    }
  };

  const loadEventData = async () => {
    try {
      if (!event.id) return;

      const { data: eventDetails, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', event.id)
        .eq('status', 'approved')
        .single();

      if (error) {
        console.error('Erro ao carregar evento:', error);
        alert('Evento não encontrado ou não está disponível para compra.');
        navigate('/');
        return;
      }

      setEventData(eventDetails);
    } catch (error) {
      console.error('Erro inesperado ao carregar evento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular valores (convertendo para centavos)
  const subtotalReais = selectedTickets && selectedTickets.length > 0 
    ? selectedTickets.reduce((sum: number, ticket: any) => {
        const price = parseFloat(ticket.price) || 0;
        const qty = parseInt(ticket.quantity) || 0;
        const total = price * qty;
        console.log('🔍 Calculando ticket Pagarme:', { price, qty, total, ticket });
        return sum + total;
      }, 0)
    : (ticket ? parseFloat(ticket.price) || 0 : 0);
    
  const subtotal = subtotalReais * 100; // Converter para centavos

  // Debug do subtotal
  console.log('🔍 DEBUG CheckoutPagePagarme - Cálculo do subtotal:', {
    selectedTickets,
    selectedTicketsLength: selectedTickets?.length,
    ticket,
    subtotalReais,
    subtotal,
    calculation: selectedTickets && selectedTickets.length > 0 
      ? selectedTickets.map((t: any) => ({ 
          price: parseFloat(t.price) || 0, 
          quantity: parseInt(t.quantity) || 0, 
          total: (parseFloat(t.price) || 0) * (parseInt(t.quantity) || 0) 
        }))
      : [{ price: parseFloat(ticket?.price) || 0, quantity: 1, total: parseFloat(ticket?.price) || 0 }]
  });
    
  // Taxa de conveniência (em centavos)
  const taxaConveniencia = subtotal < 3000 ? 300 : Math.round(subtotal * 0.10);
  
  // Taxa da processadora (em centavos)
  const taxaProcessadora = selectedPaymentMethod === 'card' ? Math.round(subtotal * 0.06) : Math.round(subtotal * 0.025);
  
  const totalPrice = subtotal + taxaConveniencia + taxaProcessadora;

  const handleStartPayment = () => {
    if (!user) {
      // Salvar dados e ir para login
      const checkoutState = { event, selectedTickets, totalAmount, ticket };
      localStorage.setItem('checkout_data', JSON.stringify({
        returnTo: '/checkout',
        state: checkoutState
      }));
      navigate('/login');
      return;
    }

    if (!userProfile || !eventData) {
      alert('Dados incompletos. Por favor, recarregue a página e tente novamente.');
      return;
    }

    // Preparar dados para o Pagar.me
    const orderItems = [];
    
    if (selectedTickets && selectedTickets.length > 0) {
      selectedTickets.forEach((ticket: any) => {
        orderItems.push({
          amount: Math.round(ticket.price * 100), // Pagar.me usa centavos
          description: `${ticket.ticketName} - ${event.title}`,
          quantity: ticket.quantity, // Quantidade correta, não duplicar
          code: `TICKET_${ticket.ticketId || Date.now()}`,
          name: `${ticket.ticketName} - ${ticket.gender === 'masculine' ? 'Masculino' : 'Feminino'}`
        });
      });
    } else if (ticket) {
      orderItems.push({
        amount: Math.round(ticket.price * 100),
        description: `${ticket.name} - ${event.title}`,
        quantity: 1,
        code: `TICKET_${Date.now()}`,
        name: ticket.name
      });
    }

    console.log('🔍 DEBUG CheckoutPagePagarme - orderItems:', orderItems);
    console.log('🔍 DEBUG CheckoutPagePagarme - totalPrice (centavos):', totalPrice);
    console.log('🔍 DEBUG CheckoutPagePagarme - Cálculos detalhados:', {
      subtotalReais,
      subtotal,
      taxaConveniencia,
      taxaProcessadora,
      selectedPaymentMethod,
      totalPrice
    });

    // Dados do cliente
    const customerData = {
      name: userProfile.name || user.email,
      email: user.email,
      document: userProfile.document || '00000000000',
      phone: userProfile.phone || '11999999999',
      address: {
        street: userProfile.address || 'Rua Exemplo',
        number: userProfile.number || '123',
        complement: userProfile.complement || '',
        zip_code: userProfile.zip_code || '00000-000',
        neighborhood: userProfile.neighborhood || 'Centro',
        city: userProfile.city || 'São Paulo',
        state: userProfile.state || 'SP'
      }
    };

         // Preparar dados para o formulário do Pagar.me
     const pagarmeOrderData = {
       items: orderItems,
       customer: customerData,
       amount: subtotal, // Subtotal sem taxas
       total_amount: totalPrice, // Total com taxas
       event: event,
       selectedTickets: selectedTickets,
       ticket: ticket,
       paymentMethod: selectedPaymentMethod
     };

    setOrderData(pagarmeOrderData);
    setShowPagarmeForm(true);

    console.log('✅ Formulário Pagar.me preparado:', pagarmeOrderData);
  };

  // Callbacks para o formulário do Pagar.me
  const handlePagarmeSuccess = async (paymentResult: any) => {
    console.log('✅ Pagamento Pagar.me realizado com sucesso:', paymentResult);
    
    try {
      // ===============================
      // Pós-pagamento: criar Order + Transactions no Supabase
      // ===============================

      if (!user || !user.id) {
        console.error('❌ Usuário não autenticado no pós-pagamento. Abortando persistência.');
      } else if (!event?.id) {
        console.error('❌ Evento ausente no pós-pagamento. Abortando persistência.');
      } else if (!orderData?.items || orderData.items.length === 0) {
        console.error('❌ Itens ausentes no pós-pagamento. Abortando persistência.');
      } else {
        const pagarmeOrderId = paymentResult?.id || paymentResult?.order_id || null;
        const paymentStatus = paymentResult?.status || 'paid';
        const paymentMethod = selectedPaymentMethod || orderData?.paymentMethod || paymentResult?.payment_method || 'card';

        // Idempotência: se já existir ordem com este pagarme_order_id, reutiliza
        let existingOrder = null;
        if (pagarmeOrderId) {
          const { data: foundOrder, error: findErr } = await supabase
            .from('orders')
            .select('id')
            .eq('pagarme_order_id', pagarmeOrderId)
            .maybeSingle();
          if (findErr) console.warn('⚠️ Falha ao consultar ordem existente:', findErr);
          existingOrder = foundOrder;
        }

        // Montar registro de order (schema público.orders)
        const totalAmountReais = Number((totalPrice / 100).toFixed(2));
        const customer = orderData.customer || {};

        const orderRecord = {
          // order_number: gerado por trigger generate_order_number()
          customer_id: user.id,
          customer_name: customer.name || userProfile?.name || 'Cliente',
          customer_email: customer.email || '',
          customer_document: (customer.document || '').replace(/\D/g, '') || null,
          customer_phone: customer.phone || null,
          billing_street: customer.address?.street || userProfile?.address || null,
          billing_number: customer.address?.number || userProfile?.number || null,
          billing_complement: customer.address?.complement || userProfile?.complement || null,
          billing_zip_code: customer.address?.zip_code || userProfile?.zip_code || null,
          billing_neighborhood: customer.address?.neighborhood || userProfile?.neighborhood || null,
          billing_city: customer.address?.city || userProfile?.city || null,
          billing_state: customer.address?.state || userProfile?.state || null,
          total_amount: totalAmountReais,
          currency: 'BRL',
          payment_method: paymentMethod === 'pix' ? 'pix' : 'credit_card',
          payment_status: paymentStatus,
          pagarme_order_id: pagarmeOrderId,
          pagarme_transaction_id: paymentResult?.charges?.[0]?.id || null,
          installments: paymentResult?.charges?.[0]?.last_transaction?.installments || 1,
          pix_qr_code: paymentMethod === 'pix' ? (paymentResult?.qr_code || null) : null,
          pix_expires_at: paymentMethod === 'pix' ? (paymentResult?.expires_at || null) : null,
          metadata: {
            items: orderData.items,
            fees: {
              convenience_fee_cents: taxaConveniencia,
              processor_fee_cents: taxaProcessadora,
              subtotal_cents: subtotal,
              total_cents: totalPrice
            },
            event_id: event.id
          }
        } as any;

        let orderId: any = existingOrder?.id;
        if (!orderId) {
          const { data: insertedOrder, error: insertErr } = await supabase
            .from('orders')
            .insert(orderRecord)
            .select('id')
            .single();
          if (insertErr) {
            console.error('❌ Erro ao criar ordem no Supabase:', insertErr);
            throw insertErr;
          }
          orderId = insertedOrder?.id;
        } else {
          // Atualiza para manter dados consistentes
          const { error: updateErr } = await supabase
            .from('orders')
            .update(orderRecord)
            .eq('id', orderId);
          if (updateErr) console.warn('⚠️ Falha ao atualizar ordem existente:', updateErr);
        }

        // Expandir items por quantidade e criar transactions (schema público.transactions)
        const isPaid = paymentStatus === 'paid' || paymentStatus === 'captured' || paymentStatus === 'capturado' || paymentStatus === 'completed';
        const trxStatus = isPaid ? 'completed' : 'pending';
        const paymentId = paymentResult?.charges?.[0]?.id || pagarmeOrderId || null;

        const trxRows: any[] = [];
        orderData.items.forEach((it: any) => {
          const qty = Number(it.quantity || 1);
          const unitReais = Number((it.amount / 100).toFixed(2));
          for (let i = 0; i < qty; i++) {
            trxRows.push({
              user_id: user.id,
              buyer_id: user.id,
              event_id: event.id,
              ticket_id: null, // manter null até vincular ao ticket real
              amount: unitReais, // numeric(10,2) em reais
              status: trxStatus, // 'completed' | 'pending'
              payment_method: paymentMethod === 'pix' ? 'pix' : 'credit_card',
              payment_id: paymentId,
              metadata: {
                order_id: orderId,
                pagarme_order_id: pagarmeOrderId,
                item: {
                  code: it.code,
                  name: it.name || it.description,
                  amount_cents: it.amount
                }
              }
            });
          }
        });

        if (trxRows.length > 0) {
          console.log('📝 Inserindo transactions =>', { count: trxRows.length, sample: trxRows[0] });
          const { data: trxInserted, error: trxErr } = await supabase
            .from('transactions')
            .insert(trxRows)
            .select('id, status, amount, payment_method, payment_id')
            .returns<any[]>();
          if (trxErr) {
            console.error('❌ Erro ao criar transactions no Supabase:', trxErr);
            // Não interrompe navegação; apenas loga
          }
          console.log('✅ Transactions inseridas:', trxInserted);
          if (!trxErr && (!trxInserted || trxInserted.length === 0)) {
            console.warn('⚠️ Nenhuma transaction retornada pelo Supabase. Verifique policies/trigger.');
          }

          // ========================
          // Criação de ingressos (tickets)
          // ========================
          if (isPaid) {
            const ticketsRows: any[] = [];
            orderData.items.forEach((it: any) => {
              const qty = Number(it.quantity || 1);
              const unitReais = Number((it.amount / 100).toFixed(2));
              for (let i = 0; i < qty; i++) {
                const qrCode = `PLKTK_${event.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                ticketsRows.push({
                  user_id: user.id,
                  event_id: event.id,
                  price: unitReais,
                  status: 'active',
                  qr_code: qrCode,
                  ticket_type: it.name || it.description || 'ticket'
                });
              }
            });

            if (ticketsRows.length > 0) {
              console.log('🎟️ Inserindo tickets =>', { count: ticketsRows.length, sample: ticketsRows[0] });
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

        console.log('🗃️ Order & Transactions criadas/atualizadas com sucesso:', { orderId, transactionsCount: trxRows.length });
      }

      // Redirecionar com resumo
      const fallbackStatus = paymentResult?.status || (selectedPaymentMethod === 'pix' ? 'pending' : 'paid');
      const ticketsVerb = (fallbackStatus === 'paid' || fallbackStatus === 'completed') ? 'gerados' : 'reservados e serão liberados após confirmação.';
      navigate('/profile', {
        state: {
          message: `🎉 Pagamento realizado com sucesso via Pagar.me!
          
Detalhes da compra:
• Evento: ${event.title}
• Valor: R$ ${(totalPrice / 100).toFixed(2)}
• Método: ${selectedPaymentMethod === 'pix' ? 'PIX' : 'Cartão'}
• Status: ${fallbackStatus}

Seus ingressos foram ${ticketsVerb}`,
          showSuccess: true
        }
      });
    } catch (error) {
      console.error('❌ Erro ao processar sucesso do pagamento:', error);
      alert('Erro ao processar pagamento. Entre em contato com o suporte.');
    }
  };

  const handlePagarmeCancel = () => {
    console.log('❌ Pagamento Pagar.me cancelado');
    setShowPagarmeForm(false);
    setOrderData(null);
  };

  // Se mostrar formulário do Pagar.me, renderizar apenas ele
  if (showPagarmeForm && orderData) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={handlePagarmeCancel}
                className="text-pink-600 hover:text-pink-700 font-medium"
              >
                ← Voltar ao checkout
              </button>
            </div>
            
                         <SecureCheckoutForm
               items={orderData.items}
               preSelectedPaymentMethod={orderData.paymentMethod}
               preCalculatedTotal={orderData.total_amount}
               onSuccess={handlePagarmeSuccess}
               onCancel={handlePagarmeCancel}
             />
          </div>
        </div>
      </div>
    );
  }

  // Renderiza uma tela de erro se os dados não foram passados corretamente
  if (!event || (!selectedTickets && !ticket)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Algo deu errado.</h2>
          <p className="text-gray-600">Você precisa selecionar um evento antes de prosseguir para o checkout.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Voltar para a Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-6 sm:mb-8 drop-shadow">
            Finalizar Compra
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Evento</h2>
                <div className="flex items-start space-x-4">
                  <img src={event.image} alt={event.title} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-600 drop-shadow-sm">{event.title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-500">{event.address || event.location}</p>
                    {eventData && eventData.location_type === 'online' && (
                      <p className="text-xs text-blue-600 mt-1">Evento Online - Link será enviado por email</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Tickets Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Seus Ingressos</h2>
                
                {selectedTickets && selectedTickets.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTickets.map((selectedTicket: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-700">{selectedTicket.ticketName}</h3>
                          <p className="text-sm text-gray-600">
                            {selectedTicket.area && `📍 ${selectedTicket.area}`}
                            {selectedTicket.sector && ` • ${selectedTicket.sector}`}
                          </p>
                          <p className="text-lg font-bold text-pink-600">
                            R$ {(parseFloat(selectedTicket.price) || 0).toFixed(2)}
                            {selectedTicket.gender === 'feminine' && ' (Feminino)'}
                            {selectedTicket.gender === 'masculine' && ' (Masculino)'}
                          </p>
                          {console.log('🎫 Exibindo preço no checkout Pagarme:', {
                            ticketId: selectedTicket.ticketId,
                            ticketName: selectedTicket.ticketName,
                            price: selectedTicket.price,
                            gender: selectedTicket.gender,
                            quantity: selectedTicket.quantity,
                            parsedPrice: parseFloat(selectedTicket.price) || 0
                          })}
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">Quantidade:</span>
                          <div className="text-lg font-bold text-gray-800">{selectedTicket.quantity}</div>
                          <div className="text-sm text-gray-600">
                            Subtotal: R$ {((parseFloat(selectedTicket.price) || 0) * (parseInt(selectedTicket.quantity) || 0)).toFixed(2)}
                          </div>
                          {console.log('🎫 Calculando subtotal no checkout Pagarme:', {
                            ticketId: selectedTicket.ticketId,
                            ticketName: selectedTicket.ticketName,
                            price: selectedTicket.price,
                            quantity: selectedTicket.quantity,
                            parsedPrice: parseFloat(selectedTicket.price) || 0,
                            parsedQuantity: parseInt(selectedTicket.quantity) || 0,
                            subtotal: (parseFloat(selectedTicket.price) || 0) * (parseInt(selectedTicket.quantity) || 0)
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : ticket ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-700 drop-shadow-sm">{ticket.name}</h3>
                      <p className="text-lg font-bold text-pink-600 drop-shadow-sm">R$ {(parseFloat(ticket.price) || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhum ingresso selecionado</p>
                )}
              </div>

                             {/* Método de Pagamento com Seleção */}
               <div className="bg-white rounded-lg shadow-sm p-6">
                 <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Método de Pagamento</h2>
                 
                 {!selectedPaymentMethod ? (
                   <div className="space-y-3">
                     <div className="text-sm text-gray-600 mb-4">
                       Escolha como deseja pagar:
                     </div>
                     
                     <button
                       onClick={() => setSelectedPaymentMethod('card')}
                       className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-pink-400 hover:bg-pink-50 transition-all text-left"
                     >
                       <div className="flex items-center">
                         <div className="w-10 h-10 flex items-center justify-center mr-3">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                             <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                             <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
                             <circle cx="18" cy="14" r="2" fill="currentColor" opacity="0.3"/>
                           </svg>
                         </div>
                         <div>
                           <div className="font-medium text-gray-900">Cartão de Crédito ou Débito</div>
                           <div className="text-sm text-gray-600">Visa, Mastercard, Elo e outros</div>
                         </div>
                       </div>
                     </button>
                     
                     <button
                       onClick={() => setSelectedPaymentMethod('pix')}
                       className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-pink-400 hover:bg-pink-50 transition-all text-left"
                     >
                       <div className="flex items-center">
                         <div className="w-10 h-10 flex items-center justify-center mr-3">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                             <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                             <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                             <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                             <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                           </svg>
                         </div>
                         <div>
                           <div className="font-medium text-gray-900">PIX</div>
                           <div className="text-sm text-gray-600">Pagamento instantâneo</div>
                         </div>
                       </div>
                     </button>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     <div className="flex items-center p-3 bg-pink-50 rounded-lg border border-pink-200">
                       <div className="flex-shrink-0">
                         <div className="w-8 h-8 flex items-center justify-center">
                           {selectedPaymentMethod === 'card' ? (
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                               <rect x="2" y="6" width="20" height="12" rx="2" stroke="#ec4899" strokeWidth="2" fill="transparent"/>
                               <path d="M2 10h20" stroke="#ec4899" strokeWidth="2"/>
                               <circle cx="18" cy="14" r="2" fill="#ec4899" opacity="0.3"/>
                             </svg>
                           ) : (
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                               <rect x="3" y="3" width="7" height="7" stroke="#ec4899" strokeWidth="2" fill="transparent"/>
                               <rect x="14" y="3" width="7" height="7" stroke="#ec4899" strokeWidth="2" fill="transparent"/>
                               <rect x="3" y="14" width="7" height="7" stroke="#ec4899" strokeWidth="2" fill="transparent"/>
                               <rect x="14" y="14" width="7" height="7" stroke="#ec4899" strokeWidth="2" fill="transparent"/>
                             </svg>
                           )}
                         </div>
                       </div>
                       <div className="ml-3">
                         <p className="text-sm font-medium text-pink-900">
                           {selectedPaymentMethod === 'card' ? 'Cartão Selecionado' : 'PIX Selecionado'}
                         </p>
                         <p className="text-sm text-pink-700">
                           {selectedPaymentMethod === 'card' ? 'Crédito ou débito' : 'Pagamento instantâneo'}
                         </p>
                       </div>
                     </div>
                     
                     <button
                       onClick={() => setSelectedPaymentMethod(null)}
                       className="text-sm text-gray-500 hover:text-gray-700 underline"
                     >
                       Alterar método de pagamento
                     </button>
                   </div>
                 )}
               </div>
            </div>

            {/* Right Side: Price Summary & Checkout Button */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 lg:sticky lg:top-24">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Resumo da Compra</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">
                      Subtotal ({selectedTickets ? selectedTickets.reduce((sum, t) => sum + t.quantity, 0) : 1} {(selectedTickets ? selectedTickets.reduce((sum, t) => sum + t.quantity, 0) : 1) > 1 ? 'ingressos' : 'ingresso'})
                    </span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {((parseFloat(subtotal.toString()) || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">Taxa de Conveniência</span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {((parseFloat(taxaConveniencia.toString()) || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">Taxa da Processadora ({selectedPaymentMethod === 'card' ? 'Cartão' : 'PIX'})</span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {((parseFloat(taxaProcessadora.toString()) || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t my-4"></div>
                <div className="flex justify-between font-semibold text-lg drop-shadow">
                  <span>Total</span>
                  <span>R$ {((parseFloat(totalPrice.toString()) || 0) / 100).toFixed(2)}</span>
                </div>
                
                                 <button
                   onClick={handleStartPayment}
                   disabled={!userProfile || !selectedPaymentMethod}
                   className="mt-6 w-full bg-pink-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                 >
                   {!user ? 'Fazer Login para Pagar' : 
                    !selectedPaymentMethod ? 'Selecione um método de pagamento' : 'Finalizar Compra'}
                 </button>
                
                {/* Informações adicionais */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    🔒 Compra segura • Dados protegidos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    💳 Pagamento processado pelo Pagar.me
                  </p>
                  {userProfile && (
                    <p className="text-xs text-gray-500 mt-1">
                      👤 Usuário: {userProfile.name || user?.email}
                    </p>
                  )}
                                     <p className="text-xs text-gray-400 mt-1">
                     🎫 {selectedPaymentMethod ? 'Método selecionado, clique em Finalizar' : 'Selecione um método de pagamento'}
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
    </div>
  );
};

export default CheckoutPagePagarme;
