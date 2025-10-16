# 🔧 Solução para o Erro de Conexão com Supabase

## 🚨 Erro Identificado:

```
POST https://jasahjktswfmbakjluvy.supabase.co/rest/v1/orders
net::ERR_CONNECTION_CLOSED
```

Este erro indica que a **conexão com o Supabase está falhando completamente**.

---

## 🔍 Diagnóstico Rápido

Abra o arquivo **`check-supabase-connection.html`** no navegador para testar sua conexão:

1. Abra o arquivo `check-supabase-connection.html` no navegador
2. Cole sua URL do Supabase: `https://jasahjktswfmbakjluvy.supabase.co`
3. Cole sua chave anônima (anon key)
4. Clique em "Testar Conexão"
5. Veja os resultados detalhados

---

## ✅ Soluções Possíveis

### **Solução 1: Verificar se o Projeto Existe e Está Ativo**

1. Acesse: https://app.supabase.com/projects
2. Procure pelo projeto com ID: `jasahjktswfmbakjluvy`
3. Verifique o status:
   - ✅ **Active** → Projeto está ativo
   - ⏸️ **Paused** → Projeto pausado (clique em "Resume" para reativar)
   - ❌ **Not found** → Projeto não existe mais

**Se o projeto estiver PAUSADO:**
- Clique em **"Restore"** ou **"Resume"**
- Aguarde alguns minutos até ficar ativo
- Teste novamente

**Se o projeto NÃO EXISTIR:**
- Você precisa criar um novo projeto no Supabase
- Ou usar as credenciais de um projeto existente

---

### **Solução 2: Verificar Credenciais no Arquivo `.env`**

Verifique se o arquivo `.env` na raiz do projeto está configurado corretamente:

```env
VITE_SUPABASE_URL=https://jasahjktswfmbakjluvy.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_key_aqui
```

**Como obter as credenciais corretas:**

1. Acesse: https://app.supabase.com/project/jasahjktswfmbakjluvy/settings/api
2. Copie a **URL** em "Project URL"
3. Copie a **anon key** em "Project API keys" → "anon public"
4. Cole no arquivo `.env`

---

### **Solução 3: Criar um Novo Projeto Supabase (Se necessário)**

Se o projeto `jasahjktswfmbakjluvy` não existe mais:

#### 1. Criar novo projeto:

1. Acesse: https://app.supabase.com
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `pulacatraca` (ou o nome que preferir)
   - **Database Password**: Crie uma senha forte
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
4. Clique em **"Create new project"**
5. Aguarde alguns minutos até o projeto estar pronto

#### 2. Copiar credenciais:

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL**: `https://seu-novo-projeto.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 3. Atualizar arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-novo-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_nova_chave_aqui
```

#### 4. Criar as tabelas necessárias:

Execute o seguinte SQL no Supabase (SQL Editor):

```sql
-- Criar tabela de usuários (se não existir)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  document TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_document TEXT,
  customer_phone TEXT,
  event_id UUID,
  order_code TEXT UNIQUE,
  pagbank_order_id TEXT,
  quantity INTEGER,
  total_amount DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending',
  ticket_type TEXT,
  payment_method TEXT,
  metadata JSONB,
  paid_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  buyer_id UUID,
  event_id UUID,
  ticket_id UUID,
  pagbank_transaction_id TEXT UNIQUE,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_id TEXT,
  metadata JSONB,
  paid_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar políticas de segurança (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários autenticados insiram pedidos
CREATE POLICY "Users can insert their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários vejam seus próprios pedidos
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

-- Permitir que usuários autenticados insiram transações
CREATE POLICY "Users can insert transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários vejam suas próprias transações
CREATE POLICY "Users can view their transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);
```

---

### **Solução 4: Desabilitar Temporariamente RLS (Apenas para Debug)**

Se você suspeita que o problema são as políticas de segurança (RLS):

```sql
-- ATENÇÃO: Isso remove a segurança! Use apenas para debug local!
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- Depois de testar, REATIVE:
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
```

---

### **Solução 5: Verificar Firewall/Antivírus**

Às vezes, firewalls ou antivírus bloqueiam conexões com Supabase:

1. Desative temporariamente o antivírus/firewall
2. Teste novamente
3. Se funcionar, adicione exceção para:
   - `*.supabase.co`
   - `localhost:5173` (Vite)
   - `localhost:3000` (Backend)

---

### **Solução 6: Testar em Outro Navegador**

Algumas extensões do navegador podem bloquear requisições:

1. Abra o projeto em modo anônimo/privado
2. Ou teste em outro navegador (Chrome, Firefox, Edge)
3. Desative extensões que possam interferir:
   - Ad blockers
   - Privacy blockers
   - CORS blockers

---

## 🧪 Testar a Correção

Após aplicar uma das soluções:

1. **Reinicie o frontend:**
   ```bash
   # Pare o servidor (Ctrl+C)
   # Inicie novamente:
   npm run dev
   ```

2. **Limpe o cache do navegador:**
   - Chrome: `Ctrl+Shift+Del` → Limpar cache
   - Ou abra em modo anônimo

3. **Teste criar um pedido:**
   - Faça login
   - Tente criar um pedido PIX
   - Verifique o console (F12) para ver se ainda há erros

---

## 📊 Verificar no Painel do Supabase

Se o pedido foi criado mas você não vê no console:

1. Acesse: https://app.supabase.com/project/jasahjktswfmbakjluvy/editor
2. Abra a tabela **`orders`**
3. Verifique se há registros novos
4. Se sim, o problema era apenas visual no frontend

---

## 🆘 Se Nada Funcionar

**Opção 1: Use um projeto Supabase local**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
supabase start

# Isso vai criar um projeto local com credenciais
```

**Opção 2: Entre em contato com suporte do Supabase**

- https://supabase.com/support
- Discord: https://discord.supabase.com

---

## ✅ Checklist de Verificação

Antes de pedir ajuda, verifique:

- [ ] Projeto Supabase existe e está ATIVO (não pausado)
- [ ] URL e anon key estão corretas no `.env`
- [ ] Arquivo `.env` está na raiz do projeto (não em subpastas)
- [ ] Frontend foi reiniciado após alterar `.env`
- [ ] Cache do navegador foi limpo
- [ ] Testou em outro navegador/modo anônimo
- [ ] Tabelas `orders` e `transactions` existem no Supabase
- [ ] Políticas RLS estão configuradas corretamente
- [ ] Firewall/antivírus não está bloqueando

---

## 📞 Próximos Passos

1. ✅ Abra `check-supabase-connection.html` no navegador
2. ✅ Execute o teste de conexão
3. ✅ Leia os resultados e aplique a solução correspondente
4. ✅ Reinicie o frontend
5. ✅ Teste criar um pedido

**Se o teste passar mas ainda der erro no app, o problema pode ser nas políticas RLS do Supabase!**

