import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Webhook signature missing', { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log(`Processando evento: ${event.type}`)

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Evento não tratado: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Pagamento bem-sucedido: ${paymentIntent.id}`)

  // Handle transaction-based payments (events/tickets)
  if (paymentIntent.metadata?.supabase_transaction_id) {
    return await handleEventTicketPayment(paymentIntent)
  }

  // Legacy payment handling
  const { error } = await supabaseClient
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: paymentIntent.latest_charge,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Erro ao atualizar pagamento:', error)
    throw error
  }

  // If this payment is for a ticket, update ticket status
  if (paymentIntent.metadata?.ticket_id) {
    await supabaseClient
      .from('tickets')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentIntent.metadata.ticket_id)
  }

  // Send confirmation email or notification
  await sendPaymentConfirmation(paymentIntent)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Pagamento falhou: ${paymentIntent.id}`)

  // Update payment status
  await supabaseClient
    .from('payments')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  // If this payment is for a ticket, update ticket status
  if (paymentIntent.metadata?.ticket_id) {
    await supabaseClient
      .from('tickets')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentIntent.metadata.ticket_id)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log(`Assinatura atualizada: ${subscription.id}`)

  const customer = await stripe.customers.retrieve(subscription.customer as string)
  const supabaseUserId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!supabaseUserId) {
    console.error('Usuário do Supabase não encontrado no customer')
    return
  }

  // Update or create subscription record
  await supabaseClient
    .from('subscriptions')
    .upsert({
      user_id: supabaseUserId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      price_id: subscription.items.data[0]?.price?.id,
      quantity: subscription.items.data[0]?.quantity || 1,
      updated_at: new Date().toISOString(),
    })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Assinatura cancelada: ${subscription.id}`)

  await supabaseClient
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Fatura paga: ${invoice.id}`)

  // Update subscription billing
  if (invoice.subscription) {
    await supabaseClient
      .from('subscription_invoices')
      .insert({
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription,
        amount_paid: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'paid',
        period_start: new Date(invoice.period_start * 1000).toISOString(),
        period_end: new Date(invoice.period_end * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Falha no pagamento da fatura: ${invoice.id}`)

  // Log failed payment
  if (invoice.subscription) {
    await supabaseClient
      .from('subscription_invoices')
      .insert({
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription,
        amount_due: invoice.amount_due / 100,
        currency: invoice.currency,
        status: 'failed',
        period_start: new Date(invoice.period_start * 1000).toISOString(),
        period_end: new Date(invoice.period_end * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })
  }
}

async function handleEventTicketPayment(paymentIntent: Stripe.PaymentIntent) {
  const transactionId = paymentIntent.metadata.supabase_transaction_id
  const userId = paymentIntent.metadata.supabase_user_id
  const eventId = paymentIntent.metadata.event_id
  const ticketTypeId = paymentIntent.metadata.ticket_type_id

  console.log(`Processando pagamento de ingresso - Transação: ${transactionId}`)

  try {
    // Update transaction status
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .update({
        status: 'completed',
        stripe_charge_id: paymentIntent.latest_charge,
        payment_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (transactionError) {
      console.error('Erro ao atualizar transação:', transactionError)
      throw transactionError
    }

    // Update ticket purchase status
    const { error: ticketError } = await supabaseClient
      .from('ticket_purchases')
      .update({
        status: 'confirmed',
        payment_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId)

    if (ticketError) {
      console.error('Erro ao atualizar compra de ingresso:', ticketError)
      throw ticketError
    }

    // Generate unique ticket codes
    const { data: ticketPurchase } = await supabaseClient
      .from('ticket_purchases')
      .select('quantity, id')
      .eq('transaction_id', transactionId)
      .single()

    if (ticketPurchase) {
      const tickets = []
      for (let i = 0; i < ticketPurchase.quantity; i++) {
        const ticketCode = generateTicketCode(eventId, ticketPurchase.id, i + 1)
        tickets.push({
          ticket_purchase_id: ticketPurchase.id,
          user_id: userId,
          event_id: eventId,
          ticket_type_id: ticketTypeId,
          ticket_code: ticketCode,
          status: 'active',
          created_at: new Date().toISOString(),
        })
      }

      // Insert individual tickets
      const { error: ticketsError } = await supabaseClient
        .from('tickets')
        .insert(tickets)

      if (ticketsError) {
        console.error('Erro ao criar ingressos individuais:', ticketsError)
      }
    }

    // Send confirmation email with tickets
    await sendTicketConfirmation(paymentIntent, transactionId)

    console.log(`Pagamento de ingresso processado com sucesso: ${transactionId}`)

  } catch (error) {
    console.error('Erro ao processar pagamento de ingresso:', error)
    throw error
  }
}

function generateTicketCode(eventId: string, purchaseId: string, sequenceNumber: number): string {
  const timestamp = Date.now().toString(36)
  const eventPrefix = eventId.slice(-4).toUpperCase()
  const purchasePrefix = purchaseId.slice(-4).toUpperCase()
  const sequence = sequenceNumber.toString().padStart(2, '0')
  
  return `${eventPrefix}-${purchasePrefix}-${timestamp}-${sequence}`
}

async function sendTicketConfirmation(paymentIntent: Stripe.PaymentIntent, transactionId: string) {
  // Get transaction and event details
  const { data: transaction } = await supabaseClient
    .from('transactions')
    .select(`
      *,
      events!inner(title, event_date, location),
      event_ticket_types!inner(ticket_type, price),
      ticket_purchases!inner(*)
    `)
    .eq('id', transactionId)
    .single()

  if (transaction) {
    console.log(`Enviando confirmação de ingressos para usuário: ${transaction.user_id}`)
    console.log(`Evento: ${transaction.events.title}`)
    console.log(`Quantidade: ${transaction.quantity} ingressos`)
    
    // Here you would implement email sending logic
    // For now, we'll just log the details
  }
}

async function sendPaymentConfirmation(paymentIntent: Stripe.PaymentIntent) {
  // Implement email notification logic here
  // You can use Supabase Edge Functions to send emails
  console.log(`Enviando confirmação de pagamento para: ${paymentIntent.metadata?.user_id}`)
}