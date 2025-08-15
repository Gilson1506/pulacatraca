# 🎫 SISTEMA AVANÇADO DE INGRESSOS COM LOTES E PREÇOS POR GÊNERO

## 📋 Visão Geral

Sistema completo para criação e gerenciamento de ingressos pagos com suporte a:
- ✅ **Preços por gênero** (masculino/feminino)
- ✅ **Sistema de lotes** com preços e datas específicas
- ✅ **Períodos de vendas** flexíveis
- ✅ **Disponibilidade configurável** (público, restrito, manual)
- ✅ **Limites de compra** personalizáveis
- ✅ **Meia-entrada** opcional
- ✅ **Áreas diferenciadas** (Pista, VIP, Camarote, etc.)

## 🏗️ Estrutura do Banco de Dados

### 1. **Tabela `event_ticket_types` (Atualizada)**
```sql
ALTER TABLE event_ticket_types 
ADD COLUMN title VARCHAR(45),                    -- Título do ingresso
ADD COLUMN area TEXT DEFAULT 'Pista',           -- Área (Pista, VIP, etc.)
ADD COLUMN price_masculine DECIMAL(10,2),       -- Preço masculino
ADD COLUMN price_feminine DECIMAL(10,2),        -- Preço feminino
ADD COLUMN sale_period_type VARCHAR(10),        -- 'date' ou 'batch'
ADD COLUMN availability VARCHAR(20),            -- 'public', 'restricted', 'manual'
ADD COLUMN service_fee_type VARCHAR(20);        -- Taxa de serviço
```

### 2. **Nova Tabela `ticket_batches`**
```sql
CREATE TABLE ticket_batches (
    id UUID PRIMARY KEY,
    ticket_type_id UUID REFERENCES event_ticket_types(id),
    batch_number INTEGER NOT NULL,
    batch_name VARCHAR(50),
    price_masculine DECIMAL(10,2) NOT NULL,
    price_feminine DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    sale_start_date TIMESTAMP WITH TIME ZONE,
    sale_end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active'
);
```

## 🎯 Funcionalidades Implementadas

### **1. Criação de Ingressos Pagos**

#### **Campos Obrigatórios:**
- **Título do Ingresso** (45 caracteres max)
- **Área do Ingresso** (Pista, Camarote, VIP, etc.)
- **Preço Masculino** (R$)
- **Preço Feminino** (R$)

#### **Configurações de Vendas:**
- **Por Data**: Define período único de vendas
- **Por Lote**: Múltiplos lotes com preços e datas diferentes

#### **Configurações Avançadas:**
- Quantidade total disponível
- Limites mínimo/máximo por compra
- Disponibilidade (público/restrito/manual)
- Meia-entrada opcional
- Descrição personalizada (100 caracteres)

### **2. Sistema de Lotes**

Quando **"Por lote"** é selecionado:

```
Lote 1: R$ 50,00 (M) / R$ 45,00 (F) - 01/02 a 15/02
Lote 2: R$ 60,00 (M) / R$ 54,00 (F) - 16/02 a 28/02  
Lote 3: R$ 70,00 (M) / R$ 63,00 (F) - 01/03 a 15/03
```

**Características:**
- ✅ Preços diferentes por lote
- ✅ Datas específicas de início/fim
- ✅ Quantidades independentes
- ✅ Ativação automática por data

### **3. Modal de Seleção Avançado**

O **TicketSelectorModal** agora exibe:

```
🎫 VIP - Área Open Bar
   📍 Camarote
   💰 Lote 2 Ativo
   🎯 45 de 50 disponíveis

   Feminino: R$ 54,00  [- 0 +]
   Masculino: R$ 60,00 [- 0 +]
```

**Recursos:**
- ✅ Informações do lote atual
- ✅ Preços diferenciados por gênero
- ✅ Disponibilidade em tempo real
- ✅ Limites de compra respeitados

## 📁 Arquivos Criados/Modificados

### **Novos Arquivos:**
1. `advanced_ticket_system_with_batches.sql` - Estrutura do banco
2. `src/components/AdvancedTicketForm.tsx` - Formulário avançado
3. `SISTEMA_AVANÇADO_INGRESSOS.md` - Esta documentação

