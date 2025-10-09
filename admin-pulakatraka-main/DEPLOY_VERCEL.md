# 🚀 Deploy no Vercel - PULACATRACA Admin

## Configuração de Rotas SPA

O projeto está configurado para funcionar como uma Single Page Application (SPA) no Vercel, evitando erros 404 ao recarregar páginas.

### ✅ Arquivos de Configuração

#### 1. `vercel.json` - Configuração Principal
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### 2. `public/_redirects` - Backup
```
/*    /index.html   200
```

## 🛠️ Passos para Deploy

### 1. **Conectar ao Vercel**
```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Fazer login
vercel login

# Deploy inicial
vercel
```

### 2. **Configurar Variáveis de Ambiente**

No dashboard do Vercel (`Settings > Environment Variables`):

```
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = sua_chave_anonima_aqui
```

### 3. **Configurações do Projeto**

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 🔧 Configurações Avançadas

### Headers de Segurança
O `vercel.json` inclui headers de segurança:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### CORS para APIs
Configuração automática para rotas `/api/*`:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`

## 🎯 Rotas Suportadas

Todas essas rotas funcionarão sem erro 404:

### Admin Panel
- `/` - Dashboard principal
- `/usuarios` - Gestão de usuários
- `/eventos` - Moderação de eventos
- `/ingressos` - Gestão de ingressos
- `/financeiro` - Relatórios financeiros
- `/suporte` - Tickets de suporte
- `/chat` - Chat de suporte
- `/analytics` - Analytics
- `/tendencias` - Análise de tendências
- `/seguranca` - Configurações de segurança
- `/configuracoes` - Configurações gerais
- `/perfil` - Perfil do usuário

### Admin Específico
- `/admin` - Login admin
- `/admin/dashboard` - Dashboard administrativo

### Autenticação
- `/login` - Login geral

## 🔍 Solução de Problemas

### Erro 404 ao Recarregar
Se ainda houver erro 404:

1. **Verificar `vercel.json`** na raiz do projeto
2. **Rebuild** o projeto no Vercel
3. **Verificar logs** no dashboard do Vercel

### Variáveis de Ambiente
Se houver erro de Supabase:

1. **Verificar** se as variáveis estão configuradas
2. **Rebuild** após adicionar variáveis
3. **Testar** conexão local primeiro

### Build Fails
Se o build falhar:

```bash
# Testar build local
npm run build

# Verificar se dist/ é criado
ls -la dist/
```

## 📝 Comandos Úteis

```bash
# Deploy para produção
vercel --prod

# Ver logs
vercel logs

# Ver info do projeto
vercel ls

# Remover projeto
vercel remove projeto-name
```

## 🚨 Checklist de Deploy

- [ ] `vercel.json` configurado
- [ ] Variáveis de ambiente definidas
- [ ] Build local funcionando
- [ ] Supabase configurado
- [ ] DNS configurado (se domínio customizado)
- [ ] Teste de rotas após deploy
- [ ] Teste de recarregamento de páginas

## 🔗 Links Úteis

- [Vercel SPA Configuration](https://vercel.com/docs/concepts/projects/project-configuration#rewrites)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/environment-variables)

---

### 🎉 Resultado

Após seguir estes passos, sua aplicação:
- ✅ Não terá erro 404 ao recarregar páginas
- ✅ Todas as rotas funcionarão corretamente
- ✅ Será otimizada para produção
- ✅ Terá headers de segurança configurados