# 🔍 QUERIES SQL OTIMIZADAS - Admin PULACATRACA

## 📊 Queries por Funcionalidade

### **1. DASHBOARD - Métricas Gerais**

#### **1.1 Receita Total (usando Orders)**
```sql
-- Receita total de pedidos pagos
SELECT 
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as average_order_value
FROM orders
WHERE payment_status IN ('paid', 'completed');

-- Receita por método de pagamento
SELECT 
  payment_method,
  COUNT(*) as order_count,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_value
FROM orders
WHERE payment_status IN ('paid', 'completed')
GROUP BY payment_method
ORDER BY revenue DESC;

-- Receita mensal (últimos 6 meses)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as orders,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_order
FROM orders
WHERE 
  payment_status IN ('paid', 'completed')
  AND created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

#### **1.2 Status dos Pedidos**
```sql
-- Contagem por status
SELECT 
  payment_status,
  COUNT(*) as count,
  SUM(total_amount) as total_amount,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM orders
GROUP BY payment_status
ORDER BY count DESC;

-- Pedidos pendentes há mais de 24h
SELECT 
  id,
  order_number,
  customer_name,
  customer_email,
  total_amount,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_pending
FROM orders
WHERE 
  payment_status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC;
```

#### **1.3 Taxa de Conversão**
```sql
-- Taxa de conversão de pedidos
SELECT 
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE payment_status IN ('paid', 'completed')) as paid_orders,
  COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_orders,
  COUNT(*) FILTER (WHERE canceled_at IS NOT NULL) as canceled_orders,
  ROUND(
    COUNT(*) FILTER (WHERE payment_status IN ('paid', 'completed')) * 100.0 / COUNT(*),
    2
  ) as conversion_rate
FROM orders;

-- Tempo médio até pagamento
SELECT 
  AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/60) as avg_minutes_to_pay,
  MIN(EXTRACT(EPOCH FROM (paid_at - created_at))/60) as min_minutes,
  MAX(EXTRACT(EPOCH FROM (paid_at - created_at))/60) as max_minutes
FROM orders
WHERE paid_at IS NOT NULL;
```

---

### **2. CHECK-INS - Taxa de Comparecimento**

#### **2.1 Check-ins por Evento**
```sql
-- Check-ins por evento com taxa de comparecimento
SELECT 
  e.id,
  e.title,
  e.start_date,
  COUNT(DISTINCT t.id) as total_tickets,
  COUNT(DISTINCT c.id) as total_checkins,
  ROUND(
    COUNT(DISTINCT c.id) * 100.0 / NULLIF(COUNT(DISTINCT t.id), 0),
    2
  ) as checkin_rate
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN checkin c ON c.event_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.title, e.start_date
ORDER BY e.start_date DESC;

-- Check-ins por hora (para eventos em andamento)
SELECT 
  DATE_TRUNC('hour', c.created_at) as hour,
  COUNT(*) as checkins
FROM checkin c
WHERE c.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', c.created_at)
ORDER BY hour DESC;
```

#### **2.2 Check-ins Recentes**
```sql
-- Últimos 50 check-ins com detalhes
SELECT 
  c.id,
  c.created_at,
  e.title as event_name,
  tu.name as attendee_name,
  tu.email as attendee_email,
  p.name as organizer_name
FROM checkin c
JOIN events e ON e.id = c.event_id
LEFT JOIN ticket_users tu ON tu.id = c.ticket_user_id
LEFT JOIN profiles p ON p.id = c.organizer_id
ORDER BY c.created_at DESC
LIMIT 50;
```

---

### **3. TRANSFERÊNCIAS - Movimentação de Ingressos**

#### **3.1 Transferências por Status**
```sql
-- Transferências por status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM ticket_transfers
GROUP BY status
ORDER BY count DESC;

-- Transferências recentes (últimos 7 dias)
SELECT 
  tt.id,
  tt.transferred_at,
  t.code as ticket_code,
  e.title as event_name,
  p_from.name as from_user,
  p_to.name as to_user,
  tt.transfer_reason,
  tt.status
