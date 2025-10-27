# 🔍 Diagnóstico: Problema de Cache do Vite

## 🎯 Problema Identificado

O código está correto, MAS o navegador está usando **código compilado antigo em cache**.

Mesmo no modo anônimo, o **Vite** pode ter compilado o código com os valores antigos e está servindo esses arquivos.

---

## ✅ SOLUÇÃO DEFINITIVA

### Passo 1: Limpar COMPLETAMENTE o cache

Execute o script PowerShell:

```powershell
.\limpar-cache-vite.ps1
```

**OU** manualmente:

```powershell
# 1. Remover cache do Vite
Remove-Item -Path "node_modules\.vite" -Recurse -Force

# 2. Remover build anterior
Remove-Item -Path "dist" -Recurse -Force

# 3. Limpar cache do npm
npm cache clean --force
```

### Passo 2: Parar COMPLETAMENTE o servidor

No terminal do frontend:
```
Ctrl + C
```

Aguarde até ver "Process terminated" ou similar.

### Passo 3: Reiniciar o servidor

```bash
npm run dev
```

### Passo 4: Abrir em MODO ANÔNIMO

- Chrome: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`
- Edge: `Ctrl + Shift + N`

Acesse: `http://localhost:5173`

---

## 🔍 Como Verificar se Funcionou

### 1. Abrir Console do Navegador (F12)

Você DEVE ver esses logs (adicionamos agora):

```
🔧 PagBankService criado com URL: http://localhost:3000/api/payments
📌 import.meta.env.VITE_PAGBANK_API_URL: http://localhost:3000/api/payments
🌐 Backend URL configurada: http://localhost:3000/api/payments
```

### 2. Ao tentar pagar com cartão:

```
💳 Enviando pedido de cartão para: http://localhost:3000/api/payments
📦 Dados do pedido: { ... cartão criptografado ... }
```

### 3. Se ainda mostrar `:3000/` (sem `/api/payments`):

❌ Significa que o cache NÃO foi limpo completamente.

**Solução drástica:**

```powershell
# Fechar TUDO
# Parar servidor frontend (Ctrl+C)
# Parar servidor backend (Ctrl+C)

# Remover node_modules COMPLETO (demora ~1-2 min)
Remove-Item -Path "node_modules" -Recurse -Force

# Reinstalar tudo
npm install

# Iniciar backend
cd "backend pagbank"
npm run dev

# Em outro terminal, iniciar frontend
cd ..
npm run dev
```

---

## 🧪 Logs Adicionados para Diagnóstico

### No `pagbankService.ts`:

**Construtor (linha 98-102):**
```typescript
console.log('🔧 PagBankService criado com URL:', this.baseUrl);
console.log('📌 import.meta.env.VITE_PAGBANK_API_URL:', import.meta.env.VITE_PAGBANK_API_URL);
```

**createCardOrder (linha 129-130):**
```typescript
console.log('💳 Enviando pedido de cartão para:', this.baseUrl);
console.log('📦 Dados do pedido:', JSON.stringify(orderData, null, 2));
```

### No `CheckoutPagePagBank.tsx`:

**useEffect (linha 49):**
```typescript
console.log('🌐 Backend URL configurada:', backendUrl);
```

---

## 📊 Checklist de Verificação

Após limpar cache e reiniciar:

- [ ] Servidor backend rodando em http://localhost:3000
- [ ] Servidor frontend rodando em http://localhost:5173
- [ ] Navegador em modo anônimo
- [ ] Console mostra: `🔧 PagBankService criado com URL: http://localhost:3000/api/payments`
- [ ] Console mostra: `🌐 Backend URL configurada: http://localhost:3000/api/payments`
- [ ] Ao tentar pagar, mostra: `💳 Enviando pedido de cartão para: http://localhost:3000/api/payments`
- [ ] NÃO mostra erro 404 em `:3000/`

---

## ⚠️ Se AINDA não funcionar

Última tentativa - Forçar valores hardcoded temporariamente:

### Edite `src/pages/CheckoutPagePagBank.tsx` (linha 44):

```typescript
// TEMPORÁRIO - FORÇAR URL
const backendUrl = 'http://localhost:3000/api/payments';  // Hardcoded!
const pagBankService = new PagBankService(backendUrl);
```

### Edite `src/hooks/usePagBankPayment.ts` (linha 24):

```typescript
// TEMPORÁRIO - FORÇAR URL
const pagBankService = new PagBankService('http://localhost:3000/api/payments');  // Hardcoded!
```

Se funcionar com hardcode → Problema é com o `.env`  
Se NÃO funcionar → Problema é outra coisa

---

## 🔧 Outras Possíveis Causas

### 1. Service Worker

Verificar se há service worker em cache:

```javascript
// No Console do navegador
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('Service Worker encontrado:', reg);
    reg.unregister();
  });
});
```

### 2. Cache do Proxy/Firewall

Se estiver usando proxy ou antivírus com firewall, pode estar cacheando as requisições.

### 3. DNS/Hosts

Verificar se há entrada em `C:\Windows\System32\drivers\etc\hosts` para localhost.

---

## 📝 Status Atual

- ✅ Código correto nos arquivos
- ✅ `.env` configurado corretamente
- ✅ URLs corrigidas em todos os lugares
- ✅ Logs de debug adicionados
- ⚠️ **Problema: Cache do Vite/Navegador**

---

**Próximo passo:** Executar `.\limpar-cache-vite.ps1` e testar novamente!

