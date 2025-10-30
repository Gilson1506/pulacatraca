# 🔧 INSTRUÇÕES: Configurar OAuth Google no Supabase

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ **Acessar Dashboard do Supabase**

1. Acesse: https://supabase.com/dashboard
2. Faça login
3. Selecione seu projeto: **pulakatraca** (ou o nome do seu projeto)

---

### 2️⃣ **Configurar Redirect URLs**

1. No menu lateral, clique em **Authentication** (ícone de cadeado)

2. Clique em **URL Configuration** (na parte superior)

3. Role até **Redirect URLs** (ou **Site URL**)

4. **Adicione estas URLs:**

   **Para Desenvolvimento:**
   ```
   http://localhost:5173/auth/callback
   ```

   **Para Produção (se já tiver domínio):**
   ```
   https://pulakatraca.vercel.app/auth/callback
   https://www.pulakatraca.com.br/auth/callback
   ```

5. Clique no botão **"+ Add URL"** para cada uma

6. Clique em **"Save"** no final da página

---

### 3️⃣ **Verificar Configuração do Google OAuth**

1. Ainda em **Authentication**, clique em **Providers** (no menu superior)

2. Procure por **Google** na lista

3. Verifique se está **Enabled** (habilitado)

4. Se não estiver:
   - Clique em **Google**
   - Toggle **"Enable Sign in with Google"**
   - Adicione suas credenciais do Google Cloud Console:
     - **Client ID**
     - **Client Secret**
   - Clique em **"Save"**

---

### 4️⃣ **Obter Credenciais do Google (se necessário)**

Se você ainda NÃO tem Client ID e Secret:

1. Acesse: https://console.cloud.google.com/

2. Selecione seu projeto ou crie um novo

3. Vá em **APIs & Services** → **Credentials**

4. Clique em **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**

5. Se pedir, configure a **OAuth consent screen** primeiro:
   - Type: **External**
   - App name: **Pulakatraca**
   - User support email: seu email
   - Developer contact: seu email
   - Salvar

6. Volte em **Credentials** → **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**

7. Configurar:
   - Application type: **Web application**
   - Name: **Pulakatraca Supabase**
   
8. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://pulakatraca.vercel.app
   ```

9. **Authorized redirect URIs:**
   ```
   https://[SEU-PROJETO-ID].supabase.co/auth/v1/callback
   ```
   
   **Como obter a URL correta:**
   - No Supabase, em **Authentication** → **Providers** → **Google**
   - Copie a **"Callback URL (for OAuth)"**
   - Cole no Google Cloud Console

10. Clique em **"CREATE"**

11. **Copie o Client ID e Client Secret**

12. Volte no **Supabase** → **Authentication** → **Providers** → **Google**

13. Cole:
    - **Client ID**
    - **Client Secret**

14. Clique em **"Save"**

---

### 5️⃣ **Verificar Site URL**

1. Em **Authentication** → **URL Configuration**

2. Verifique o campo **"Site URL"**

3. Deve estar:
   - **Dev:** `http://localhost:5173`
   - **Prod:** `https://pulakatraca.vercel.app` (ou seu domínio)

4. Se não estiver correto, altere e salve

---

### 6️⃣ **Verificar RLS (Row Level Security) da tabela profiles**

1. No menu lateral, clique em **Table Editor**

2. Selecione a tabela **profiles**

3. Clique em **RLS** (Row Level Security) na parte superior

4. **Verifique se existe uma política que permite INSERT para novos usuários**

   Se não existir, crie:

   ```sql
   -- Permitir inserção de novo perfil
   CREATE POLICY "Permitir insert de perfil próprio"
   ON profiles
   FOR INSERT
   TO authenticated
   WITH CHECK (auth.uid() = id);

   -- Permitir leitura do próprio perfil
   CREATE POLICY "Permitir select do próprio perfil"
   ON profiles
   FOR SELECT
   TO authenticated
   USING (auth.uid() = id);
   ```

---

## ✅ CHECKLIST FINAL

Antes de testar, confirme:

- [ ] ✅ Redirect URLs adicionadas no Supabase (`/auth/callback`)
- [ ] ✅ Google Provider está habilitado
- [ ] ✅ Client ID e Secret configurados
- [ ] ✅ Site URL está correto
- [ ] ✅ Políticas RLS da tabela profiles estão corretas
- [ ] ✅ Código atualizado no projeto (já feito!)

---

## 🧪 TESTAR AGORA

1. Abra sua aplicação: http://localhost:5173

2. Vá para `/login`

3. Clique em **"Entrar com Google"**

4. Selecione sua conta Google

5. Deve aparecer a página **"Finalizando login..."**

6. Deve redirecionar para **`/profile`** ou **`/organizer-dashboard`**

---

## 🔍 SE NÃO FUNCIONAR

### **Verificar Console do Navegador (F12):**

Procure por erros como:
- `redirect_uri_mismatch` → URLs não configuradas
- `Invalid redirectTo URL` → URL não está na lista permitida
- `Error creating profile` → Problema com RLS

### **Verificar Logs do Supabase:**

1. No dashboard, vá em **Logs** (menu lateral)
2. Selecione **Auth Logs**
3. Verifique se há erros de autenticação

---

## 📸 SCREENSHOTS PARA AJUDAR

### **1. Authentication → URL Configuration**
```
┌─────────────────────────────────────────────┐
│ Site URL:                                   │
│ http://localhost:5173                       │
│                                             │
│ Redirect URLs:                              │
│ http://localhost:5173/auth/callback      [+]│
│                                             │
│ [Save]                                      │
└─────────────────────────────────────────────┘
```

### **2. Authentication → Providers → Google**
```
┌─────────────────────────────────────────────┐
│ Google                          [Enabled ✓] │
│                                             │
│ Client ID (for OAuth):                      │
│ [seu-client-id.apps.googleusercontent.com]  │
│                                             │
│ Client Secret (for OAuth):                  │
│ [seu-client-secret]                         │
│                                             │
│ Callback URL (for OAuth):                   │
│ https://xxx.supabase.co/auth/v1/callback    │
│                                             │
│ [Save]                                      │
└─────────────────────────────────────────────┘
```

---

## 🎯 RESUMO RÁPIDO

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Adicionar: `http://localhost:5173/auth/callback`
3. Adicionar: `https://seu-dominio.com/auth/callback` (produção)
4. **Save**
5. **Testar o login com Google**

---

**🚀 Pronto! Agora o login com Google deve funcionar perfeitamente!**

