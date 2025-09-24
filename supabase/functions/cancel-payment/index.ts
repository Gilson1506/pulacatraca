import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    )

    let order_id: string | null = null
    let reason: string | null = null

    if (req.method === "GET") {
      const url = new URL(req.url)
      order_id = url.searchParams.get("order_id")
      reason = url.searchParams.get("reason")
    } else if (req.method === "POST") {
      const body = await req.json()
      order_id = body.order_id || body.payment_id
      reason = body.reason
    }

    if (!order_id) {
      throw new Error("order_id é obrigatório")
    }

    // Cancelamento na API do Pagar.me
    const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/orders/${order_id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(Deno.env.get("PAGARME_API_KEY") + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: reason || "Cancelamento solicitado pelo cliente",
      }),
    })

    const pagarmeData = await pagarmeResponse.json()

    if (!pagarmeResponse.ok) {
      console.error("Erro da API Pagar.me:", pagarmeData)
      throw new Error(pagarmeData.errors?.[0]?.message || "Erro na API do Pagar.me")
    }

    // Atualizar Supabase (se existir tabela orders)
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
        cancel_reason: reason || "Cancelamento solicitado pelo cliente",
      })
      .eq("id", order_id) // ⚠️ aqui talvez precise ser "order_id" dependendo do schema

    if (updateError) {
      console.error("Erro ao atualizar order no Supabase:", updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: pagarmeData.id,
        status: pagarmeData.status,
        amount: pagarmeData.amount,
        currency: pagarmeData.currency,
        payments: pagarmeData.payments,
        customer: pagarmeData.customer,
        message: "Pagamento cancelado com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("Error canceling payment:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
