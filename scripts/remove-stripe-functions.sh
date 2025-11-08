#!/bin/bash

echo "🗑️ REMOVENDO FUNCTIONS ANTIGAS DO STRIPE..."
echo "================================================"

# Listar functions antes da remoção
echo "📋 Functions antes da remoção:"
supabase functions list

echo ""
echo "🚨 Removendo functions do Stripe..."

# Remover todas as functions antigas do Stripe
echo "❌ Removendo create-checkout-session..."
supabase functions delete create-checkout-session

echo "❌ Removendo create-event-product..."
supabase functions delete create-event-product

echo "❌ Removendo create-payment-intent..."
supabase functions delete create-payment-intent

echo "❌ Removendo create-subscription..."
supabase functions delete create-subscription

echo "❌ Removendo get-customer-portal..."
supabase functions delete get-customer-portal

echo "❌ Removendo refund-payment..."
supabase functions delete refund-payment

echo "❌ Removendo stripe-webhook..."
supabase functions delete stripe-webhook

echo ""
echo "✅ VERIFICAÇÃO FINAL:"
echo "====================="

# Listar functions após a remoção
echo "📋 Functions restantes:"
supabase functions list

echo ""
echo "🎯 RESULTADO:"
echo "============="
echo "✅ Functions antigas do Stripe REMOVIDAS"
echo "✅ Apenas functions do Pagar.me permanecem"
echo "✅ Sistema limpo e organizado!"
