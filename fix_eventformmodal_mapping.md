# 🔍 Análise dos Campos NULL na Tabela Events

## 🚨 Problemas Identificados

Após analisar sua tabela `events` e o `EventFormModal`, identifiquei várias discrepâncias que causam campos NULL:

### 1. **Campos Obrigatórios com Valores NULL**

#### ❌ `end_date` (NOT NULL na tabela)
- **Problema**: No EventFormModal, `end_date` pode ser NULL
- **Código atual**: `end_date: formData.end_date ? ... : null`
- **Tabela**: `end_date timestamp with time zone not null`
- **Solução**: Sempre definir uma data final

#### ❌ `category` (NOT NULL na tabela)  
- **Problema**: Mapeamento incorreto
- **Código atual**: `category: formData.subject || 'evento'`
- **Deveria ser**: `category: formData.category || formData.subject || 'evento'`

### 2. **Campos Ausentes no INSERT**

Os seguintes campos da tabela **NÃO** estão sendo enviados no INSERT:

#### 📋 Campos de Controle
- `available_tickets` - Deveria ser calculado dos tickets
- `total_tickets` - Deveria ser calculado dos tickets  
- `sold_tickets` - Deveria iniciar como 0
- `max_tickets_per_user` - Deveria vir do formulário
- `min_tickets_per_user` - Deveria vir do formulário

#### 📋 Campos de Metadados
- `banner_metadata` - Informações da imagem
- `banner_alt_text` - Texto alternativo da imagem
- `image_size` - Tamanho da imagem
- `image_format` - Formato da imagem

#### 📋 Campos de Venda
- `ticket_sales_start` - Data início das vendas
- `ticket_sales_end` - Data fim das vendas

#### 📋 Campos Adicionais
- `tags` - Tags do evento
- `important_info` - Informações importantes
- `attractions` - Atrações do evento
- `address` - Endereço completo formatado
- `classification` - Classificação etária

### 3. **Discrepâncias no OrganizerDashboardPage**

O `onSubmit` do OrganizerDashboardPage tem um mapeamento **DIFERENTE** do EventFormModal:

#### EventFormModal envia:
```javascript
{
  title: formData.title,
  subject: formData.subject,
  category: formData.subject || 'evento'
}
```

#### OrganizerDashboardPage espera:
```javascript
{
  title: data.name,        // ❌ Diferente!
  category: data.category, // ❌ Diferente!
}
```

## 🛠️ Soluções Necessárias

### 1. **Corrigir Mapeamento de Campos Obrigatórios**
### 2. **Adicionar Campos Ausentes no INSERT** 
### 3. **Sincronizar EventFormModal com OrganizerDashboardPage**
### 4. **Calcular Campos Derivados Automaticamente**
### 5. **Adicionar Validação de Campos Obrigatórios**

## 📊 Campos por Categoria

### ✅ Campos Sendo Salvos Corretamente:
- `title`, `description`, `organizer_id`, `start_date`
- `location`, `status`, `created_at`, `image`, `price`
- `location_*` (todos os campos de localização)
- `ticket_type`, `created_by`

### ❌ Campos com Problemas:
- `end_date` (pode ser NULL quando é NOT NULL)
- `category` (mapeamento incorreto)
- `available_tickets`, `total_tickets` (não calculados)
- `sold_tickets` (não inicializado)
- Todos os campos de metadados da imagem
- Campos de venda de tickets
- Campos adicionais (tags, attractions, etc.)

### 🔍 Campos Opcionais OK (podem ser NULL):
- Todos os `location_*` campos
- `subject`, `subcategory`  
- `tags`, `banner_metadata`, etc.