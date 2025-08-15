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

    const { action, priceId, subscriptionId } = await req.json()

    switch (action) {
      case 'create':
        return await createSubscription(stripe, supabaseClient, user, priceId)
      
      case 'cancel':
        return await cancelSubscription(stripe, supabaseClient, subscriptionId)
      
      case 'update':
        return await updateSubscription(stripe, supabaseClient, subscriptionId, priceId)
      
      case 'reactivate':
        return await reactivateSubscription(stripe, supabaseClient, subscriptionId)
      
      default:
        throw new Error('Ação inválida')
    }

  } catch (error) {
    console.error('Erro na função de assinatura:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function createSubscription(
  stripe: Stripe,
  supabaseClient: any,
  user: any,
  priceId: string
) {
  if (!priceId) {
    throw new Error('Price ID é obrigatório')
  }

  // Get or create customer
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
    })
  }

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price: priceId,
    }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  })

  const invoice = subscription.latest_invoice as Stripe.Invoice
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

  return new Response(
    JSON.stringify({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      status: subscription.status,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function cancelSubscription(
  stripe: Stripe,
  supabaseClient: any,
  subscriptionId: string
) {
  if (!subscriptionId) {
    throw new Error('Subscription ID é obrigatório')
  }

  // Cancel subscription immediately
  const subscription = await stripe.subscriptions.del(subscriptionId)

  // Update local database
  await supabaseClient
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  return new Response(
    JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
      canceled_at: subscription.canceled_at,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function updateSubscription(
  stripe: Stripe,
  supabaseClient: any,
  subscriptionId: string,
  newPriceId: string
) {
  if (!subscriptionId || !newPriceId) {
    throw new Error('Subscription ID e Price ID são obrigatórios')
  }

  // Get current subscription
  const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  // Update subscription
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: currentSubscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations',
  })

  return new Response(
    JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
      newPriceId: newPriceId,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}

async function reactivateSubscription(
  stripe: Stripe,
  supabaseClient: any,
  subscriptionId: string
) {
  if (!subscriptionId) {
    throw new Error('Subscription ID é obrigatório')
  }

  // Reactivate subscription
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })

  // Update local database
  await supabaseClient
    .from('subscriptions')
    .update({
      status: subscription.status,
      canceled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  return new Response(
    JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}