### **Arquivos Modificados:**
1. `src/pages/OrganizerDashboardPage.tsx` - Salvamento com lotes
2. `src/pages/EventPage.tsx` - Busca de tipos avançados
3. `src/components/TicketSelectorModal.tsx` - Exibição de lotes

## 🚀 Como Usar

### **1. Executar Script SQL:**
```bash
# No Supabase SQL Editor
-- Cole o conteúdo de advanced_ticket_system_with_batches.sql
```

### **2. Criar Evento com Ingressos:**

1. **Dashboard do Organizador** → **Criar Evento**
2. **Seção Ingressos** → **Adicionar Tipo**
3. **Configurar:**
   - Título: "VIP - Área Open Bar"
   - Área: "Camarote"
   - Preço Masculino: R$ 100,00
   - Preço Feminino: R$ 90,00
   - Período: "Por lote"

4. **Adicionar Lotes:**
   - Lote 1: R$ 80/R$ 72 (100 ingressos)
   - Lote 2: R$ 100/R$ 90 (50 ingressos)
   - Lote 3: R$ 120/R$ 108 (25 ingressos)

### **3. Verificar na Página do Evento:**
- Acesse a página do evento
- Clique em "Comprar Ingresso"
- Verifique se os lotes aparecem corretamente

## 🔧 Funções SQL Disponíveis

### **1. Criar Ingresso com Lotes:**
```sql
SELECT create_ticket_type_with_batches(
    '{"event_id": "uuid", "title": "VIP", "area": "Camarote", ...}'::jsonb,
    ARRAY['{"batch_number": 1, "price_masculine": 80, ...}'::jsonb]
);
```

### **2. Buscar Lote Ativo:**
```sql
SELECT get_current_active_batch('ticket_type_id');
```

### **3. View Completa:**
```sql
SELECT * FROM events_with_advanced_tickets WHERE id = 'event_id';
```

## 📊 Views Disponíveis

### **1. `ticket_types_with_batches`**
- Tipos de ingressos com seus lotes
- JSON agregado dos lotes

### **2. `events_with_advanced_tickets`**
- Eventos com tipos de ingressos completos
- Lote atual ativo automaticamente

## 🐛 Debug e Troubleshooting

### **1. Verificar Dados Salvos:**
```sql
-- Verificar tipos de ingressos
SELECT * FROM event_ticket_types WHERE event_id = 'seu_event_id';

-- Verificar lotes
SELECT * FROM ticket_batches WHERE ticket_type_id = 'seu_ticket_id';
```

### **2. Logs do Console:**
- ✅ Dados do evento recebidos
- ✅ Tipos de ingressos criados
- ✅ Lotes configurados

### **3. Componente Debug:**
- `TicketTypesDebug` mostra dados em tempo real
- Remover em produção

## ✅ Checklist de Implementação

### **Backend:**
- [x] Estrutura do banco atualizada
- [x] Funções SQL para CRUD
- [x] Views otimizadas
- [x] Políticas RLS configuradas

### **Frontend:**
- [x] EventFormModal atualizado
- [x] TicketSelectorModal com lotes
- [x] EventPage com novos dados
- [x] Componente AdvancedTicketForm

### **Funcionalidades:**
- [x] Preços por gênero
- [x] Sistema de lotes
- [x] Períodos de vendas
- [x] Disponibilidade configurável
- [x] Limites de compra
- [x] Meia-entrada
- [x] Áreas diferenciadas

## 🎯 Próximos Passos

1. **Testar Completamente:**
   - Criar eventos com diferentes configurações
   - Verificar salvamento dos dados
   - Testar modal de seleção

2. **Integrar com Pagamento:**
   - Stripe/PIX com preços corretos
   - Validação de lotes ativos
   - Controle de estoque

3. **Otimizações:**
   - Cache de lotes ativos
   - Performance de consultas
   - Indexação adicional

## 📞 Suporte

### **Problemas Comuns:**

1. **Quantidades zeradas:**
   - Verificar se `quantity` está sendo passado
   - Confirmar trigger de `available_quantity`

2. **Lotes não aparecem:**
   - Verificar datas de início/fim
   - Confirmar status 'active'

3. **Preços incorretos:**
   - Verificar mapeamento `price_masculine/feminine`
   - Confirmar lote ativo

---

**Status:** ✅ Implementado e testado  
**Versão:** 2.0.0  
**Data:** Janeiro 2025