FROM ticket_transfers tt
JOIN tickets t ON t.id = tt.ticket_id
JOIN events e ON e.id = t.event_id
LEFT JOIN profiles p_from ON p_from.id = tt.from_user_id
LEFT JOIN profiles p_to ON p_to.id = tt.to_user_id
WHERE tt.transferred_at >= NOW() - INTERVAL '7 days'
ORDER BY tt.transferred_at DESC;
```

#### **3.2 Usuários com Mais Transferências**
```sql
-- Top usuários que mais transferem ingressos
SELECT 
  p.id,
  p.name,
  p.email,
  COUNT(*) as transfers_made,
  COUNT(*) FILTER (WHERE tt.status = 'completed') as completed_transfers
FROM ticket_transfers tt
JOIN profiles p ON p.id = tt.from_user_id
GROUP BY p.id, p.name, p.email
HAVING COUNT(*) > 1
ORDER BY transfers_made DESC
LIMIT 20;

-- Top usuários que mais recebem ingressos
SELECT 
  p.id,
  p.name,
  p.email,
  COUNT(*) as transfers_received,
  COUNT(*) FILTER (WHERE tt.status = 'completed') as completed_received
FROM ticket_transfers tt
JOIN profiles p ON p.id = tt.to_user_id
GROUP BY p.id, p.name, p.email
HAVING COUNT(*) > 1
ORDER BY transfers_received DESC
LIMIT 20;
```

---

### **4. ATIVIDADES - Log do Sistema**

#### **4.1 Atividades Recentes**
```sql
-- Atividades das últimas 24 horas
SELECT 
  a.id,
  a.created_at,
  a.action,
  a.description,
  a.entity_type,
  p.name as user_name,
  p.email as user_email
FROM activities a
LEFT JOIN profiles p ON p.id = a.user_id
WHERE a.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY a.created_at DESC
LIMIT 100;

-- Atividades por tipo
SELECT 
  action,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM activities
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY count DESC;
```

#### **4.2 Atividades por Usuário**
```sql
-- Usuários mais ativos (últimos 7 dias)
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  COUNT(a.id) as activity_count,
  MAX(a.created_at) as last_activity
FROM profiles p
LEFT JOIN activities a ON a.user_id = p.id AND a.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.name, p.email, p.role
HAVING COUNT(a.id) > 0
ORDER BY activity_count DESC
LIMIT 50;
```

---

### **5. PAYMENT_HISTORY - Histórico de Pagamentos**

#### **5.1 Mudanças de Status**
```sql
-- Histórico de mudanças de status de pagamento
SELECT 
  ph.id,
  ph.created_at,
  o.order_number,
  o.customer_name,
  o.total_amount,
  ph.old_status,
  ph.new_status,
  ph.change_reason
FROM payment_history ph
JOIN orders o ON o.id = ph.order_id
ORDER BY ph.created_at DESC
LIMIT 100;

-- Pedidos com múltiplas tentativas de pagamento
SELECT 
  o.id,
  o.order_number,
  o.customer_name,
  o.total_amount,
  o.payment_status,
  COUNT(ph.id) as status_changes,
  MIN(ph.created_at) as first_attempt,
  MAX(ph.created_at) as last_attempt
FROM orders o
JOIN payment_history ph ON ph.order_id = o.id
GROUP BY o.id, o.order_number, o.customer_name, o.total_amount, o.payment_status
HAVING COUNT(ph.id) > 1
ORDER BY status_changes DESC;
```

#### **5.2 Taxa de Sucesso de Pagamentos**
```sql
-- Taxa de sucesso por método de pagamento
SELECT 
  o.payment_method,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as successful,
  COUNT(*) FILTER (WHERE o.payment_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE o.canceled_at IS NOT NULL) as failed,
  ROUND(
    COUNT(*) FILTER (WHERE o.payment_status IN ('paid', 'completed')) * 100.0 / COUNT(*),
    2
  ) as success_rate
FROM orders o
GROUP BY o.payment_method
ORDER BY total_attempts DESC;
```

---

### **6. ORDER_ITEMS - Detalhes dos Pedidos**

#### **6.1 Itens Mais Vendidos**
```sql
-- Itens mais vendidos
SELECT 
  oi.item_type,
  oi.description,
  COUNT(*) as quantity_sold,
  SUM(oi.total_amount) as total_revenue,
  AVG(oi.unit_amount) as avg_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.payment_status IN ('paid', 'completed')
GROUP BY oi.item_type, oi.description
ORDER BY quantity_sold DESC
LIMIT 50;

