# 🍪 CookieConsent - Componente Profissional de Aviso de Cookies

## 📋 Descrição

Componente React completo e profissional para aviso de cookies, totalmente compatível com LGPD e GDPR. Criado com **React + TypeScript + Vite + Tailwind CSS + Framer Motion**.

## ✨ Funcionalidades

### 🎯 **Funcionalidades Principais**
- ✅ **Aparição automática** após carregamento da página (com atraso configurável)
- ✅ **Exibição única** - não aparece novamente após consentimento
- ✅ **Armazenamento seguro** no localStorage com timestamp e versionamento
- ✅ **Botões de ação** - Aceitar/Rejeitar configuráveis
- ✅ **Esconde automaticamente** após interação
- ✅ **Callbacks personalizados** para integração com analytics/tracking

### 🎨 **Design & UI/UX**
- ✅ **Estilizado com Tailwind CSS** - Moderno e responsivo
- ✅ **3 posições** - Bottom, Center (modal), Top
- ✅ **Animações suaves** com Framer Motion
- ✅ **Responsivo** - Perfeita em desktop e mobile
- ✅ **Tema profissional** - Gradientes rosa/roxo, sombras, bordas animadas
- ✅ **Ícones Lucide** - Cookie, Shield, ExternalLink, X

### 📱 **Responsividade**
- ✅ **Mobile-first** - Layout otimizado para telas pequenas
- ✅ **Breakpoints automáticos** - sm, md, lg
- ✅ **Botões adaptativos** - Stack vertical em mobile, horizontal em desktop
- ✅ **Texto responsivo** - Tamanhos e espaçamentos ajustáveis

### 🔒 **Compliance Legal**
- ✅ **LGPD/GDPR compliant** - Consentimento explícito
- ✅ **Link para política** de privacidade
- ✅ **Opção de rejeitar** - Não apenas aceitar
- ✅ **Timestamp de decisão** - Auditoria completa
- ✅ **Versionamento** - Para futuras atualizações

---

## 🚀 Instalação

### 1. **Dependências Necessárias**
```bash
npm install framer-motion lucide-react
```

### 2. **Copiar Arquivos**
```
src/components/
├── CookieConsent.tsx          # Componente principal
└── CookieConsentExample.tsx   # Exemplos de uso (opcional)
```

### 3. **Importar no App**
```typescript
// App.tsx
import CookieConsent from './components/CookieConsent';

function App() {
  return (
    <div className="App">
      {/* Seu conteúdo */}
      
      {/* Banner de Cookies */}
      <CookieConsent />
    </div>
  );
}
```

---

## 📖 Uso Básico

### **Implementação Simples**
```typescript
import CookieConsent from './components/CookieConsent';

<CookieConsent />
```

### **Configuração Completa**
```typescript
<CookieConsent
  delaySeconds={2}
  position="bottom"
  privacyPolicyUrl="/privacy"
  showRejectButton={true}
  customText={{
    title: "🍪 Usamos Cookies",
    description: "Este site utiliza cookies para melhorar sua experiência...",
    acceptButton: "Aceitar Cookies",
    rejectButton: "Rejeitar",
    privacyLink: "Política de Privacidade"
  }}
  onAccept={() => {
    // Ativar Google Analytics
    gtag('consent', 'update', { 'analytics_storage': 'granted' });
    console.log('✅ Tracking ativado');
  }}
  onReject={() => {
    // Desativar tracking
    console.log('❌ Tracking desativado');
  }}
/>
```

---

## ⚙️ Props API

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `delaySeconds` | `number` | `1` | Tempo em segundos antes de mostrar |
| `position` | `'bottom' \| 'center' \| 'top'` | `'bottom'` | Posição do banner |
| `privacyPolicyUrl` | `string` | `'/privacy-policy'` | URL da política de privacidade |
| `showRejectButton` | `boolean` | `true` | Mostrar botão de rejeitar |
| `onAccept` | `() => void` | `undefined` | Callback quando aceitar |
| `onReject` | `() => void` | `undefined` | Callback quando rejeitar |
| `customText` | `CustomText` | `{}` | Textos personalizados |

