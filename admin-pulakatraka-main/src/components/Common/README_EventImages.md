# Componentes de Imagem de Eventos

Este documento descreve os componentes criados para melhorar a exibição de imagens de eventos no painel admin e na aplicação do usuário.

> **⚠️ Importante**: Os componentes usam a coluna `image` do banco de dados, não `banner_url`. Certifique-se de que sua tabela `events` tenha a coluna `image` configurada corretamente.

## Componentes

### 1. EventImage

Componente base para exibição de imagens de eventos com estados de carregamento, erro e fallback.

```tsx
import EventImage from './components/Common/EventImage';

<EventImage
  src={event.image}
  alt={event.title}
  size="md" // 'sm' | 'md' | 'lg' | 'xl'
  className="custom-classes"
  fallbackIcon="event" // 'event' | 'calendar' | 'image'
  showLoadingState={true}
  onImageLoad={() => console.log('Imagem carregada')}
  onImageError={() => console.log('Erro ao carregar')}
/>
```

#### Tamanhos disponíveis:
- `sm`: 48x48px (12x12 Tailwind)
- `md`: 64x64px (16x16 Tailwind) 
- `lg`: 96x96px (24x24 Tailwind)
- `xl`: Tamanho flexível (w-full h-full)

### 2. EventImageCard

Componente especializado para cards de eventos com overlay de informações.

```tsx
import EventImageCard from './components/Common/EventImageCard';

<EventImageCard
  event={{
    id: '1',
    title: 'Evento Exemplo',
    image: 'https://...',
    start_date: '2024-01-01',
    location: 'São Paulo, SP',
    status: 'approved',
    total_tickets: 100,
    category: 'Música',
    carousel_approved: true
  }}
  variant="default" // 'default' | 'compact' | 'featured'
  showOverlay={true}
  showStatus={true}
  onClick={() => console.log('Card clicado')}
/>
```

#### Variantes:
- `compact`: 80x80px para listas compactas
- `default`: 192px altura para cards normais
- `featured`: 256-320px altura para eventos em destaque

### 3. useEventImage Hook

Hook personalizado para gerenciar estado de imagens de eventos.

```tsx
import { useEventImage } from '../hooks/useEventImage';

const {
  isLoading,
  hasError,
  imageSrc,
  shouldShowImage,
  handleImageLoad,
  handleImageError,
  resetImageState
} = useEventImage({
  src: event.image,
  onLoad: () => console.log('Carregou'),
  onError: () => console.log('Erro')
});
```

## Características Principais

### 🔄 Estados de Carregamento
- Spinner animado durante o carregamento
- Transição suave de opacidade
- Fallback elegante para erros

### 🎨 Fallbacks Visuais
- Ícone de teatro (🎭) como padrão
- Gradiente de fundo
- Texto indicativo de status

### 📱 Responsivo
- Diferentes tamanhos para diferentes contextos
- Otimização para mobile e desktop
- Loading lazy para performance

### 🌙 Dark Mode
- Suporte completo ao tema escuro
- Cores adaptáveis automaticamente
- Contraste adequado em ambos os temas

## Sincronização Admin/User

### Consistência Visual
Todos os componentes seguem o mesmo design system:
- Paleta de cores unificada
- Bordas e cantos arredondados consistentes
- Animações e transições padronizadas

### Estados Compartilhados
- Validação de URL de imagem
- Tratamento de erros padronizado
- Placeholders consistentes

### Performance
- Lazy loading automático
- Cache de estado de imagem
- Otimização de renderização

## Uso Recomendado

### No Admin Panel:
```tsx
// Lista de eventos
<EventImage src={event.image} size="md" />

// Modal de detalhes
<EventImage src={event.image} size="xl" className="w-full h-60" />

// Cards de evento
<EventImageCard event={event} variant="default" showStatus={true} />
```

### Na Aplicação do Usuário:
```tsx
// Carrossel principal
<EventImageCard event={event} variant="featured" />

// Lista de eventos
<EventImageCard event={event} variant="default" />

// Eventos relacionados
<EventImageCard event={event} variant="compact" />
```

## Benefícios

1. **Experiência Consistente**: Mesmo comportamento em admin e user
2. **Performance Melhorada**: Loading states e lazy loading
3. **Acessibilidade**: Alt texts e indicadores visuais
4. **Manutenibilidade**: Componentes reutilizáveis e bem documentados
5. **Flexibilidade**: Múltiplas variantes para diferentes contextos

## Próximos Passos

- [ ] Implementar no lado do usuário
- [ ] Adicionar mais variantes de tamanho
- [ ] Implementar blur placeholder
- [ ] Adicionar suporte a WebP e AVIF
- [ ] Criar variantes para diferentes tipos de evento