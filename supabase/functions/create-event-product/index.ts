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
    const eventData = await req.json()
    const {
      title,
      description,
      price,
      currency = 'brl',
      event_date,
      location,
      max_attendees,
      category,
      images = [],
      ticket_types = []
    } = eventData

    // Validate required fields
    if (!title || !description || !price || !event_date) {
      throw new Error('Campos obrigatórios: title, description, price, event_date')
    }

    // Step 1: Create event in Supabase
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .insert({
        title,
        description,
        price: parseFloat(price),
        currency,
        event_date,
        location,
        max_attendees: max_attendees || null,
        category,
        images,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single()

    if (eventError) {
      console.error('Erro ao criar evento:', eventError)
      throw new Error('Falha ao criar evento no banco de dados')
    }

    console.log('Evento criado no Supabase:', event.id)

    // Step 2: Create product in Stripe
    const stripeProduct = await stripe.products.create({
      name: title,
      description: description,
      metadata: {
        supabase_event_id: event.id,
        created_by: user.id,
        event_date: event_date,
        location: location || '',
      },
      images: images.length > 0 ? images : undefined,
    })

    console.log('Produto criado no Stripe:', stripeProduct.id)

    // Step 3: Create price(s) for the product
    const stripePrices = []

    if (ticket_types.length > 0) {
      // Create multiple ticket types with different prices
      for (const ticketType of ticket_types) {
        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(parseFloat(ticketType.price) * 100), // Convert to cents
          currency: currency.toLowerCase(),
          metadata: {
            ticket_type: ticketType.name,
            supabase_event_id: event.id,
          },
        })
        
        stripePrices.push({
          stripe_price_id: stripePrice.id,
          ticket_type: ticketType.name,
          price: ticketType.price,
          description: ticketType.description || '',
          quantity_available: ticketType.quantity || null
        })
      }
    } else {
      // Create single default price
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(parseFloat(price) * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          ticket_type: 'standard',
          supabase_event_id: event.id,
        },
      })

      stripePrices.push({
        stripe_price_id: stripePrice.id,
        ticket_type: 'standard',
        price: price,
        description: 'Ingresso padrão',
        quantity_available: max_attendees
      })
    }

    // Step 4: Update event with Stripe product info
    const { error: updateError } = await supabaseClient
      .from('events')
      .update({
        stripe_product_id: stripeProduct.id,
        status: 'active'
      })
      .eq('id', event.id)

    if (updateError) {
      console.error('Erro ao atualizar evento com produto Stripe:', updateError)
      // Don't throw here, as the event and product were created successfully
    }

    // Step 5: Create event ticket types
    if (stripePrices.length > 0) {
      const ticketTypesData = stripePrices.map(priceData => ({
        event_id: event.id,
        ...priceData
      }))

      const { error: ticketTypesError } = await supabaseClient
        .from('event_ticket_types')
        .insert(ticketTypesData)

      if (ticketTypesError) {
        console.error('Erro ao criar tipos de ingresso:', ticketTypesError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        event: {
          id: event.id,
          title: event.title,
          stripe_product_id: stripeProduct.id,
          prices: stripePrices,
        },
        message: 'Evento criado com sucesso e produto configurado no Stripe'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro ao criar evento e produto:', error)
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