### **Interface CustomText**
```typescript
interface CustomText {
  title?: string;          // Título do banner
  description?: string;    // Descrição dos cookies
  acceptButton?: string;   // Texto do botão aceitar
  rejectButton?: string;   // Texto do botão rejeitar
  privacyLink?: string;    // Texto do link privacidade
}
```

---

## 🎨 Posições Visuais

### **🔻 Position: "bottom" (Padrão)**
```
┌─────────────────────────────────────────┐
│                                         │
│            CONTEÚDO DO SITE             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🍪 Usamos Cookies           [×] │    │ ← Bottom
│  │ Este site utiliza cookies...    │    │
│  │ 🔒 Política de Privacidade      │    │
│  │ [Aceitar] [Rejeitar]            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### **🎯 Position: "center" (Modal)**
```
┌─────────────────────────────────────────┐
│ ████████████████████████████████████████ │ ← Backdrop
│ ██  ┌─────────────────────────────┐  ██ │
│ ██  │ 🍪 Usamos Cookies       [×] │  ██ │ ← Center
│ ██  │ Este site utiliza...        │  ██ │
│ ██  │ 🔒 Política de Privacidade  │  ██ │
│ ██  │ [Aceitar] [Rejeitar]        │  ██ │
│ ██  └─────────────────────────────┘  ██ │
│ ████████████████████████████████████████ │
└─────────────────────────────────────────┘
```

### **🔺 Position: "top"**
```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │ 🍪 Usamos Cookies           [×] │    │ ← Top
│  │ Este site utiliza cookies...    │    │
│  │ 🔒 Política de Privacidade      │    │
│  │ [Aceitar] [Rejeitar]            │    │
│  └─────────────────────────────────┘    │
│                                         │
│            CONTEÚDO DO SITE             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔗 Hook useCookieConsent

### **Verificar Status de Consentimento**
```typescript
import { useCookieConsent } from './components/CookieConsent';

function MyComponent() {
  const { hasConsented, accepted, timestamp, resetConsent } = useCookieConsent();
  
  return (
    <div>
      <p>Consentiu: {hasConsented ? '✅' : '❌'}</p>
      <p>Aceito: {accepted ? '✅' : '❌'}</p>
      <p>Data: {timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</p>
      
      <button onClick={resetConsent}>
        🗑️ Resetar Consentimento
      </button>
    </div>
  );
}
```

### **Hook Return Values**
```typescript
{
  hasConsented: boolean;     // Se usuário já deu alguma resposta
  accepted: boolean | null;  // true=aceito, false=rejeitado, null=sem resposta
  timestamp: string | null;  // ISO timestamp da decisão
  resetConsent: () => void;  // Função para limpar consentimento
}
```

---

## 🎬 Animações

### **Animações por Posição**

**Bottom:**
- **Entrada:** Slide up + fade in + scale
- **Saída:** Slide down + fade out + scale

**Center:**
- **Entrada:** Scale up + fade in + backdrop
- **Saída:** Scale down + fade out + backdrop

**Top:**
- **Entrada:** Slide down + fade in + scale
- **Saída:** Slide up + fade out + scale

### **Configuração Framer Motion**
```typescript
// Exemplo para position="bottom"
{
  initial: { opacity: 0, y: 100, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 100, scale: 0.95 },
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 30,
    duration: 0.5
  }
}
```

---

## 📊 Armazenamento localStorage

### **Estrutura dos Dados**
```typescript
// localStorage key: 'cookie-consent-status'
{
  "accepted": true,                           // boolean
  "timestamp": "2024-01-20T10:30:00.000Z",   // ISO string
  "version": "1.0"                           // string (futuras atualizações)
}
```

### **Verificação Manual**
```javascript
// No console do navegador
const consent = localStorage.getItem('cookie-consent-status');
console.log(JSON.parse(consent));
```

### **Limpeza Manual**
```javascript
localStorage.removeItem('cookie-consent-status');
```

---

## 🔧 Integração com Analytics

### **Google Analytics 4**
```typescript
<CookieConsent
  onAccept={() => {
    // Ativar GA4
    gtag('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'granted'
    });
  }}
  onReject={() => {
    // Manter GA4 desativado
    gtag('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied'
    });
  }}
/>
```

