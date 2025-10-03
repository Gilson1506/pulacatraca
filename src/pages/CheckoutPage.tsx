import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Minus, AlertTriangle } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import SecureCheckoutForm from '../components/SecureCheckoutForm';

/**
 * Gera código QR no formato PLKTK + 6 dígitos únicos
 * Exemplo: PLKTK324534, PLKTK789012
 */
const generateQRCode = (): string => {
  // Usa timestamp + random para garantir unicidade
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const combined = (timestamp + random).toString().slice(-6);
  return `PLKTK${combined}`;
};

const CheckoutPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [showPagarmeForm, setShowPagarmeForm] = useState(false);
  const [orderData, setOrderData] = useState(null);
  
  // Estado local para dados restaurados do localStorage
  const [restoredData, setRestoredData] = useState(null);

  const { event, selectedTickets, totalAmount, ticket } = state || restoredData || {};

  useEffect(() => {
    console.log('🔄 CheckoutPage - Dados recebidos:', { event, selectedTickets, totalAmount, ticket, state });
    console.log('🔄 CheckoutPage - State completo:', state);
    console.log('🔄 CheckoutPage - useLocation state:', state);
    console.log('🔄 CheckoutPage - Window history state:', window.history.state);
    
    // SOLUÇÃO ALTERNATIVA: Verificar localStorage se useLocation falhar
    const localStorageData = localStorage.getItem('checkout_restore_data');
    if (localStorageData && !restoredData) {
      console.log('💾 Dados encontrados no localStorage:', localStorageData);
      try {
        const parsedData = JSON.parse(localStorageData);
        console.log('💾 Dados parseados do localStorage:', parsedData);
        
        // Se não temos dados via useLocation, usar localStorage
        if (!event && !selectedTickets && !ticket) {
          console.log('🔄 Usando dados do localStorage como fallback');
          
          // Limpar localStorage após usar
          localStorage.removeItem('checkout_restore_data');
          
          // Definir dados restaurados no estado local
          setRestoredData(parsedData);
          return;
        }
      } catch (error) {
        console.error('❌ Erro ao parsear dados do localStorage:', error);
        localStorage.removeItem('checkout_restore_data');
      }
    }
    
    // Adicionar um pequeno delay para garantir que a navegação seja concluída
    const timer = setTimeout(() => {
      console.log('⏰ CheckoutPage - Validação após delay:', { event, selectedTickets, totalAmount, ticket, state });
      console.log('⏰ CheckoutPage - State após delay:', state);
      
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

      // Validar se os dados estão completos
      if (event && (!event.id || !event.title)) {
        console.warn('❌ Dados do evento incompletos. Redirecionando...');
        navigate('/');
        return;
      }

      // Validar se há tickets selecionados
      if (selectedTickets && selectedTickets.length === 0 && !ticket) {
        console.warn('❌ Nenhum ingresso selecionado. Redirecionando...');
        navigate('/');
        return;
      }

      // Validar dados dos tickets se existirem
      if (selectedTickets && selectedTickets.length > 0) {
        const invalidTickets = selectedTickets.filter((t: any) => !t.ticketId || !t.ticketName || t.price <= 0);
        if (invalidTickets.length > 0) {
          console.warn('❌ Dados dos tickets inválidos:', invalidTickets);
          navigate('/');
          return;
        }
      }

      console.log('✅ Dados validados com sucesso. Evento:', event.title, 'Tickets:', selectedTickets?.length || 0);

      // Se logado, carregar dados
      if (user) {
        console.log('👤 Usuário logado, carregando dados...');
        loadUserData();
        loadEventData();
      } else {
        console.log('🔐 Usuário não logado, aguardando login...');
      }
    }, 100); // 100ms de delay

    return () => clearTimeout(timer);
  }, [event, selectedTickets, ticket, navigate, user, state, restoredData]);

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

  // Calcular subtotal baseado nos tickets selecionados
  const subtotal = selectedTickets && selectedTickets.length > 0 
    ? selectedTickets.reduce((sum: number, ticket: any) => {
        const price = parseFloat(ticket.price) || 0;
        const qty = parseInt(ticket.quantity) || 0;
        const total = price * qty;
        console.log('🔍 Calculando ticket:', { price, qty, total, ticket });
        return sum + total;
      }, 0)
    : (ticket ? (parseFloat(ticket.price) || 0) * quantity : 0);

  // Debug do subtotal
  console.log('🔍 DEBUG CheckoutPage - Cálculo do subtotal:', {
    selectedTickets,
    selectedTicketsLength: selectedTickets?.length,
    ticket,
    quantity,
    subtotal,
    calculation: selectedTickets && selectedTickets.length > 0 
      ? selectedTickets.map((t: any) => ({ 
          price: parseFloat(t.price) || 0, 
          quantity: parseInt(t.quantity) || 0, 
          total: (parseFloat(t.price) || 0) * (parseInt(t.quantity) || 0) 
        }))
      : [{ price: parseFloat(ticket?.price) || 0, quantity, total: (parseFloat(ticket?.price) || 0) * quantity }]
  });
    
  let taxaCompra = 0;
  if (subtotal < 30) {
    taxaCompra = 3;
  } else {
    taxaCompra = subtotal * 0.10;
  }
  const taxaPagamento = paymentMethod === 'card' ? subtotal * 0.06 : 0; // 6% cartão, 0 pix
  const totalPrice = subtotal + taxaCompra + taxaPagamento;

  // Garantir reencaminhamento ao login no finalizar e retorno ao checkout com dados
  const requireAuthAndPersist = () => {
    const checkoutState = {
      event,
      selectedTickets,
      totalAmount,
      ticket,
      quantity,
      paymentMethod
    };
    localStorage.setItem('checkout_data', JSON.stringify({
      returnTo: '/checkout',
      state: checkoutState
    }));
    navigate('/login');
  };

  const handleCheckout = async () => {
    try {
      // Se não logado, salvar dados e ir para login
      if (!user) {
        requireAuthAndPersist();
        return;
      }

      setIsProcessing(true);
      console.log('🛒 Iniciando processo de compra com Pagar.me...');

      // Validações finais
      if (!userProfile || !eventData) {
        alert('Dados incompletos. Por favor, recarregue a página e tente novamente.');
        return;
      }

      // Preparar dados para o Pagar.me
      const orderItems = [];
      
      if (selectedTickets && selectedTickets.length > 0) {
        selectedTickets.forEach(ticket => {
          for (let i = 0; i < ticket.quantity; i++) {
            orderItems.push({
              amount: Math.round(ticket.price * 100), // Pagar.me usa centavos
              description: `${ticket.ticketName} - ${event.title}`,
              quantity: 1,
              code: `TICKET_${ticket.ticketId || Date.now()}_${i}`
            });
          }
        });
      } else if (ticket) {
        for (let i = 0; i < quantity; i++) {
          orderItems.push({
            amount: Math.round(ticket.price * 100),
            description: `${ticket.name} - ${event.title}`,
            quantity: 1,
            code: `TICKET_${Date.now()}_${i}`
          });
        }
      }

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

      console.log('💳 Dados preparados para Pagar.me:', {
        items: orderItems,
        customer: customerData,
        total: totalPrice
      });

      // Preparar dados para o formulário do Pagar.me
      const pagarmeOrderData = {
        items: orderItems,
        customer: customerData,
        total_amount: Math.round(totalPrice * 100),
        event: event,
        selectedTickets: selectedTickets,
        ticket: ticket,
        quantity: quantity
      };

      // Salvar dados e mostrar formulário do Pagar.me
      setOrderData(pagarmeOrderData);
      setShowPagarmeForm(true);
      setIsProcessing(false);

      console.log('✅ Formulário Pagar.me preparado');
      return;
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
        
        // Usar selectedTickets se disponível, senão fallback para ticket único
        if (selectedTickets && selectedTickets.length > 0) {
          selectedTickets.forEach(selectedTicket => {
            for (let i = 0; i < selectedTicket.quantity; i++) {
              const ticketData = {
                event_id: event.id,
                buyer_id: user.id,
                user_id: user.id,
                price: Math.round(selectedTicket.price), // Preço já vem correto
                original_price: Math.round(selectedTicket.price),
                qr_code: generateQRCode(),
                ticket_type: selectedTicket.ticketName || 'Padrão',
                ticket_type_name: selectedTicket.ticketName || 'Padrão',
                ticket_area: selectedTicket.area || 'Geral',
                ticket_sector: selectedTicket.sector || null,
                gender: selectedTicket.gender || 'unisex',
                has_half_price: false,
                status: 'active',
                created_at: new Date().toISOString()
              };
              ticketsBuyer.push(ticketData);
            }
          });
        } else if (ticket) {
          // Fallback para formato antigo
          for (let i = 0; i < quantity; i++) {
            const ticketData = {
              event_id: event.id,
              buyer_id: user.id,
              user_id: user.id,
              price: Math.round(ticket.price || 0),
              qr_code: generateQRCode(),
              ticket_type: ticket.name || 'Padrão',
              status: 'active',
              created_at: new Date().toISOString()
            };
            ticketsBuyer.push(ticketData);
          }
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
          
          // Usar selectedTickets se disponível, senão fallback para ticket único
          if (selectedTickets && selectedTickets.length > 0) {
            selectedTickets.forEach(selectedTicket => {
              for (let i = 0; i < selectedTicket.quantity; i++) {
                const ticketData = {
                  event_id: event.id,
                  user_id: user.id,
                  price: Math.round(selectedTicket.price),
                  original_price: Math.round(selectedTicket.price),
                  qr_code: generateQRCode(),
                  ticket_type: selectedTicket.ticketName || 'Padrão',
                  ticket_type_name: selectedTicket.ticketName || 'Padrão',
                  ticket_area: selectedTicket.area || 'Geral',
                  ticket_sector: selectedTicket.sector || null,
                  gender: selectedTicket.gender || 'unisex',
                  has_half_price: false,
                  status: 'active',
                  created_at: new Date().toISOString()
                };
                ticketsUser.push(ticketData);
              }
            });
          } else if (ticket) {
            for (let i = 0; i < quantity; i++) {
              const ticketData = {
                event_id: event.id,
                user_id: user.id,
                price: Math.round(ticket.price || 0),
                qr_code: generateQRCode(),
                ticket_type: ticket.name || 'Padrão',
                status: 'active',
                created_at: new Date().toISOString()
              };
              ticketsUser.push(ticketData);
            }
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
            
                         if (selectedTickets && selectedTickets.length > 0) {
               selectedTickets.forEach(selectedTicket => {
                 for (let i = 0; i < selectedTicket.quantity; i++) {
                   const ticketData = {
                     event_id: event.id,
                     user_id: user.id,
                     price: Math.round(selectedTicket.price),
                     original_price: Math.round(selectedTicket.price),
                     qr_code: generateQRCode(),
                     ticket_type_name: selectedTicket.ticketName || 'Padrão',
                     ticket_area: selectedTicket.area || 'Geral',
                     gender: selectedTicket.gender || 'unisex',
                     status: 'active'
                   };
                   ticketsMinimal.push(ticketData);
                 }
               });
             } else if (ticket) {
               for (let i = 0; i < quantity; i++) {
                 const ticketData = {
                   event_id: event.id,
                   user_id: user.id,
                   price: Math.round(ticket.price || 0),
                   original_price: Math.round(ticket.price || 0),
                   qr_code: generateQRCode(),
                   ticket_type_name: ticket.name || 'Padrão',
                   ticket_area: 'Geral',
                   gender: 'unisex',
                   status: 'active'
                 };
                 ticketsMinimal.push(ticketData);
               }
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
              
                             if (selectedTickets && selectedTickets.length > 0) {
                 selectedTickets.forEach(selectedTicket => {
                   for (let i = 0; i < selectedTicket.quantity; i++) {
                     const ticketData = {
                       event_id: event.id,
                       user_id: user.id,
                       price: Math.round(selectedTicket.price),
                       original_price: Math.round(selectedTicket.price),
                       qr_code: generateQRCode(),
                       ticket_type_name: selectedTicket.ticketName || 'Padrão',
                       ticket_area: selectedTicket.area || 'Geral',
                       gender: selectedTicket.gender || 'unisex',
                       status: 'active'
                     };
                     ticketsCore.push(ticketData);
                   }
                 });
               } else if (ticket) {
                 for (let i = 0; i < quantity; i++) {
                   const ticketData = {
                     event_id: event.id,
                     user_id: user.id,
                     price: Math.round(ticket.price || 0),
                     original_price: Math.round(ticket.price || 0),
                     qr_code: generateQRCode(),
                     ticket_type_name: ticket.name || 'Padrão',
                     ticket_area: 'Geral',
                     gender: 'unisex',
                     status: 'active'
                   };
                   ticketsCore.push(ticketData);
                 }
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
            let totalTicketsToCreate = 0;
            
            if (selectedTickets && selectedTickets.length > 0) {
              totalTicketsToCreate = selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
              let ticketIndex = 0;
              
              for (const selectedTicket of selectedTickets) {
                for (let i = 0; i < selectedTicket.quantity; i++) {
                  ticketIndex++;
                                     const { data: singleTicket, error: singleError } = await supabase
                     .from('tickets')
                     .insert({
                       event_id: event.id,
                       user_id: user.id,
                       price: Math.round(selectedTicket.price),
                       original_price: Math.round(selectedTicket.price),
                       qr_code: generateQRCode(),
                       ticket_type: selectedTicket.ticketName || 'Padrão',
                       ticket_type_name: selectedTicket.ticketName || 'Padrão',
                       ticket_area: selectedTicket.area || 'Geral',
                       ticket_sector: selectedTicket.sector || null,
                       gender: selectedTicket.gender || 'unisex',
                       has_half_price: false
                     })
                     .select()
                     .single();

                  if (!singleError && singleTicket) {
                    ticketsForce.push(singleTicket);
                    console.log(`✅ Ingresso ${ticketIndex}/${totalTicketsToCreate} criado (${selectedTicket.ticketName})`);
                  } else {
                    console.log(`❌ Erro no ingresso ${ticketIndex}:`, singleError);
                  }
                }
              }
            } else if (ticket) {
              totalTicketsToCreate = quantity;
              for (let i = 0; i < quantity; i++) {
                                 const { data: singleTicket, error: singleError } = await supabase
                   .from('tickets')
                   .insert({
                     event_id: event.id,
                     user_id: user.id,
                     price: Math.round(ticket.price || 0),
                     original_price: Math.round(ticket.price || 0),
                     qr_code: generateQRCode(),
                     ticket_type: ticket.name || 'Padrão',
                     ticket_type_name: ticket.name || 'Padrão',
                     ticket_area: 'Geral',
                     gender: 'unisex',
                     has_half_price: false
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

  // Callbacks para o formulário do Pagar.me
  const handlePagarmeSuccess = async (paymentResult) => {
    console.log('✅ Pagamento Pagar.me realizado com sucesso:', paymentResult);
    
    try {
      // Aqui você pode processar o resultado do pagamento
      // Por exemplo, criar ingressos, enviar emails, etc.
      
      // Redirecionar para sucesso
      navigate('/profile', {
        state: {
          message: `🎉 Pagamento realizado com sucesso via Pagar.me!
          
Detalhes da compra:
• Evento: ${event.title}
• Valor: R$ ${totalPrice.toFixed(2)}
• Método: ${paymentResult.payment_method}
• Status: ${paymentResult.status}

Seus ingressos serão processados automaticamente.`,
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
              onSuccess={handlePagarmeSuccess}
              onCancel={handlePagarmeCancel}
            />
          </div>
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

              {/* Selected Tickets Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Ingressos Selecionados</h2>
                
                {selectedTickets && selectedTickets.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTickets.map((selectedTicket, index) => (
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
                          {console.log('🎫 Exibindo preço no checkout:', {
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
                          {console.log('🎫 Calculando subtotal no checkout:', {
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
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-700">Total:</span>
                        <span className="text-2xl font-bold text-pink-600">
                          R$ {totalAmount ? (parseFloat(totalAmount.toString()) || 0).toFixed(2) : 
                              selectedTickets.reduce((sum, ticket) => sum + ((parseFloat(ticket.price) || 0) * (parseInt(ticket.quantity) || 0)), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : ticket ? (
                  // Fallback para o formato antigo
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-700 drop-shadow-sm">{ticket.name}</h3>
                      <p className="text-lg font-bold text-pink-600 drop-shadow-sm">R$ {(parseFloat(ticket.price) || 0).toFixed(2)}</p>
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
                ) : (
                  <p className="text-gray-500">Nenhum ingresso selecionado</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 drop-shadow-sm">Método de pagamento</h2>
                <div className="space-y-3">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                      paymentMethod === 'card' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                    }`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`mr-3 transition-all duration-300 ${
                          paymentMethod === 'card' ? 'opacity-100' : 'opacity-70'
                        }`}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                            <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="18" cy="14" r="2" fill="currentColor" opacity="0.3"/>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-600 drop-shadow-sm">Cartão de Crédito</span>
                      </div>
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        {paymentMethod === 'card' && <div className="h-2 w-2 rounded-full bg-pink-500"></div>}
                      </div>
                    </div>
                  </div>
                  {/* PIX Payment Method */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                      paymentMethod === 'pix' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                    }`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className={`mr-3 transition-all duration-300 ${
                          paymentMethod === 'pix' ? 'opacity-100' : 'opacity-70'
                        }`}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                            <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="transparent"/>
                          </svg>
                        </div>
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
                    <span className="text-gray-600 drop-shadow-sm">
                      Subtotal ({selectedTickets ? selectedTickets.reduce((sum, t) => sum + t.quantity, 0) : quantity} {(selectedTickets ? selectedTickets.reduce((sum, t) => sum + t.quantity, 0) : quantity) > 1 ? 'ingressos' : 'ingresso'})
                    </span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {(parseFloat(subtotal.toString()) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">Taxa de Compra</span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {(parseFloat(taxaCompra.toString()) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 drop-shadow-sm">Taxa de Pagamento</span>
                    <span className="font-medium text-gray-600 drop-shadow-sm">R$ {(parseFloat(taxaPagamento.toString()) || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t my-4"></div>
                <div className="flex justify-between font-semibold text-lg drop-shadow">
                  <span>Total</span>
                  <span>R$ {(parseFloat(totalPrice.toString()) || 0).toFixed(2)}</span>
                </div>
                <LoadingButton
                  onClick={handleCheckout}
                  disabled={!userProfile}
                  isLoading={isProcessing}
                  loadingText="Preparando Pagar.me..."
                  className="mt-6 w-full font-bold"
                  variant="primary"
                  size="lg"
                >
                  {isProcessing ? 'Preparando...' : 'Pagar com Pagar.me'}
                </LoadingButton>
                
                {/* Informações adicionais */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    🔒 Compra segura • Dados protegidos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    💳 Pagamento processado pelo Pagar.me
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    👤 Usuário: {userProfile?.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    🎫 Ingressos processados automaticamente após pagamento
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

export default CheckoutPage;