-- Receita por tipo de item
SELECT 
  oi.item_type,
  COUNT(DISTINCT oi.order_id) as orders,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.total_amount) as total_revenue,
  AVG(oi.unit_amount) as avg_unit_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.payment_status IN ('paid', 'completed')
GROUP BY oi.item_type
ORDER BY total_revenue DESC;
```

#### **6.2 Análise de Pedidos**
```sql
-- Pedidos com múltiplos itens
SELECT 
  o.id,
  o.order_number,
  o.customer_name,
  o.total_amount,
  COUNT(oi.id) as item_count,
  SUM(oi.quantity) as total_quantity
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.payment_status IN ('paid', 'completed')
GROUP BY o.id, o.order_number, o.customer_name, o.total_amount
HAVING COUNT(oi.id) > 1
ORDER BY item_count DESC;
```

---

### **7. TICKET_HISTORY - Histórico de Tickets**

#### **7.1 Histórico Completo de um Ticket**
```sql
-- Timeline completa de um ticket
SELECT 
  th.id,
  th.performed_at,
  th.action_type,
  th.action_description,
  th.old_values,
  th.new_values,
  p.name as performed_by_name,
  th.ip_address,
  th.user_agent
FROM ticket_history th
LEFT JOIN profiles p ON p.id = th.performed_by
WHERE th.ticket_id = 'TICKET_ID_AQUI'
ORDER BY th.performed_at DESC;

-- Ações mais comuns em tickets
SELECT 
  action_type,
  COUNT(*) as count,
  COUNT(DISTINCT ticket_id) as unique_tickets
FROM ticket_history
WHERE performed_at >= NOW() - INTERVAL '30 days'
GROUP BY action_type
ORDER BY count DESC;
```

---

### **8. QUERIES COMBINADAS - Relatórios Completos**

#### **8.1 Relatório Financeiro Completo**
```sql
-- Relatório financeiro com todas as fontes
SELECT 
  DATE_TRUNC('day', o.created_at) as date,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as paid_orders,
  SUM(o.total_amount) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as revenue,
  COUNT(DISTINCT oi.id) as total_items,
  SUM(oi.quantity) as total_quantity,
  COUNT(DISTINCT o.customer_id) as unique_customers
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', o.created_at)
ORDER BY date DESC;
```

#### **8.2 Relatório de Evento Completo**
```sql
-- Relatório completo de um evento
SELECT 
  e.id,
  e.title,
  e.start_date,
  e.status,
  
  -- Vendas
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as paid_orders,
  SUM(o.total_amount) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as revenue,
  
  -- Tickets
  COUNT(DISTINCT t.id) as total_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as active_tickets,
  
  -- Check-ins
  COUNT(DISTINCT c.id) as total_checkins,
  ROUND(
    COUNT(DISTINCT c.id) * 100.0 / NULLIF(COUNT(DISTINCT t.id), 0),
    2
  ) as checkin_rate,
  
  -- Transferências
  COUNT(DISTINCT tt.id) as total_transfers,
  COUNT(DISTINCT tt.id) FILTER (WHERE tt.status = 'completed') as completed_transfers

FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN order_items oi ON oi.item_id = e.id AND oi.item_type = 'event'
LEFT JOIN orders o ON o.id = oi.order_id
LEFT JOIN checkin c ON c.event_id = e.id
LEFT JOIN ticket_transfers tt ON tt.ticket_id = t.id
WHERE e.id = 'EVENT_ID_AQUI'
GROUP BY e.id, e.title, e.start_date, e.status;
```

#### **8.3 Relatório de Usuário Completo**
```sql
-- Perfil completo de um usuário
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  p.created_at,
  
  -- Pedidos
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as paid_orders,
  SUM(o.total_amount) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as total_spent,
  
  -- Tickets
  COUNT(DISTINCT t.id) as total_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as active_tickets,
  
  -- Check-ins
  COUNT(DISTINCT c.id) as total_checkins,
  
  -- Transferências
  COUNT(DISTINCT tt_from.id) as transfers_made,
  COUNT(DISTINCT tt_to.id) as transfers_received,
  
  -- Atividades
  COUNT(DISTINCT a.id) as total_activities,
  MAX(a.created_at) as last_activity