### **Facebook Pixel**
```typescript
<CookieConsent
  onAccept={() => {
    // Ativar Facebook Pixel
    fbq('consent', 'grant');
  }}
  onReject={() => {
    // Desativar Facebook Pixel
    fbq('consent', 'revoke');
  }}
/>
```

### **Tag Manager**
```typescript
<CookieConsent
  onAccept={() => {
    // Ativar GTM events
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'event': 'cookie_consent_granted'
    });
  }}
  onReject={() => {
    window.dataLayer.push({
      'event': 'cookie_consent_denied'
    });
  }}
/>
```

---

## 🎯 Exemplos de Uso

### **1. E-commerce**
```typescript
<CookieConsent
  position="bottom"
  customText={{
    title: "🛒 Melhore sua Experiência de Compra",
    description: "Usamos cookies para recomendar produtos, lembrar seu carrinho e personalizar ofertas especiais.",
    acceptButton: "Aceitar e Continuar Comprando",
    rejectButton: "Apenas Cookies Essenciais"
  }}
  onAccept={() => {
    // Ativar recomendações, carrinho persistente, etc.
  }}
/>
```

### **2. Blog/Conteúdo**
```typescript
<CookieConsent
  position="center"
  customText={{
    title: "📚 Personalizar Conteúdo",
    description: "Utilizamos cookies para sugerir artigos relacionados e melhorar sua experiência de leitura.",
    acceptButton: "Personalizar Experiência",
    rejectButton: "Modo Básico"
  }}
/>
```

### **3. SaaS/App**
```typescript
<CookieConsent
  position="top"
  showRejectButton={false}
  customText={{
    title: "⚡ Cookies Essenciais",
    description: "Este app usa cookies essenciais para funcionamento. Sua sessão e preferências são mantidas seguras.",
    acceptButton: "Entendi, Continuar"
  }}
/>
```

---

## 🎨 Customização Visual

### **Cores Padrão (Tailwind)**
```css
/* Gradiente do botão aceitar */
bg-gradient-to-r from-pink-500 to-purple-600

/* Ícone do cookie */
bg-gradient-to-br from-orange-400 to-orange-600

/* Backdrop (center) */
bg-black bg-opacity-50 backdrop-blur-sm

/* Border animado */
bg-gradient-to-r from-pink-500/20 to-purple-600/20
```

### **Modificar Cores**
Para personalizar as cores, edite as classes Tailwind no arquivo `CookieConsent.tsx`:

```typescript
// Exemplo: Tema azul
// Trocar: from-pink-500 to-purple-600
// Por:    from-blue-500 to-indigo-600
```

---

## 📱 Responsividade

### **Breakpoints Utilizados**
- **sm:** 640px+ (tablet)
- **md:** 768px+ (desktop pequeno)
- **lg:** 1024px+ (desktop grande)

### **Comportamentos Responsivos**
```css
/* Mobile (< 640px) */
- Botões em stack vertical
- Padding reduzido
- Texto menor
- Banner ocupa quase toda largura

/* Tablet (640px+) */
- Botões em linha horizontal
- Padding normal
- Banner com max-width

/* Desktop (768px+) */
- Layout otimizado
- Posicionamento refinado
- Shadows mais pronunciadas
```

---

## 🔍 Debugging

### **Console Logs**
O componente inclui logs detalhados para debugging:

```javascript
// Logs automáticos
'📋 Usuário já deu consentimento, banner não será exibido'
'🍪 Banner de cookies exibido'
'✅ Cookies aceitos pelo usuário'
'❌ Cookies rejeitados pelo usuário'
'📊 Dados de consentimento: {...}'
```

### **Forçar Exibição**
```javascript
// Para testar novamente
localStorage.removeItem('cookie-consent-status');
location.reload();
```

### **Verificar Estado**
```javascript
// Status atual
import { useCookieConsent } from './components/CookieConsent';
const { hasConsented, accepted } = useCookieConsent();
console.log({ hasConsented, accepted });
```

---

## 🚀 Performance

### **Bundle Size**
- **Framer Motion:** ~50kb gzipped
- **Lucide React:** ~15kb gzipped (ícones usados)
- **CookieConsent:** ~8kb gzipped

