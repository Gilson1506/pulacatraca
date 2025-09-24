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
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    )

    // body vindo do cliente
    const payload = await req.json()

    if (!payload.payment_method || !payload.amount || !payload.customer) {
      throw new Error("Campos obrigatórios não informados")
    }

    // ⚡ aqui não criamos mais token — usamos card_hash enviado pelo front
    let finalPayments = payload.payments

    // validação extra se for cartão
    if (["credit_card", "debit_card"].includes(payload.payment_method)) {
      const card =
        payload.payments[0]?.credit_card?.card ||
        payload.payments[0]?.debit_card?.card

      if (!card?.hash) {
        throw new Error("É necessário enviar o card_hash gerado no front")
      }
    }

    // payload final para o Pagar.me
    const orderPayload = {
      code: `ORDER_${Date.now()}`,
      amount: payload.amount,
      currency: payload.currency || "BRL",
      customer: payload.customer,
      items: payload.items,
      payments: finalPayments, // já com card_hash vindo do front
    }

    // chamada à API do Pagar.me
    const pagarmeResponse = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(Deno.env.get("PAGARME_API_KEY") + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    })

    const pagarmeData = await pagarmeResponse.json()

    if (!pagarmeResponse.ok) {
      console.error("Erro da API do Pagar.me:", pagarmeData)
      throw new Error(pagarmeData.errors?.[0]?.message || "Erro na API do Pagar.me")
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: pagarmeData.id,
        status: pagarmeData.status,
        payments: pagarmeData.payments,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("Error processing payment:", error)

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
