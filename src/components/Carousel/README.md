# Componentes de Carrossel

Este diretório contém os componentes de carrossel baseados no Swiper.js, implementados seguindo o modelo fornecido.

## Componentes

### Carousel
Componente base que encapsula o Swiper.js com funcionalidades básicas.

**Props:**
- `options`: Array de objetos com propriedade `slide` contendo o conteúdo React
- `settings`: Configurações do Swiper (opcional)
- `className`: Classe CSS customizada (opcional)
- `id`: ID único para o carrossel (obrigatório)
- `slideSuffix`: Sufixo para classes CSS dos slides (opcional)
- `controls`: Função para controlar navegação (opcional)

### HomeCarousel
Componente especializado com diferentes tipos de carrossel pré-configurados.

**Props:**
- `type`: Tipo do carrossel (obrigatório)
- `options`: Array de objetos com propriedade `slide`
- `controls`: Função para controlar navegação (opcional)
- `updateArrows`: Função para atualizar estado das setas (opcional)
- `id`: ID único para o carrossel (obrigatório)

## Tipos de Carrossel Disponíveis

### `sponsored`
- Carrossel com autoplay (7 segundos)
- 1 slide por vez
- Ideal para banners promocionais

### `event-card`
- 4 slides por vez em desktop
- 3 slides por grupo
- Ideal para cards de eventos

### `recent-card`
- 4 slides por vez em desktop
- 3 slides por grupo
- Ideal para cards recentes

### `collection-card`
- 9 slides por vez em desktop
- 2 slides por grupo
- Ideal para coleções

### `venue-card`
- 5 slides por vez em desktop
- 2 slides por grupo
- Ideal para cards de locais

### `city-card`
- 5 slides por vez em desktop
- 2 slides por grupo
- Ideal para cards de cidades

### `organizer-card`
- 6 slides por vez em desktop
- 2 slides por grupo
- Ideal para cards de organizadores

### `banner-card`, `banner-login`, `banner-oss`
- 1 slide por vez
- Sem navegação se houver apenas 1 slide
- Ideal para banners

### `one-card`
- 1 slide por vez
- Com paginação
- Ideal para conteúdo único

## Exemplo de Uso

```tsx
import { HomeCarousel } from './components/Carousel';

const MyComponent = () => {
  const options = [
    {
      slide: (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3>Conteúdo do Slide 1</h3>
        </div>
      ),
    },
    {
      slide: (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3>Conteúdo do Slide 2</h3>
        </div>
      ),
    },
  ];

  return (
    <HomeCarousel
      type="event-card"
      options={options}
      id="my-carousel"
    />
  );
};
```

## Responsividade

Todos os tipos de carrossel são responsivos e se adaptam automaticamente a diferentes tamanhos de tela:

- **Desktop (1100px+)**: Configurações completas
- **Tablet (830px-1099px)**: Configurações intermediárias
- **Mobile (640px-829px)**: Configurações para mobile
- **Mobile pequeno (320px-639px)**: Configurações otimizadas

## Estilização

Os componentes usam CSS modules para estilização. Os estilos podem ser customizados através dos arquivos:
- `Carousel.css`: Estilos base
- `HomeCarousel.css`: Estilos específicos por tipo

## Funcionalidades

- ✅ Navegação por toque/swipe
- ✅ Paginação com bullets
- ✅ Autoplay (para tipo `sponsored`)
- ✅ Acessibilidade
- ✅ Responsividade
- ✅ Controles customizáveis
- ✅ Callbacks de eventos