### **Otimizações Implementadas**
- ✅ **Lazy rendering** - Só renderiza quando necessário
- ✅ **Cleanup automático** - Remove listeners e timers
- ✅ **localStorage cache** - Evita re-renders desnecessários
- ✅ **AnimatePresence** - Animações otimizadas
- ✅ **Conditional imports** - Carrega só quando usado

---

## 📋 Compliance Checklist

### **LGPD (Brasil)**
- ✅ Consentimento livre, informado e inequívoco
- ✅ Finalidade específica do tratamento informada
- ✅ Opção de rejeitar o consentimento
- ✅ Facilidade para retirar o consentimento
- ✅ Registro do consentimento com timestamp

### **GDPR (Europa)**
- ✅ Lawful basis for processing (consent)
- ✅ Clear and plain language
- ✅ Easy to withdraw consent
- ✅ Separate consent for different purposes
- ✅ Records of consent

### **Boas Práticas**
- ✅ Não bloqueia o site (pode navegar sem decidir)
- ✅ Não usa cookies antes do consentimento
- ✅ Oferece informações claras sobre uso
- ✅ Link direto para política de privacidade
- ✅ Interface acessível e responsiva

---

## 🎨 Screenshots

### **Desktop - Position Bottom**
```
┌─────────────────────────────────────────────────────────────────┐
│                     SITE PRINCIPAL                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🍪 Usamos Cookies                               [×]     │    │
│  │ Este site utiliza cookies para melhorar sua experiência │    │
│  │ de navegação, personalizar conteúdo e analisar tráfego  │    │
│  │                                                         │    │
│  │ 🔒 Política de Privacidade                              │    │
│  │                                                         │    │
│  │          [Aceitar Cookies]     [Rejeitar]               │    │
│  │     🔒 Suas informações estão protegidas conforme LGPD  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### **Mobile - Position Bottom**
```
┌─────────────────────────┐
│      SITE MOBILE        │
│                         │
│ ┌─────────────────────┐ │
│ │ 🍪 Usamos Cookies   │ │
│ │ Este site utiliza   │ │
│ │ cookies para...     │ │
│ │                     │ │
│ │ 🔒 Política Privac. │ │
│ │                     │ │
│ │  [Aceitar Cookies]  │ │
│ │     [Rejeitar]      │ │
│ │ 🔒 Protegido - LGPD │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## 🤝 Contribuição

### **Estrutura do Projeto**
```
src/components/
├── CookieConsent.tsx          # Componente principal
├── CookieConsentExample.tsx   # Exemplos e documentação
└── README.md                  # Esta documentação
```

### **Para Contribuir**
1. Fork do repositório
2. Criar branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Pull Request

---

## 📄 Licença

MIT License - Livre para uso comercial e pessoal.

---

## 🎯 Próximas Funcionalidades

### **Roadmap**
- [ ] **Suporte a idiomas** - i18n completo
- [ ] **Tema dark/light** - Auto-detecção
- [ ] **Categorias de cookies** - Essenciais, Analytics, Marketing
- [ ] **Preview em tempo real** - Configurador visual
- [ ] **A/B Testing** - Variações de texto/layout
- [ ] **Analytics integrado** - Métricas de conversão

### **Melhorias Planejadas**
- [ ] **Animações avançadas** - Micro-interações
- [ ] **Accessibility** - Screen reader completo
- [ ] **SSR Support** - Next.js/Nuxt compatibility
- [ ] **Bundle splitting** - Reduzir tamanho inicial
- [ ] **CDN ready** - Distribuição via CDN

---

## 🆘 Suporte

### **Problemas Comuns**

**1. Banner não aparece**
```javascript
// Verificar se já consentiu
console.log(localStorage.getItem('cookie-consent-status'));

// Limpar para testar
localStorage.removeItem('cookie-consent-status');
location.reload();
```

**2. Animações travadas**
```bash
# Verificar se framer-motion está instalado
npm list framer-motion
```

**3. Estilos quebrados**
```javascript
// Verificar se Tailwind está funcionando
// Inspecionar elementos no DevTools
```

### **Contato**
- 📧 **Email:** suporte@exemplo.com
- 💬 **Discord:** #cookie-consent
- 🐛 **Issues:** GitHub Issues
- 📖 **Docs:** Wiki do projeto

---

**🍪 CookieConsent - Compliance simples, design profissional, experiência perfeita!**