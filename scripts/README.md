# 🚀 Scripts para Configuração do Pagar.me

Esta pasta contém scripts automatizados para configurar o sistema de pagamentos do Pagar.me no Supabase.

## 📁 **Scripts Disponíveis**

### **1. `setup-pagarme-complete.sh`** (Linux/Mac)
Script completo que executa todo o processo de configuração:
- ✅ Remove functions antigas do Stripe
- ✅ Deploy das novas functions do Pagar.me
- ✅ Configura chave API do Pagar.me
- ✅ Limpa pastas antigas

### **2. `setup-pagarme-windows.ps1`** (Windows PowerShell)
Versão para Windows do script completo com cores e interface amigável.

### **3. `remove-stripe-functions.sh`** (Linux/Mac)
Script específico para remover apenas as functions antigas do Stripe.

### **4. `cleanup-old-folders.sh`** (Linux/Mac)
Script para limpar as pastas das functions antigas do sistema de arquivos.

## 🎯 **Como Usar**

### **Opção 1: Script Completo (Recomendado)**

#### **Linux/Mac:**
```bash
# Dar permissão de execução
chmod +x scripts/setup-pagarme-complete.sh

# Executar
./scripts/setup-pagarme-complete.sh
```

#### **Windows:**
```powershell
# Executar no PowerShell
.\scripts\setup-pagarme-windows.ps1
```

### **Opção 2: Scripts Individuais**

#### **Remover Functions Antigas:**
```bash
chmod +x scripts/remove-stripe-functions.sh
./scripts/remove-stripe-functions.sh
```

#### **Limpar Pastas:**
```bash
chmod +x scripts/cleanup-old-folders.sh
./scripts/cleanup-old-folders.sh
```

## ⚠️ **Pré-requisitos**

1. **Supabase CLI instalado:**
   ```bash
   npm install -g supabase
   ```

2. **Logado no Supabase:**
   ```bash
   supabase login
   ```

3. **Projeto linkado:**
   ```bash
   supabase link --project-ref seu-projeto-ref
   ```

4. **Chave API do Pagar.me** (será solicitada durante a execução)

## 🔧 **O que os Scripts Fazem**

### **PASSO 1: Verificação**
- ✅ Verifica se Supabase CLI está instalado
- ✅ Lista functions atuais

### **PASSO 2: Remoção**
- ❌ Remove 7 functions antigas do Stripe
- ❌ Limpa sistema de arquivos

### **PASSO 3: Deploy**
- 🚀 Deploy de 3 novas functions do Pagar.me
- ✅ Verifica deploy

### **PASSO 4: Configuração**
- 🔑 Configura chave API do Pagar.me
- 🔧 Define secrets no Supabase

### **PASSO 5: Limpeza**
- 🧹 Remove pastas antigas
- 📁 Organiza estrutura

## 📊 **Resultado Esperado**

Após execução bem-sucedida:

```
supabase/functions/
├── process-payment/          # ✅ Nova function
├── get-payment-status/       # ✅ Nova function
├── cancel-payment/           # ✅ Nova function
└── deploy-commands.md        # 📚 Documentação
```

## 🚨 **Troubleshooting**

### **Erro: "command not found: supabase"**
```bash
npm install -g supabase
```

### **Erro: "not logged in"**
```bash
supabase login
```

### **Erro: "project not linked"**
```bash
supabase link --project-ref seu-projeto-ref
```

### **Erro: "function not found"**
- Verifique se o nome da function está correto
- Execute `supabase functions list` para ver functions ativas

## 📚 **Documentação Relacionada**

- `README_ARQUITETURA_SEGURA.md` - Arquitetura do sistema
- `supabase/functions/deploy-commands.md` - Comandos manuais
- `supabase/functions/process-payment/` - Function principal
- `supabase/functions/get-payment-status/` - Function de status
- `supabase/functions/cancel-payment/` - Function de cancelamento

## 🎉 **Suporte**

Se encontrar problemas:
1. Verifique os logs: `supabase functions logs nome-da-function`
2. Teste individualmente: `supabase functions deploy nome-da-function`
3. Verifique configuração: `supabase secrets list`

---

**🎯 Sistema configurado e pronto para pagamentos com Pagar.me!**
