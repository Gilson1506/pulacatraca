# Script para reiniciar o backend
Write-Host "`n🔄 Reiniciando Backend com código atualizado..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

# Navegar para a pasta do backend
Set-Location "backend pagbank"

# Verificar se está na pasta correta
if (!(Test-Path "package.json")) {
    Write-Host "❌ Erro: pasta 'backend pagbank' não encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Diretório: $PWD" -ForegroundColor Yellow
Write-Host "✅ Backend encontrado!`n" -ForegroundColor Green

# Iniciar o backend
Write-Host "🚀 Iniciando backend..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

npm start

