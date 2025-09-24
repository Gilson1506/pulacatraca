#!/bin/bash

echo "🧹 LIMPANDO PASTAS ANTIGAS DO STRIPE..."
echo "========================================"

# Diretório das functions
FUNCTIONS_DIR="supabase/functions"

echo "📁 Verificando diretório: $FUNCTIONS_DIR"

# Listar todas as pastas antes da limpeza
echo "📋 Pastas antes da limpeza:"
ls -la $FUNCTIONS_DIR

echo ""
echo "🗑️ Removendo pastas das functions antigas do Stripe..."

# Remover pastas das functions antigas
if [ -d "$FUNCTIONS_DIR/create-checkout-session" ]; then
    echo "❌ Removendo pasta create-checkout-session..."
    rm -rf "$FUNCTIONS_DIR/create-checkout-session"
fi

if [ -d "$FUNCTIONS_DIR/create-event-product" ]; then
    echo "❌ Removendo pasta create-event-product..."
    rm -rf "$FUNCTIONS_DIR/create-event-product"
fi

if [ -d "$FUNCTIONS_DIR/create-payment-intent" ]; then
    echo "❌ Removendo pasta create-payment-intent..."
    rm -rf "$FUNCTIONS_DIR/create-payment-intent"
fi

if [ -d "$FUNCTIONS_DIR/create-subscription" ]; then
    echo "❌ Removendo pasta create-subscription..."
    rm -rf "$FUNCTIONS_DIR/create-subscription"
fi

if [ -d "$FUNCTIONS_DIR/get-customer-portal" ]; then
    echo "❌ Removendo pasta get-customer-portal..."
    rm -rf "$FUNCTIONS_DIR/get-customer-portal"
fi

if [ -d "$FUNCTIONS_DIR/refund-payment" ]; then
    echo "❌ Removendo pasta refund-payment..."
    rm -rf "$FUNCTIONS_DIR/refund-payment"
fi

if [ -d "$FUNCTIONS_DIR/stripe-webhook" ]; then
    echo "❌ Removendo pasta stripe-webhook..."
    rm -rf "$FUNCTIONS_DIR/stripe-webhook"
fi

echo ""
echo "✅ VERIFICAÇÃO FINAL:"
echo "====================="

# Listar pastas após a limpeza
echo "📋 Pastas restantes:"
ls -la $FUNCTIONS_DIR

echo ""
echo "🎯 RESULTADO:"
echo "============="
echo "✅ Pastas antigas do Stripe REMOVIDAS"
echo "✅ Apenas pastas do Pagar.me permanecem"
echo "✅ Sistema de arquivos limpo!"
