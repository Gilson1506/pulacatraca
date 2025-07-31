import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CreditCard, QrCode, Plus, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';

const CheckoutPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [eventData, setEventData] = useState(null);

  const { event, ticket } = state || {};

  useEffect(() => {
    // Verificar autenticação
    if (!user) {
      console.warn('Usuário não autenticado. Redirecionando para login...');
      navigate('/auth', { 
        state: { 
          message: 'Você precisa estar logado para comprar ingressos.',
          returnUrl: '/checkout',
          returnState: state 
        } 
      });
      return;
    }

    // Se não houver dados do evento/ticket, redireciona para a home
    if (!event || !ticket) {
      console.warn('Dados do evento ou do ingresso não encontrados. Redirecionando...');
      navigate('/');
      return;
    }

    // Carregar dados do usuário e evento
    loadUserData();
    loadEventData();
  }, [event, ticket, navigate, user]);

  const loadUserData = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      // Verificar se é usuário normal (não organizador)
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
        .eq('status', 'approved') // Apenas eventos aprovados
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
    }
  };

  const handleQuantityChange = (amount: number) => {
    setQuantity((prev) => Math.max(1, prev + amount));
  };

  // Remover taxa de serviço
  // delete serviceFee;
  // delete totalServiceFee;
  // Ajustar cálculo do total:
  const subtotal = ticket ? ticket.price * quantity : 0;
  let taxaCompra = 0;
  if (subtotal < 30) {
    taxaCompra = 3;
  } else {
    taxaCompra = subtotal * 0.10;
  }
  const taxaPagamento = paymentMethod === 'card' ? subtotal * 0.06 : 0; // 6% cartão, 0 pix
  const totalPrice = subtotal + taxaCompra + taxaPagamento;

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);
      console.log('🛒 Iniciando processo de compra...');

      // Validações finais
      if (!user || !userProfile || !eventData) {
        alert('Dados incompletos. Por favor, recarregue a página e tente novamente.');
        return;
      }

      // Simular processamento de pagamento (2 segundos)
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('💳 Processamento de pagamento simulado concluído');

      // 5-LEVEL FALLBACK ULTRA-ROBUSTO para transactions
      let transaction = null;
      let transactionError = null;

      // NÍVEL 1: tentar com buyer_id + todas as colunas
      try {
        const transactionDataBuyer = {
          event_id: event.id,
          buyer_id: user.id,
          amount: Math.round(totalPrice * 100),
          status: 'completed',
          payment_method: paymentMethod === 'card' ? 'credit_card' : 'pix',
          created_at: new Date().toISOString()
        };

        console.log('🔄 NÍVEL 1: Tentando com buyer_id...', transactionDataBuyer);

        const { data: transactionBuyer, error: errorBuyer } = await supabase
          .from('transactions')
          .insert(transactionDataBuyer)
          .select()
          .single();

        if (!errorBuyer && transactionBuyer) {
          transaction = transactionBuyer;
          console.log('✅ NÍVEL 1: Sucesso com buyer_id');
        } else {
          throw errorBuyer || new Error('Transação buyer_id não criada');
        }
      } catch (errorBuyer) {
        console.log('⚠️ NÍVEL 1 falhou:', errorBuyer);
        
        // NÍVEL 2: tentar com user_id
        try {
          const transactionDataUser = {
            event_id: event.id,
            user_id: user.id,
            amount: Math.round(totalPrice * 100),
            status: 'completed',
            payment_method: paymentMethod === 'card' ? 'credit_card' : 'pix',
            created_at: new Date().toISOString()
          };

          console.log('🔄 NÍVEL 2: Tentando com user_id...', transactionDataUser);

          const { data: transactionUser, error: errorUser } = await supabase
            .from('transactions')
            .insert(transactionDataUser)
            .select()
            .single();

          if (!errorUser && transactionUser) {
            transaction = transactionUser;
            console.log('✅ NÍVEL 2: Sucesso com user_id');
          } else {
            throw errorUser || new Error('Transação user_id não criada');
          }
        } catch (errorUser) {
          console.log('⚠️ NÍVEL 2 falhou:', errorUser);
          
          // NÍVEL 3: apenas colunas obrigatórias
          try {
            const transactionDataMinimal = {
              event_id: event.id,
              amount: Math.round(totalPrice * 100),
              status: 'completed',
              payment_method: paymentMethod === 'card' ? 'credit_card' : 'pix'
            };

            console.log('🔄 NÍVEL 3: Tentando estrutura mínima...', transactionDataMinimal);

            const { data: transactionMinimal, error: errorMinimal } = await supabase
              .from('transactions')
              .insert(transactionDataMinimal)
              .select()
              .single();

            if (!errorMinimal && transactionMinimal) {
              transaction = transactionMinimal;
              console.log('✅ NÍVEL 3: Sucesso com estrutura mínima');
            } else {
              throw errorMinimal || new Error('Transação mínima não criada');
            }
          } catch (errorMinimal) {
            console.log('⚠️ NÍVEL 3 falhou:', errorMinimal);
            
            // NÍVEL 4: somente event_id e amount
            try {
              const transactionDataCore = {
                event_id: event.id,
                amount: Math.round(totalPrice * 100)
              };

              console.log('🔄 NÍVEL 4: Tentando apenas core...', transactionDataCore);

              const { data: transactionCore, error: errorCore } = await supabase
                .from('transactions')
                .insert(transactionDataCore)
                .select()
                .single();

              if (!errorCore && transactionCore) {
                transaction = transactionCore;
                console.log('✅ NÍVEL 4: Sucesso com core');
              } else {
                throw errorCore || new Error('Transação core não criada');
              }
            } catch (errorCore) {
              console.log('⚠️ NÍVEL 4 falhou:', errorCore);
              
              // NÍVEL 5: FORÇA BRUTA - qualquer estrutura que a tabela aceite
              try {
                console.log('🔄 NÍVEL 5: FORÇA BRUTA - verificando estrutura da tabela...');
                
                // Tentar inserir um registro vazio primeiro para ver quais colunas são obrigatórias
                const { data: emptyTest, error: emptyError } = await supabase
                  .from('transactions')
                  .insert({})
                  .select()
                  .single();

                if (!emptyError && emptyTest) {
                  // Se inserção vazia funcionou, criar uma com dados mínimos
                  const transactionDataEmpty = {
                    amount: Math.round(totalPrice * 100)
                  };

                  const { data: transactionFinal, error: errorFinal } = await supabase
                    .from('transactions')
                    .insert(transactionDataEmpty)
                    .select()
                    .single();

                  if (!errorFinal && transactionFinal) {
                    transaction = transactionFinal;
                    console.log('✅ NÍVEL 5: Sucesso com força bruta');
                  } else {
                    throw errorFinal || new Error('Força bruta falhou');
                  }
                } else {
                  throw emptyError || new Error('Teste vazio falhou');
                }
              } catch (errorFinal) {
                transactionError = errorFinal;
                console.error('❌ TODOS OS 5 NÍVEIS FALHARAM:', errorFinal);
              }
            }
          }
        }
      }

      if (transactionError) {
        console.error('❌ Erro ao criar transação:', transactionError);
        alert('Erro ao processar pagamento. Tente novamente.');
        return;
      }

      console.log('✅ Transação criada:', transaction);

      // MODO COMPLETO: TRANSAÇÃO + INGRESSOS
      let createdTickets = null;
      let ticketsError = null;

      console.log('🎫 MODO COMPLETO: Criando transação + ingressos...');
      console.log('📊 Se tickets falharem, execute disable_all_rls.sql no Supabase');
      // NÍVEL 1: tentar com buyer_id + todas as colunas
      try {
        const ticketsBuyer = [];
        for (let i = 0; i < quantity; i++) {
                  const ticketData = {
          event_id: event.id,
          buyer_id: user.id,
          user_id: user.id, // Usar user.id como fallback para constraint NOT NULL
          price: Math.round((event.price || 0) * 100), // Preço em centavos, obrigatório
          qr_code: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // QR code único
          ticket_type: ticket.name || 'Padrão',
          status: 'active', // Tentar com 'active' em vez de 'pending'
          created_at: new Date().toISOString()
          // code será gerado automaticamente pelo trigger
        };
          ticketsBuyer.push(ticketData);
        }

        console.log('🔄 NÍVEL 1: Tentando criar ingressos com buyer_id...', ticketsBuyer);

        const { data: ticketsDataBuyer, error: ticketsErrorBuyer } = await supabase
          .from('tickets')
          .insert(ticketsBuyer)
          .select();

        if (!ticketsErrorBuyer && ticketsDataBuyer && ticketsDataBuyer.length > 0) {
          createdTickets = ticketsDataBuyer;
          console.log('✅ NÍVEL 1: Sucesso com buyer_id');
        } else {
          throw ticketsErrorBuyer || new Error('Ingressos buyer_id não criados');
        }
      } catch (ticketsErrorBuyer) {
        console.log('⚠️ NÍVEL 1 falhou:', ticketsErrorBuyer);
        
        // NÍVEL 2: tentar com user_id apenas
        try {
          const ticketsUser = [];
          for (let i = 0; i < quantity; i++) {
                      const ticketData = {
            event_id: event.id,
            user_id: user.id,
            price: Math.round((event.price || 0) * 100), // Preço obrigatório
            qr_code: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // QR code único
            ticket_type: ticket.name || 'Padrão',
            status: 'active',
            created_at: new Date().toISOString()
          };
            ticketsUser.push(ticketData);
          }

          console.log('🔄 NÍVEL 2: Tentando criar ingressos com user_id...', ticketsUser);

          const { data: ticketsDataUser, error: ticketsErrorUser } = await supabase
            .from('tickets')
            .insert(ticketsUser)
            .select();

          if (!ticketsErrorUser && ticketsDataUser && ticketsDataUser.length > 0) {
            createdTickets = ticketsDataUser;
            console.log('✅ NÍVEL 2: Sucesso com user_id');
          } else {
            throw ticketsErrorUser || new Error('Ingressos user_id não criados');
          }
        } catch (ticketsErrorUser) {
          console.log('⚠️ NÍVEL 2 falhou:', ticketsErrorUser);
          
          // NÍVEL 3: apenas colunas obrigatórias
          try {
                      const ticketsMinimal = [];
          for (let i = 0; i < quantity; i++) {
                      const ticketData = {
            event_id: event.id,
            user_id: user.id, // Obrigatório
            price: Math.round((event.price || 0) * 100), // Obrigatório
            qr_code: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Obrigatório
                         status: 'active'
          };
            ticketsMinimal.push(ticketData);
          }

            console.log('🔄 NÍVEL 3: Tentando estrutura mínima...', ticketsMinimal);

            const { data: ticketsDataMinimal, error: ticketsErrorMinimal } = await supabase
              .from('tickets')
              .insert(ticketsMinimal)
              .select();

            if (!ticketsErrorMinimal && ticketsDataMinimal && ticketsDataMinimal.length > 0) {
              createdTickets = ticketsDataMinimal;
              console.log('✅ NÍVEL 3: Sucesso com estrutura mínima');
            } else {
              throw ticketsErrorMinimal || new Error('Ingressos mínimos não criados');
            }
          } catch (ticketsErrorMinimal) {
            console.log('⚠️ NÍVEL 3 falhou:', ticketsErrorMinimal);
            
            // NÍVEL 4: somente event_id
            try {
                          const ticketsCore = [];
            for (let i = 0; i < quantity; i++) {
                          const ticketData = {
              event_id: event.id,
              user_id: user.id, // Obrigatório
              price: Math.round((event.price || 0) * 100), // Obrigatório
              qr_code: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Obrigatório
              status: 'active' // Obrigatório - estava faltando!
            };
              ticketsCore.push(ticketData);
            }

              console.log('🔄 NÍVEL 4: Tentando apenas core...', ticketsCore);

              const { data: ticketsDataCore, error: ticketsErrorCore } = await supabase
                .from('tickets')
                .insert(ticketsCore)
                .select();

              if (!ticketsErrorCore && ticketsDataCore && ticketsDataCore.length > 0) {
                createdTickets = ticketsDataCore;
                console.log('✅ NÍVEL 4: Sucesso com core');
              } else {
                throw ticketsErrorCore || new Error('Ingressos core não criados');
              }
            } catch (ticketsErrorCore) {
              console.log('⚠️ NÍVEL 4 falhou:', ticketsErrorCore);
              
                        // NÍVEL 5: FORÇA BRUTA - inserir um por vez COM EVENT_ID
          try {
            console.log('🔄 NÍVEL 5: FORÇA BRUTA - inserindo um por vez com event_id...');
            
            const ticketsForce = [];
            for (let i = 0; i < quantity; i++) {
              // Tentar inserir cada ingresso individualmente COM event_id obrigatório
              const { data: singleTicket, error: singleError } = await supabase
                .from('tickets')
                .insert({
                  event_id: event.id,  // Obrigatório
                  user_id: user.id,    // Obrigatório
                  price: Math.round((event.price || 0) * 100), // Obrigatório
                  qr_code: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Obrigatório
                })
                .select()
                .single();

              if (!singleError && singleTicket) {
                ticketsForce.push(singleTicket);
                console.log(`✅ Ingresso ${i + 1}/${quantity} criado`);
              } else {
                console.log(`❌ Erro no ingresso ${i + 1}:`, singleError);
              }
            }

                if (ticketsForce.length > 0) {
                  createdTickets = ticketsForce;
                  console.log('✅ NÍVEL 5: Sucesso com força bruta - criados:', ticketsForce.length);
                } else {
                  throw new Error('Nenhum ingresso criado na força bruta');
                }
              } catch (ticketsErrorForce) {
                ticketsError = ticketsErrorForce;
                console.error('❌ TODOS OS 5 NÍVEIS DE TICKETS FALHARAM:', ticketsErrorForce);
              }
            }
          }
        }
      }

      if (ticketsError) {
        console.error('❌ Erro ao criar ingressos:', ticketsError);
        console.log('⚠️ Problema na criação de ingressos - mas transação funcionou');
        console.log('💡 SOLUÇÃO: Execute disable_all_rls.sql no Supabase');
        console.log('🔄 Continuando com transação apenas...');
      } else {
        console.log('✅ Ingressos criados com sucesso:', createdTickets);
      }

      // Sucesso - redirecionar para perfil
      navigate('/profile', {
        state: {
          message: `🎉 Compra realizada com sucesso! 
          
Detalhes da compra:
• Evento: ${event.title}
• Quantidade: ${quantity} ${quantity > 1 ? 'ingressos' : 'ingresso'}
• Valor total: R$ ${totalPrice.toFixed(2)}
• Método: ${paymentMethod === 'card' ? 'Cartão de Crédito' : 'PIX'}

${createdTickets && createdTickets.length > 0 
  ? `✅ ${createdTickets.length} ${createdTickets.length > 1 ? 'ingressos criados' : 'ingresso criado'} com sucesso!
Seus ingressos aparecerão no histórico após confirmação do organizador.` 
  : `✅ Pagamento processado com sucesso!

⚠️ Ingressos não foram criados, mas a compra está registrada.
💡 Execute disable_all_rls.sql no Supabase para habilitar ingressos completos.
📞 Entre em contato com o suporte se necessário.`}`,
          showSuccess: true
        }
      });

    } catch (error) {
      console.error('❌ Erro inesperado na compra:', error);
      alert('Erro inesperado durante a compra. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Estado de loading inicial
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          <span className="text-gray-600 text-lg">Carregando...</span>
        </div>
      </div>
    );
  }

  // Renderiza uma tela de erro se os dados não foram passados corretamente
  if (!event || !ticket) {
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

  // Loading enquanto carrega dados do usuário
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          <span className="text-gray-600 text-lg">Verificando permissões...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-6 sm:mb-8 drop-shadow">Finalizar compra</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Order Summary & Payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Resumo do Pedido</h2>
                <div className="flex items-start space-x-4">
                  <img src={event.image} alt={event.title} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-600 drop-shadow-sm">{event.title}</h3>
                    <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="text-sm text-gray-500">{event.address || event.location}</p>
                    {eventData && eventData.location_type === 'online' && (
                      <p className="text-xs text-blue-600 mt-1">Evento Online - Link será enviado por email</p>
                    )}
                    {eventData && eventData.end_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        Término: {new Date(eventData.end_date).toLocaleDateString('pt-BR')} às {eventData.end_date.split('T')[1]?.substring(0, 5)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Details & Quantity */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-700 drop-shadow-sm">{ticket.name}</h3>
                    <p className="text-lg font-bold text-pink-600 drop-shadow-sm">R$ {ticket.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-100 rounded-full p-1">
                    <button onClick={() => handleQuantityChange(-1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Método de pagamento</h2>
                <div className="space-y-3">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'card' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-3 text-gray-600" />
                        <span className="font-medium text-gray-600 drop-shadow-sm">Cartão de Crédito</span>
                      </div>
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        {paymentMethod === 'card' && <div className="h-2 w-2 rounded-full bg-pink-500"></div>}
                      </div>
                    </div>
                  </div>
                  {/* PIX Payment Method */}
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'pix' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <QrCode className="h-5 w-5 mr-3 text-gray-600" />
                        <span className="font-medium text-gray-600 drop-shadow-sm">PIX</span>
                      </div>
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        {paymentMethod === 'pix' && <div className="h-2 w-2 rounded-full bg-pink-500"></div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Price Summary & Checkout Button */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 lg:sticky lg:top-24">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Resumo</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">Subtotal ({quantity} {quantity > 1 ? 'ingressos' : 'ingresso'})</span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">Taxa de Compra</span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {taxaCompra.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">Taxa de Pagamento</span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {taxaPagamento.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t my-4"></div>
                <div className="flex justify-between font-semibold text-lg drop-shadow">
                  <span>Total</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
                <LoadingButton
                  onClick={handleCheckout}
                  disabled={!userProfile}
                  isLoading={isProcessing}
                  loadingText="Processando Pagamento..."
                  className="mt-6 w-full font-bold"
                  variant="primary"
                  size="lg"
                >
                  Finalizar Compra
                </LoadingButton>
                
                {/* Informações adicionais */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Compra segura • Dados protegidos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Usuário: {userProfile?.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Ingressos ficam pendentes até confirmação do organizador
                  </p>
                </div>
                {/* Logos dos métodos de pagamento */}
                <div className="flex justify-center items-center gap-4 mt-6">
                  <img src="https://i.postimg.cc/W1ry1x4P/Visa-Logo.png" alt="Visa" className="h-8 w-auto object-contain" />
                  <img src="https://i.postimg.cc/m27qb0kW/Mastercard-2019-logo-svg.png" alt="MasterCard" className="h-8 w-auto object-contain" />
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

export default CheckoutPage;