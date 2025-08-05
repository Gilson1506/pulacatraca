# 🚀 Deploy no Vercel - Configuração Completa

## 📋 Pré-requisitos

1. ✅ Código já commitado no GitHub
2. ✅ Mapbox configurado com variáveis de ambiente
3. ✅ Token do Mapbox em mãos

## 🔧 Configuração no Vercel

### 1. **Deploy Inicial**
1. Acesse [vercel.com](https://vercel.com)
2. Conecte com sua conta GitHub
3. Importe o projeto `pulacatraca`
4. Configure as variáveis de ambiente antes do deploy

### 2. **Variáveis de Ambiente Obrigatórias**

Vá em **Settings → Environment Variables** e adicione:

#### **Mapbox (Obrigatório para o mapa funcionar)**
```
Name: VITE_MAPBOX_ACCESS_TOKEN
Value: pk.seu_token_real_do_mapbox_aqui
Environment: Production, Preview, Development
```

#### **Outras variáveis (se necessário)**
```
Name: VITE_SUPABASE_URL
Value: sua_url_do_supabase
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY  
Value: sua_chave_publica_supabase
Environment: Production, Preview, Development
```

### 3. **Configurações de Build**

O Vercel detectará automaticamente que é um projeto Vite, mas você pode confirmar:

```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 4. **Deploy**

1. Clique em **Deploy**
2. Aguarde o build completar
3. Teste as funcionalidades:
   - ✅ Mapas funcionando
   - ✅ Scanner QR operacional
   - ✅ Navegação interna

## 🗺️ Como Obter Token do Mapbox

1. Acesse [mapbox.com](https://www.mapbox.com/)
2. Crie conta ou faça login
3. Vá em [Account → Access Tokens](https://account.mapbox.com/access-tokens/)
4. Copie o **Default Public Token** ou crie um novo
5. Cole no Vercel como `VITE_MAPBOX_ACCESS_TOKEN`

## 🔄 Atualizações Futuras

Para atualizações, basta:
1. Fazer push para o GitHub
2. Vercel fará deploy automático
3. Variáveis de ambiente são mantidas

## 🧪 Teste Pós-Deploy

Após deploy, teste:

1. **Página de evento** → Clique no endereço → Mapa deve abrir
2. **Navegação interna** → "Iniciar Navegação" deve funcionar
3. **Scanner QR** → Não deve mais dar tela branca
4. **Responsividade** → Teste em mobile

## 🚨 Troubleshooting

**Problema**: Mapa não carrega
- **Solução**: Verifique se `VITE_MAPBOX_ACCESS_TOKEN` está correto

**Problema**: Build falha
- **Solução**: Verifique se todas as dependências estão no `package.json`

**Problema**: Scanner com tela branca
- **Solução**: Já corrigido! Deve funcionar normalmente

---

🎯 **Seu app estará rodando em produção com todas as funcionalidades!**

**URLs após deploy:**
- **Produção**: `https://seu-projeto.vercel.app`
- **Preview**: URLs automáticas para cada branch