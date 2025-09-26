# 🔄 Migração: banner_url → image

## Resumo
Alteração de todas as referências de `banner_url` para `image` na coluna de imagens de eventos, conforme solicitado.

## Arquivos Modificados

### 🗃️ **Tipos e Interfaces**
- `src/types/supabase.ts` - Interface Event
- `src/pages/EventsPage.tsx` - Interface AdminEvent  
- `src/components/Dashboard/EventDetailsModal.tsx` - Interface AdminEvent
- `src/components/Common/EventImageCard.tsx` - Interface do evento

### 🎨 **Componentes**
- `src/pages/EventsPage.tsx` - Lista de eventos (tabela)
- `src/components/Dashboard/EventDetailsModal.tsx` - Modal de detalhes
- `src/components/Dashboard/EventFormModal.tsx` - Formulário de evento
- `src/components/Common/EventImageCard.tsx` - Card de evento

### 📚 **Documentação**
- `src/components/Common/README_EventImages.md` - Exemplos atualizados
- `migrate_banner_url_to_image.sql` - Script de migração do banco
- `CHANGELOG_IMAGE_COLUMN.md` - Este arquivo

## Mudanças Específicas

### Interface de Evento
```typescript
// Antes
interface Event {
  banner_url?: string;
}

// Agora  
interface Event {
  image?: string;
}
```

### Uso nos Componentes
```tsx
// Antes
<EventImage src={event.banner_url} />

// Agora
<EventImage src={event.image} />
```

### Formulário de Upload
```tsx
// Antes
bannerUrl: event?.banner_url || ''
bucketName="event_banners"
label="Banner do Evento"

// Agora
imageUrl: event?.image || ''
bucketName="event_images" 
label="Imagem do Evento"
```

## 🛠️ Migração do Banco de Dados

Execute o script `migrate_banner_url_to_image.sql` para atualizar sua tabela:

```sql
-- Opção mais simples: renomear coluna
ALTER TABLE events RENAME COLUMN banner_url TO image;
```

## ✅ Checklist de Verificação

- [x] Interfaces TypeScript atualizadas
- [x] Componentes de exibição atualizados  
- [x] Formulários de upload atualizados
- [x] Documentação atualizada
- [x] Script de migração criado
- [ ] Executar migração no banco de dados
- [ ] Testar upload de imagens
- [ ] Verificar exibição nas páginas
- [ ] Atualizar lado do usuário (quando aplicável)

## 🔗 Sincronização Admin/User

Quando implementar no lado do usuário, certifique-se de:

1. Usar a mesma coluna `image` 
2. Importar os componentes de `src/components/Common/`
3. Manter a mesma estrutura de dados
4. Usar o mesmo bucket `event_images` no Supabase

## 📝 Notas Importantes

- O bucket do Supabase foi renomeado de `event_banners` para `event_images`
- Todos os placeholders e fallbacks continuam funcionando
- Os componentes `EventImage` e `EventImageCard` estão sincronizados
- A migração mantém a compatibilidade com dados existentes

## 🚀 Próximos Passos

1. Execute a migração do banco de dados
2. Teste o upload de novas imagens
3. Verifique se imagens existentes aparecem corretamente
4. Implemente os mesmos componentes no lado do usuário
5. Configure o bucket `event_images` no Supabase Storage