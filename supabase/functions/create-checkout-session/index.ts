import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    // Parse request body
    const {
      event_id,
      ticket_type_id,
      quantity = 1,
      success_url,
      cancel_url,
      customer_info = {}
    } = await req.json()

    // Validate required fields
    if (!event_id || !ticket_type_id || !success_url || !cancel_url) {
      throw new Error('Campos obrigatórios: event_id, ticket_type_id, success_url, cancel_url')
    }

    // Step 1: Get event and ticket type information
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select(`
        *,
        event_ticket_types!inner(*)
      `)
      .eq('id', event_id)
      .eq('event_ticket_types.id', ticket_type_id)
      .single()

    if (eventError || !event) {
      throw new Error('Evento ou tipo de ingresso não encontrado')
    }

    const ticketType = event.event_ticket_types[0]
    
    // Step 2: Check ticket availability
    if (ticketType.quantity_available !== null) {
      const { data: soldTickets } = await supabaseClient
        .from('ticket_purchases')
        .select('quantity')
        .eq('event_id', event_id)
        .eq('ticket_type_id', ticket_type_id)
        .eq('status', 'confirmed')

      const totalSold = soldTickets?.reduce((sum, ticket) => sum + ticket.quantity, 0) || 0
      
      if (totalSold + quantity > ticketType.quantity_available) {
        throw new Error('Quantidade de ingressos não disponível')
      }
    }

    // Step 3: Get or create customer in Stripe
    let customerId: string
    
    const { data: existingCustomer } = await supabaseClient
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id
    } else {
      // Create new customer in Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: customer_info.name || '',
        phone: customer_info.phone || '',
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      // Store customer in database
      await supabaseClient.from('customers').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        email: user.email,
        name: customer_info.name || '',
        phone: customer_info.phone || '',
      })
    }

    // Step 4: Create transaction record in Supabase
    const totalAmount = parseFloat(ticketType.price) * quantity
    
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        event_id: event_id,
        ticket_type_id: ticket_type_id,
        quantity: quantity,
        unit_price: parseFloat(ticketType.price),
        total_amount: totalAmount,
        currency: event.currency,
        status: 'pending',
        customer_info: customer_info,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Erro ao criar transação:', transactionError)
      throw new Error('Falha ao registrar transação')
    }

    console.log('Transação registrada:', transaction.id)

    // Step 5: Create Checkout Session in Stripe
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'pix'],
      line_items: [
        {
          price: ticketType.stripe_price_id,
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&transaction_id=${transaction.id}`,
      cancel_url: `${cancel_url}?transaction_id=${transaction.id}`,
      metadata: {
        supabase_transaction_id: transaction.id,
        supabase_user_id: user.id,
        event_id: event_id,
        ticket_type_id: ticket_type_id,
        quantity: quantity.toString(),
      },
      payment_intent_data: {
        metadata: {
          supabase_transaction_id: transaction.id,
          supabase_user_id: user.id,
          event_id: event_id,
          ticket_type_id: ticket_type_id,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    })

    // Step 6: Update transaction with Stripe session info
    await supabaseClient
      .from('transactions')
      .update({
        stripe_checkout_session_id: checkoutSession.id,
        stripe_payment_intent_id: checkoutSession.payment_intent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    // Step 7: Create ticket purchase record
    await supabaseClient
      .from('ticket_purchases')
      .insert({
        transaction_id: transaction.id,
        user_id: user.id,
        event_id: event_id,
        ticket_type_id: ticket_type_id,
        quantity: quantity,
        unit_price: parseFloat(ticketType.price),
        total_amount: totalAmount,
        status: 'pending',
        stripe_checkout_session_id: checkoutSession.id,
      })

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutSession.url,
        transaction_id: transaction.id,
        session_id: checkoutSession.id,
        expires_at: checkoutSession.expires_at,
        message: 'Checkout criado com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro ao criar checkout:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})