# 🏦 Sistema Financeiro - Admin PULAKATRACA

## 📋 Visão Geral

O sistema financeiro implementado no admin permite gerenciar:
- **Contas bancárias** dos organizadores
- **Solicitações de saque** para processamento
- **Transações financeiras** do sistema
- **Relatórios e exportação** de dados

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 1. `bank_accounts` - Contas Bancárias
```sql
- id: UUID (chave primária)
- organizer_id: UUID (referência ao usuário)
- bank_name: VARCHAR(100) (nome do banco)
- agency: VARCHAR(20) (número da agência)
- account_number: VARCHAR(20) (número da conta)
- account_type: ENUM('corrente', 'poupanca')
- is_default: BOOLEAN (conta padrão)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. `withdrawals` - Solicitações de Saque
```sql
- id: UUID (chave primária)
- organizer_id: UUID (referência ao usuário)
- bank_account_id: UUID (referência à conta bancária)
- amount: DECIMAL(10,2) (valor do saque)
- status: ENUM('pendente', 'processando', 'concluido', 'cancelado')
- created_at: TIMESTAMP
- processed_at: TIMESTAMP (quando foi processado)
- notes: TEXT (observações)
- withdrawal_limit: DECIMAL(10,2) (limite de saque)
- auto_withdrawal_enabled: BOOLEAN (saque automático)
- auto_trigger_type: ENUM('manual', 'sales_amount', 'sales_count', 'time_interval')
- sales_amount_trigger: DECIMAL(10,2) (gatilho por valor)
- sales_count_trigger: INTEGER (gatilho por quantidade)
- time_interval_days: INTEGER (gatilho por tempo)
- last_auto_execution: TIMESTAMP (última execução automática)
- next_scheduled_execution: TIMESTAMP (próxima execução agendada)
```

#### 3. `transactions` - Transações Financeiras
```sql
- id: UUID (chave primária)
- event_id: UUID (referência ao evento)
- organizer_id: UUID (referência ao usuário)
- type: ENUM('Venda', 'Reembolso', 'Comissão', 'Saque')
- amount: DECIMAL(10,2) (valor da transação)
- status: ENUM('Concluído', 'Pendente', 'Falhou')
- description: TEXT (descrição da transação)
- payment_method: VARCHAR(50) (método de pagamento)
- reference_id: VARCHAR(100) (ID de referência)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 🔐 Segurança (RLS - Row Level Security)

### Políticas de Acesso

#### Para Organizadores:
- ✅ Podem ver/editar apenas suas próprias contas bancárias
- ✅ Podem ver/editar apenas seus próprios saques
- ✅ Podem ver/editar apenas suas próprias transações

#### Para Administradores:
- ✅ Podem ver todas as contas bancárias
- ✅ Podem ver todos os saques
- ✅ Podem ver todas as transações
- ✅ Podem processar saques (mudar status)

## 🚀 Funcionalidades Implementadas

### 1. **Visão Geral (Overview)**
- 📊 Cards com métricas financeiras
- 💰 Receita total, líquida e pendente
- 🏦 Número de contas bancárias
- 📈 Estatísticas de saques por status
- 📊 Gráficos de transações por tipo

### 2. **Transações**
- 🔍 Busca e filtros avançados
- 📋 Tabela com todas as transações
- 📊 Filtros por tipo e status
- 📤 Exportação para PDF
- 📱 Interface responsiva

### 3. **Contas Bancárias**
- 👥 Visualização de todas as contas
- 🏦 Informações completas dos bancos
- ⭐ Indicação de conta padrão
- 📧 Dados do organizador
- 📅 Data de criação

### 4. **Saques**
- 💳 Lista de solicitações de saque
- 🔄 Processamento de status
- 📊 Estatísticas por status
- ⚡ Ações rápidas (Processar, Cancelar, Concluir)
- 📝 Observações e limites

## 🛠️ Como Usar

### 1. **Configuração Inicial**
```bash
# Execute o script SQL no Supabase
psql -h your-supabase-host -U postgres -d postgres -f create_financial_tables.sql
```

### 2. **Acessando o Sistema**
1. Faça login no admin como usuário com role 'admin'
2. Navegue para a página "Financeiro"
3. Use as abas para acessar diferentes funcionalidades

### 3. **Processando Saques**
1. Vá para a aba "Saques"
2. Localize a solicitação pendente
3. Clique em "Processar" para iniciar
4. Clique em "Concluir" quando finalizar
5. Ou "Cancelar" se necessário

### 4. **Visualizando Contas Bancárias**
1. Vá para a aba "Contas Bancárias"
2. Veja todas as contas cadastradas
3. Identifique contas padrão (marcadas com azul)
4. Verifique dados dos organizadores

## 📊 Relatórios e Exportação

### Exportação PDF
- 📤 Botão "Exportar PDF" no header
- 📋 Inclui resumo financeiro
- 📊 Lista de transações filtradas
- 🎨 Formatação profissional

### Métricas Disponíveis
- 💰 Receita total e líquida
- 📈 Transações por tipo
- 🏦 Status dos saques
- 👥 Contas bancárias ativas

## 🔧 Funções do Banco de Dados

### `get_organizer_balance(organizer_uuid)`
Calcula o saldo disponível de um organizador:
```sql
SELECT get_organizer_balance('uuid-do-organizador');
```

### Triggers Automáticos
- **`update_updated_at_column`**: Atualiza timestamp de modificação
- **`ensure_single_default_account`**: Garante apenas uma conta padrão por organizador

## 🚨 Considerações Importantes

### 1. **Segurança**
- Todas as tabelas têm RLS habilitado
- Políticas específicas para admins e organizadores
- Validações de dados no banco

### 2. **Performance**
- Índices criados para consultas frequentes
- Filtros otimizados para grandes volumes
- Paginação implementada

### 3. **Auditoria**
- Timestamps de criação e modificação
- Histórico de status dos saques
- Rastreamento de transações

## 🐛 Troubleshooting

### Problema: "Tabela não encontrada"
```sql
-- Verifique se as tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bank_accounts', 'withdrawals', 'transactions');
```

### Problema: "Política RLS não encontrada"
```sql
-- Verifique as políticas
SELECT * FROM pg_policies 
WHERE tablename IN ('bank_accounts', 'withdrawals', 'transactions');
```

### Problema: "Trigger não encontrado"
```sql
-- Verifique os triggers
SELECT * FROM information_schema.triggers
WHERE event_object_table IN ('bank_accounts', 'withdrawals', 'transactions');
```

## 📱 Interface Responsiva

- ✅ **Desktop**: Layout completo com todas as funcionalidades
- ✅ **Tablet**: Adaptação para telas médias
- ✅ **Mobile**: Interface otimizada para dispositivos móveis
- 🎨 **Tema**: Suporte a modo claro e escuro

## 🔄 Atualizações Futuras

### Funcionalidades Planejadas
- 📊 Gráficos interativos (Chart.js)
- 📧 Notificações automáticas
- 💳 Integração com gateways de pagamento
- 📱 App mobile para organizadores
- 🔐 Autenticação 2FA

### Melhorias Técnicas
- 🚀 Cache Redis para performance
- 📊 Data warehouse para relatórios
- 🔍 Busca full-text avançada
- 📈 Analytics em tempo real

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console
2. Consulte a documentação do Supabase
3. Teste as políticas RLS
4. Verifique as permissões do usuário

---

**Sistema Financeiro PULAKATRACA** - Versão 1.0  
*Desenvolvido para gerenciar transações, contas bancárias e saques dos organizadores*
