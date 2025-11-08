# Script para limpar COMPLETAMENTE o cache do Vite e recompilar

Write-Host "🧹 LIMPANDO CACHE DO VITE..." -ForegroundColor Yellow
Write-Host ""

# 1. Parar qualquer servidor rodando (se aplicável)
Write-Host "1️⃣ Verificando processos Node..." -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ⚠️  Encontrados $($nodeProcesses.Count) processos Node rodando" -ForegroundColor Yellow
    Write-Host "   💡 Feche manualmente o servidor com Ctrl+C antes de continuar" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Nenhum processo Node rodando" -ForegroundColor Green
}
Write-Host ""

# 2. Remover node_modules/.vite (cache do Vite)
Write-Host "2️⃣ Removendo cache do Vite..." -ForegroundColor Cyan
if (Test-Path "node_modules\.vite") {
    Remove-Item -Path "node_modules\.vite" -Recurse -Force
    Write-Host "   ✅ Cache do Vite removido" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Cache do Vite não encontrado" -ForegroundColor Gray
}
Write-Host ""

# 3. Remover dist (build anterior)
Write-Host "3️⃣ Removendo build anterior..." -ForegroundColor Cyan
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "   ✅ Build anterior removido" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Pasta dist não encontrada" -ForegroundColor Gray
}
Write-Host ""

# 4. Limpar cache do npm
Write-Host "4️⃣ Limpando cache do npm..." -ForegroundColor Cyan
npm cache clean --force 2>$null
Write-Host "   ✅ Cache do npm limpo" -ForegroundColor Green
Write-Host ""

# 5. Verificar arquivo .env
Write-Host "5️⃣ Verificando arquivo .env..." -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host "   ✅ Arquivo .env encontrado" -ForegroundColor Green
    Write-Host "   📄 Conteúdo relevante:" -ForegroundColor Cyan
    Get-Content .env | Select-String "VITE_PAGBANK" | ForEach-Object {
        Write-Host "      $_" -ForegroundColor White
    }
} else {
    Write-Host "   ❌ Arquivo .env NÃO encontrado!" -ForegroundColor Red
}
Write-Host ""

# 6. Instruções finais
Write-Host "✅ LIMPEZA CONCLUÍDA!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Inicie o servidor: npm run dev" -ForegroundColor White
Write-Host "   2. Abra o navegador em modo anônimo (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "   3. Acesse: http://localhost:5173" -ForegroundColor White
Write-Host "   4. Abra o Console (F12) e verifique os logs" -ForegroundColor White
Write-Host ""
Write-Host "🔍 LOGS ESPERADOS NO CONSOLE:" -ForegroundColor Yellow
Write-Host "   🔧 PagBankService criado com URL: http://localhost:3000/api/payments" -ForegroundColor White
Write-Host "   🌐 Backend URL configurada: http://localhost:3000/api/payments" -ForegroundColor White
Write-Host ""

