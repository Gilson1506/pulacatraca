# Script para reiniciar o frontend e limpar cache
Write-Host "🔄 Reiniciando Frontend com cache limpo..." -ForegroundColor Cyan

# Limpar cache do Vite
Write-Host "🧹 Limpando cache do Vite..." -ForegroundColor Yellow
if (Test-Path "node_modules\.vite") {
    Remove-Item -Path "node_modules\.vite" -Recurse -Force
    Write-Host "✅ Cache do Vite limpo!" -ForegroundColor Green
}

# Verificar se .env existe e mostrar a URL do webhook
Write-Host "`n📝 Verificando arquivo .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ Arquivo .env encontrado!" -ForegroundColor Green
    $webhookUrl = Select-String -Path ".env" -Pattern "VITE_PAGBANK_WEBHOOK_URL=" | ForEach-Object { $_.Line }
    if ($webhookUrl) {
        Write-Host "🔗 Webhook URL configurada: $webhookUrl" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  VITE_PAGBANK_WEBHOOK_URL não encontrada no .env!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Arquivo .env NÃO ENCONTRADO!" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Iniciando frontend..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
npm run dev

