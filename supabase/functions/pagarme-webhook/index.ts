import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configurações
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tipos de eventos do Pagar.me
type PagarmeEvent = 
  | 'order.paid'
  | 'order.payment_failed'
  | 'order.canceled'
  | 'order.created'
  | 'order.pending'
  | 'order.expired'
  | 'order.updated'

interface PagarmeWebhookData {
  type: PagarmeEvent
  data: {
    id: string
    code: string
    status: string
    amount: number
    currency: string
    payment_method: string
    created_at: string
    updated_at: string
    customer: {
      id: string
      name: string
      email: string
      document: string
    }
    charges: Array<{
      id: string
      amount: number
      status: string
      payment_method: string
      paid_amount: number
      paid_at: string
    }>
    items: Array<{
      id: string
      type: string
      description: string
      amount: number
      quantity: number
    }>
  }
}

serve(async (req) => {
  // Habilitar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar headers de assinatura
    const signature = req.headers.get('x-hub-signature')
    if (!signature) {
      console.error('❌ Header de assinatura ausente')
      return new Response(
        JSON.stringify({ error: 'Assinatura do webhook ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar assinatura
    const isValidSignature = await verifyWebhookSignature(req, signature)
    if (!isValidSignature) {
      return new Response(
        JSON.stringify({ error: 'Assinatura inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter dados do webhook
    const webhookData: PagarmeWebhookData = await req.json()
    console.log('📥 Webhook recebido:', {
      type: webhookData.type,
      orderId: webhookData.data.id,
      status: webhookData.data.status
    })

    // Inicializar Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const result = await processWebhookEvent(supabase, webhookData)

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Verifica a assinatura do webhook do Pagar.me
 */
async function verifyWebhookSignature(req: Request, signature: string): Promise<boolean> {
  try {
    const webhookSecret = Deno.env.get('PAGARME_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.warn('⚠️ PAGARME_WEBHOOK_SECRET não configurado, pulando verificação')
      return true
    }

    const clonedReq = req.clone()
    const body = await clonedReq.text()
    const expectedSignature = `sha256=${await generateHmac(body, webhookSecret)}`
    
    return signature === expectedSignature
  } catch (error) {
    console.error('❌ Erro ao verificar assinatura:', error)
    return false
  }
}

/**
 * Gera HMAC
 */
async function generateHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Processa eventos
 */
async function processWebhookEvent(supabase: any, webhookData: PagarmeWebhookData) {
  try {
    const { type, data } = webhookData
    
    // Buscar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('pagarme_order_id', data.id)
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Pedido não encontrado' }
    }

    // Mapear status
    const statusMapping: Record<string, string> = {
      paid: 'paid',
      payment_failed: 'failed',
      canceled: 'canceled',
      pending: 'pending',
      expired: 'expired'
    }
    const newStatus = statusMapping[data.status] || data.status

    // Atualizar status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        webhook_log: webhookData
      })
      .eq('id', order.id)

    if (updateError) {
      return { success: false, error: 'Erro ao atualizar status' }
    }

    // Eventos específicos
    switch (type) {
      case 'order.paid':
        await handleOrderPaid(supabase, order, data)
        break
      case 'order.payment_failed':
        await handlePaymentFailed(supabase, order, data)
        break
      case 'order.canceled':
        await handleOrderCanceled(supabase, order, data)
        break
      case 'order.expired':
        await handleOrderExpired(supabase, order, data)
        break
    }

    return { success: true, message: 'Webhook processado', event: type }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Handlers
async function handleOrderPaid(supabase: any, order: any, webhookData: any) {
  console.log('💰 Pedido pago:', order.id)
  await supabase.from('orders').update({
    metadata: {
      ...(order.metadata || {}),
      paid_at: new Date().toISOString(),
      payment_details: webhookData.charges?.[0] || {}
    }
  }).eq('id', order.id)
}

async function handlePaymentFailed(_: any, order: any) {
  console.log('❌ Pagamento falhou:', order.id)
}

async function handleOrderCanceled(_: any, order: any) {
  console.log('🚫 Pedido cancelado:', order.id)
}

async function handleOrderExpired(_: any, order: any) {
  console.log('⏰ Pedido expirado:', order.id)
}