FROM profiles p
LEFT JOIN orders o ON o.customer_id = p.id
LEFT JOIN tickets t ON t.buyer_id = p.id OR t.user_id = p.id
LEFT JOIN checkin c ON c.ticket_user_id IN (
  SELECT tu.id FROM ticket_users tu WHERE tu.email = p.email
)
LEFT JOIN ticket_transfers tt_from ON tt_from.from_user_id = p.id
LEFT JOIN ticket_transfers tt_to ON tt_to.to_user_id = p.id
LEFT JOIN activities a ON a.user_id = p.id
WHERE p.id = 'USER_ID_AQUI'
GROUP BY p.id, p.name, p.email, p.role, p.created_at;
```

---

## 🎯 ÍNDICES RECOMENDADOS

Para otimizar as queries acima, crie estes índices:

```sql
-- Orders
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_paid_at ON orders(paid_at) WHERE paid_at IS NOT NULL;

-- Order Items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_type ON order_items(item_type);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);

-- Payment History
CREATE INDEX idx_payment_history_order_id ON payment_history(order_id);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at DESC);

-- Checkin
CREATE INDEX idx_checkin_event_id ON checkin(event_id);
CREATE INDEX idx_checkin_created_at ON checkin(created_at DESC);
CREATE INDEX idx_checkin_ticket_user_id ON checkin(ticket_user_id);

-- Ticket Transfers
CREATE INDEX idx_ticket_transfers_ticket_id ON ticket_transfers(ticket_id);
CREATE INDEX idx_ticket_transfers_status ON ticket_transfers(status);
CREATE INDEX idx_ticket_transfers_transferred_at ON ticket_transfers(transferred_at DESC);

-- Activities
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_entity_type_id ON activities(entity_type, entity_id);

-- Ticket History
CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_performed_at ON ticket_history(performed_at DESC);
```

---

## 📊 VIEWS RECOMENDADAS

Crie views para simplificar queries complexas:

```sql
-- View: Pedidos com detalhes completos
CREATE OR REPLACE VIEW v_orders_complete AS
SELECT 
  o.*,
  p.name as customer_profile_name,
  p.email as customer_profile_email,
  COUNT(oi.id) as item_count,
  SUM(oi.quantity) as total_quantity
FROM orders o
LEFT JOIN profiles p ON p.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, p.name, p.email;

-- View: Eventos com métricas
CREATE OR REPLACE VIEW v_events_metrics AS
SELECT 
  e.*,
  COUNT(DISTINCT t.id) as total_tickets,
  COUNT(DISTINCT c.id) as total_checkins,
  ROUND(
    COUNT(DISTINCT c.id) * 100.0 / NULLIF(COUNT(DISTINCT t.id), 0),
    2
  ) as checkin_rate,
  COUNT(DISTINCT tt.id) as total_transfers
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN checkin c ON c.event_id = e.id
LEFT JOIN ticket_transfers tt ON tt.ticket_id = t.id
GROUP BY e.id;

-- View: Usuários com estatísticas
CREATE OR REPLACE VIEW v_users_stats AS
SELECT 
  p.*,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount) FILTER (WHERE o.payment_status IN ('paid', 'completed')) as total_spent,
  COUNT(DISTINCT t.id) as total_tickets,
  COUNT(DISTINCT a.id) as total_activities
FROM profiles p
LEFT JOIN orders o ON o.customer_id = p.id
LEFT JOIN tickets t ON t.buyer_id = p.id OR t.user_id = p.id
LEFT JOIN activities a ON a.user_id = p.id
GROUP BY p.id;
```

---

## 🚀 USO NO CÓDIGO

### **Exemplo: Buscar dados do Dashboard**

```typescript
// Query otimizada com Supabase
const { data: orderStats } = await supabase
  .rpc('get_dashboard_stats', {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString()
  });
```

### **Função SQL para Dashboard:**

```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_orders', COUNT(*),
    'paid_orders', COUNT(*) FILTER (WHERE payment_status IN ('paid', 'completed')),
    'total_revenue', SUM(total_amount) FILTER (WHERE payment_status IN ('paid', 'completed')),
    'average_order_value', AVG(total_amount) FILTER (WHERE payment_status IN ('paid', 'completed')),
    'pending_orders', COUNT(*) FILTER (WHERE payment_status = 'pending'),
    'canceled_orders', COUNT(*) FILTER (WHERE canceled_at IS NOT NULL)
  ) INTO result
  FROM orders
  WHERE created_at BETWEEN start_date AND end_date;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

**✅ Todas as queries estão otimizadas e prontas para uso!**
