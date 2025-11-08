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

    if (req.method === "GET") {
      const url = new URL(req.url)
      order_id = url.searchParams.get("order_id")
    } else if (req.method === "POST") {
      const body = await req.json()
      order_id = body.order_id || body.payment_id
    }

    if (!order_id) {
      throw new Error("order_id é obrigatório")
    }

    const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/orders/${order_id}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(Deno.env.get("PAGARME_API_KEY") + ":")}`,
        "Content-Type": "application/json",
      },
    })

    const pagarmeData = await pagarmeResponse.json()

    if (!pagarmeResponse.ok) {
      console.error("Erro da API Pagar.me:", pagarmeData)
      throw new Error(pagarmeData.errors?.[0]?.message || "Erro na API do Pagar.me")
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
        created_at: pagarmeData.created_at,
        updated_at: pagarmeData.updated_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("Error getting payment status:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
