# 🗺️ Configuração do Mapbox

## Como configurar o token do Mapbox

### 1. Obter Token do Mapbox

1. Acesse [mapbox.com](https://www.mapbox.com/)
2. Crie uma conta ou faça login
3. Vá para [Account → Access Tokens](https://account.mapbox.com/access-tokens/)
4. Copie seu **Public Token** ou crie um novo

### 2. Configurar no Projeto

**Opção 1: Variável de Ambiente (Recomendado)**

Crie um arquivo `.env` na raiz do projeto:
```bash
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiU0VVX1VTVUFSSU8iLCJhIjoiU0VVX1RPS0VOIn0...
```

E modifique o arquivo `src/components/EventMapModal.tsx`:
```typescript
// Substituir esta linha:
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

// Por esta:
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
```

**Opção 2: Substituição Direta**

Substitua diretamente no arquivo `src/components/EventMapModal.tsx` na linha 6:
```typescript
mapboxgl.accessToken = 'SEU_TOKEN_AQUI';
```

### 3. Funcionalidades Implementadas

✅ **Geolocalização do usuário**
- Solicita permissão para acessar localização
- Exibe marcador azul na posição atual

✅ **Geocodificação do endereço do evento**
- Converte endereço em coordenadas automaticamente
- Exibe marcador rosa no local do evento

✅ **Cálculo de rota**
- Traça rota de carro entre usuário e evento
- Linha rosa conectando os dois pontos
- Exibe distância e tempo estimado

✅ **Navegação interna turn-by-turn**
- **Painel lateral com instruções passo a passo**
- **Ícones visuais para cada tipo de manobra** (virar, rotatória, etc.)
- **Controles de navegação** (anterior/próximo passo)
- **Foco automático no mapa** para cada instrução
- **Lista completa de passos** clicável

✅ **Navegação externa (Google Maps)**
- Botão "Google Maps" abre navegação externa
- Funciona em mobile e desktop
- Opção para quem prefere app nativo

✅ **Interface intuitiva**
- Modal responsivo e moderno
- **Layout adaptativo** (mapa expande quando navegação está inativa)
- Controles de zoom e navegação
- Popups informativos nos marcadores

### 4. Como Usar

**Abertura do mapa:**
1. Na página do evento, clique no **endereço do evento** (texto sublinhado)
2. O modal do mapa abrirá automaticamente
3. Permita o acesso à localização quando solicitado
4. Visualize sua localização (marcador azul) e o evento (marcador rosa)
5. A rota será calculada automaticamente com distância e tempo

**Navegação interna:**
6. Clique no botão **"Iniciar Navegação"** (verde)
7. O painel lateral aparecerá com instruções passo a passo
8. Use os botões **◀ ▶** para navegar entre os passos
9. Clique em qualquer passo da lista para focar no mapa
10. O mapa se ajustará automaticamente para mostrar cada manobra

**Opções adicionais:**
- **"Minha Localização"** - Recentra no usuário
- **"Parar Navegação"** - Fecha o painel e volta ao modo normal
- **"Google Maps"** - Abre navegação externa (GPS nativo)

### 5. Tratamento de Erros

- **Geolocalização negada**: Exibe mensagem de erro com botão "Tentar novamente"
- **Endereço não encontrado**: Usa coordenadas padrão (Rio de Janeiro)
- **Sem conexão**: Mapbox funciona offline para áreas já carregadas

### 6. Personalização

O componente pode ser personalizado alterando:
- **Cores dos marcadores**: Propriedades `color` nos `mapboxgl.Marker`
- **Estilo do mapa**: Propriedade `style` no `mapboxgl.Map`
- **Zoom padrão**: Propriedade `zoom` no `mapboxgl.Map`
- **Centro padrão**: Propriedade `center` no `mapboxgl.Map`

### 7. Limitações do Token Público

O token público incluído no código tem limitações:
- **50.000 requisições/mês** (suficiente para testes)
- Apenas para desenvolvimento/demonstração
- Para produção, use seu próprio token

### 8. Troubleshooting

**Problema**: Mapa não carrega
- **Solução**: Verifique se o token está correto

**Problema**: Geolocalização não funciona
- **Solução**: Use HTTPS (necessário para geolocalização)

**Problema**: Rota não aparece
- **Solução**: Verifique conexão com internet

---

🎯 **A funcionalidade está pronta para uso!** Basta configurar o token e testar.