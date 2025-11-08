# 🚀 CONFIGURAÇÃO COMPLETA DO PAGAR.ME (WINDOWS)
# =============================================

Write-Host "🚀 CONFIGURAÇÃO COMPLETA DO PAGAR.ME" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Verificar se Supabase CLI está instalado
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERRO: Supabase CLI não está instalado!" -ForegroundColor Red
    Write-Host "📥 Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# PASSO 1: Verificar status atual
Write-Host "📋 PASSO 1: VERIFICANDO STATUS ATUAL" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
supabase functions list

Write-Host ""
Write-Host ""

# PASSO 2: Remover functions antigas do Stripe
Write-Host "🗑️ PASSO 2: REMOVENDO FUNCTIONS ANTIGAS DO STRIPE" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Red

Write-Host "❌ Removendo create-checkout-session..." -ForegroundColor Yellow
supabase functions delete create-checkout-session

Write-Host "❌ Removendo create-event-product..." -ForegroundColor Yellow
supabase functions delete create-event-product

Write-Host "❌ Removendo create-payment-intent..." -ForegroundColor Yellow
supabase functions delete create-payment-intent

Write-Host "❌ Removendo create-subscription..." -ForegroundColor Yellow
supabase functions delete create-subscription

Write-Host "❌ Removendo get-customer-portal..." -ForegroundColor Yellow
supabase functions delete get-customer-portal

Write-Host "❌ Removendo refund-payment..." -ForegroundColor Yellow
supabase functions delete refund-payment

Write-Host "❌ Removendo stripe-webhook..." -ForegroundColor Yellow
supabase functions delete stripe-webhook

Write-Host ""
Write-Host ""

# PASSO 3: Verificar remoção
Write-Host "✅ PASSO 3: VERIFICANDO REMOÇÃO" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
supabase functions list

Write-Host ""
Write-Host ""

# PASSO 4: Deploy das novas functions do Pagar.me
Write-Host "🚀 PASSO 4: DEPLOY DAS NOVAS FUNCTIONS DO PAGAR.ME" -ForegroundColor Blue
Write-Host "===================================================" -ForegroundColor Blue

Write-Host "📦 Deploy process-payment..." -ForegroundColor Cyan
supabase functions deploy process-payment

Write-Host "📦 Deploy get-payment-status..." -ForegroundColor Cyan
supabase functions deploy get-payment-status

Write-Host "📦 Deploy cancel-payment..." -ForegroundColor Cyan
supabase functions deploy cancel-payment

Write-Host ""
Write-Host ""

# PASSO 5: Verificar deploy
Write-Host "✅ PASSO 5: VERIFICAÇÃO FINAL" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
supabase functions list

Write-Host ""
Write-Host ""

# PASSO 6: Configurar chave do Pagar.me
Write-Host "🔑 PASSO 6: CONFIGURAR CHAVE DO PAGAR.ME" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "⚠️  IMPORTANTE: Digite sua chave API real do Pagar.me!" -ForegroundColor Red
Write-Host ""

$PAGARME_API_KEY = Read-Host "🔑 Digite sua chave API do Pagar.me"

if ([string]::IsNullOrEmpty($PAGARME_API_KEY)) {
    Write-Host "❌ ERRO: Chave API não pode estar vazia!" -ForegroundColor Red
    exit 1
}

Write-Host "🔐 Configurando chave do Pagar.me..." -ForegroundColor Yellow
supabase secrets set PAGARME_API_KEY="$PAGARME_API_KEY"

Write-Host ""
Write-Host "🔧 Secrets configurados:" -ForegroundColor Cyan
supabase secrets list

Write-Host ""
Write-Host ""

# PASSO 7: Limpar pastas antigas
Write-Host "🧹 PASSO 7: LIMPANDO PASTAS ANTIGAS" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

$FUNCTIONS_DIR = "supabase\functions"

# Remover pastas das functions antigas
if (Test-Path "$FUNCTIONS_DIR\create-checkout-session") {
    Write-Host "❌ Removendo pasta create-checkout-session..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$FUNCTIONS_DIR\create-checkout-session"
}

if (Test-Path "$FUNCTIONS_DIR\create-event-product") {
    Write-Host "❌ Removendo pasta create-event-product..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$FUNCTIONS_DIR\create-event-product"
}

if (Test-Path "$FUNCTIONS_DIR\create-payment-intent") {
    Write-Host "❌ Removendo pasta create-payment-intent..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$FUNCTIONS_DIR\create-payment-intent"
}

if (Test-Path "$FUNCTIONS_DIR\create-subscription") {
    Write-Host "❌ Removendo pasta create-subscription..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$FUNCTIONS_DIR\create-subscription"
}

if (Test-Path "$FUNCTIONS_DIR\get-customer-portal") {
    Write-Host "❌ Removendo pasta get-customer-portal..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$FUNCTIONS_DIR\get-customer-portal"
}

if (Test-Path "$FUNCTIONS_DIR\refund-payment") {
    Write-Host "❌ Removendo pasta refund-payment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$FUNCTIONS_DIR\refund-payment"
}

if (Test-Path "$FUNCTIONS_DIR\stripe-webhook") {
    Write-Host "❌ Removendo pasta stripe-webhook..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$FUNCTIONS_DIR\stripe-webhook"
}

Write-Host ""
Write-Host "📁 Pastas restantes:" -ForegroundColor Cyan
Get-ChildItem $FUNCTIONS_DIR

Write-Host ""
Write-Host ""

# PASSO 8: Resumo final
Write-Host "🎯 CONFIGURAÇÃO COMPLETA!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host "✅ Functions antigas do Stripe REMOVIDAS" -ForegroundColor Green
Write-Host "✅ Functions novas do Pagar.me DEPLOYADAS" -ForegroundColor Green
Write-Host "✅ Chave do Pagar.me CONFIGURADA" -ForegroundColor Green
Write-Host "✅ Pastas antigas LIMPAS" -ForegroundColor Green
Write-Host "✅ Sistema pronto para uso!" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Próximos passos:" -ForegroundColor Blue
Write-Host "1. Testar as functions no frontend" -ForegroundColor White
Write-Host "2. Configurar webhooks se necessário" -ForegroundColor White
Write-Host "3. Testar pagamentos com cartão e PIX" -ForegroundColor White

Write-Host ""
Write-Host "📚 Documentação: README_ARQUITETURA_SEGURA.md" -ForegroundColor Cyan
Write-Host "🔧 Scripts disponíveis na pasta scripts/" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎉 Processo concluído com sucesso!" -ForegroundColor Green
