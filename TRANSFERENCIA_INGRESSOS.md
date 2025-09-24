# 🎫 Sistema de Transferência de Ingressos - PulaKatraca

## 📋 Visão Geral

Sistema completo para transferência de ingressos entre usuários, implementado com Supabase e React. Permite que usuários transfiram seus ingressos para outros usuários da plataforma.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `tickets`
- `id` - UUID (chave primária)
- `event_id` - UUID (referência ao evento)
- `user_id` - UUID (usuário atual)
- `status` - TEXT (active, confirmed, used, cancelled)
- `transfer_count` - INTEGER (quantidade de transferências realizadas)
- `max_transfers` - INTEGER (limite máximo de transferências)
- `transferred_at` - TIMESTAMP (data da última transferência)
- `transferred_by` - UUID (usuário que realizou a transferência)

#### `ticket_transfers` (Log de Transferências)
- `id` - UUID (chave primária)
- `ticket_id` - UUID (referência ao ingresso)
- `from_user_id` - UUID (usuário que transferiu)
- `to_user_id` - UUID (usuário que recebeu)
- `transferred_at` - TIMESTAMP (data da transferência)
- `transfer_reason` - TEXT (motivo da transferência)
- `status` - TEXT (completed, failed, cancelled)

#### `event_ticket_types`
- `id` - UUID (chave primária)
- `transferable` - BOOLEAN (permite transferência)
- `max_transfers` - INTEGER (limite de transferências)

## 🔧 Funções RPC (Supabase)

### 1. `can_transfer_ticket(p_ticket_id, p_user_id)`
Verifica se um ingresso pode ser transferido.

**Parâmetros:**
- `p_ticket_id` - UUID do ingresso
- `p_user_id` - UUID do usuário atual

**Retorna:**
```json
{
  "can_transfer": true/false,
  "message": "Mensagem explicativa",
  "data": {
    "ticket_id": "uuid",
    "current_transfers": 0,
    "max_transfers": 1,
    "remaining_transfers": 1
  }
}
```

### 2. `transfer_ticket(p_ticket_id, p_new_user_email, p_current_user_id)`
Realiza a transferência do ingresso.

**Parâmetros:**
- `p_ticket_id` - UUID do ingresso
- `p_new_user_email` - Email do usuário destinatário
- `p_current_user_id` - UUID do usuário atual

**Retorna:**
```json
{
  "success": true/false,
  "message": "Mensagem de resultado",
  "data": {
    "ticket_id": "uuid",
    "new_user_id": "uuid",
    "new_user_name": "Nome do usuário",
    "new_user_email": "email@exemplo.com",
    "transfer_count": 1,
    "max_transfers": 1
  }
}
```

## 🚀 Implementação no Frontend

### Serviço de Transferência (`TicketTransferService`)

```javascript
import { TicketTransferService } from '../services/ticketTransferService';

// Verificar se pode transferir
const canTransfer = await TicketTransferService.canTransferTicket(
  ticketId, 
  currentUserId
);

// Realizar transferência
const result = await TicketTransferService.transferTicket(
  ticketId,
  newUserEmail,
  currentUserId
);
```

### Componente de Transferência

```jsx
const TransferForm = ({ onSubmit, onCancel }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onSubmit(email);
    // Tratar resultado...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="usuario@pulakatraca.com"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Transferindo...' : 'Transferir'}
      </button>
    </form>
  );
};
```

## ✅ Regras de Negócio

### Validações de Transferência

1. **Usuário Logado**: Apenas usuários autenticados podem transferir
2. **Propriedade**: Usuário deve ser dono do ingresso
3. **Status do Ingresso**: Deve estar ativo ou confirmado
4. **Limite de Transferências**: Não pode exceder o máximo permitido
5. **Evento Ativo**: Evento não pode ter começado
6. **Usuário Destino**: Deve existir na plataforma
7. **Auto-transferência**: Não pode transferir para si mesmo

### Tipos de Ingresso

- **Transferível**: `transferable = true`
- **Não Transferível**: `transferable = false`
- **Limite Personalizado**: `max_transfers` configurável por tipo

## 🔒 Segurança

### Políticas RLS (Row Level Security)

```sql
-- Política para tickets
CREATE POLICY "Users can only access their own tickets" ON tickets
  FOR ALL USING (auth.uid() = user_id);

-- Política para transferências
CREATE POLICY "Users can view transfers they're involved in" ON ticket_transfers
  FOR SELECT USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id
  );
```

### Validações

- Verificação de autenticação
- Validação de propriedade
- Controle de transações
- Log de todas as operações

## 📱 Fluxo de Usuário

### 1. Usuário Clica em "TRANSFERIR"
- Abre modal de transferência
- Campo para email do destinatário

### 2. Validação do Email
- Formato válido
- Usuário existe na plataforma
- Não é o próprio usuário

### 3. Verificação de Elegibilidade
- Ingresso pode ser transferido
- Limite não foi atingido
- Evento não começou

### 4. Processamento da Transferência
- Atualização do banco
- Log da operação
- Notificação de sucesso

### 5. Confirmação
- Modal de resultado
- Detalhes da transferência
- Opção de fechar

## 🧪 Testes

### Cenários de Teste

1. **Transferência Válida**
   - Usuário logado
   - Ingresso transferível
   - Email válido
   - Limite não atingido

2. **Transferência Inválida**
   - Usuário não logado
   - Ingresso não transferível
   - Email inexistente
   - Limite atingido

3. **Casos Especiais**
   - Auto-transferência
   - Evento já começou
   - Ingresso cancelado

### Comandos de Teste

```bash
# Executar SQL de setup
psql -d your_database -f setup_transfer_system.sql

# Testar função RPC
SELECT can_transfer_ticket('ticket-uuid', 'user-uuid');
SELECT transfer_ticket('ticket-uuid', 'email@exemplo.com', 'user-uuid');
```

## 🚀 Deploy

### 1. Executar SQL no Supabase
```bash
# Copiar e executar o SQL completo no SQL Editor do Supabase
```

### 2. Configurar Variáveis de Ambiente
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 3. Verificar Políticas RLS
- Ativar RLS nas tabelas
- Configurar políticas de acesso
- Testar permissões

## 📊 Monitoramento

### Logs Importantes

- Tentativas de transferência
- Transferências bem-sucedidas
- Erros de validação
- Falhas de sistema

### Métricas

- Taxa de sucesso
- Tempo de processamento
- Usuários mais ativos
- Tipos de erro mais comuns

## 🔄 Manutenção

### Tarefas Regulares

1. **Limpeza de Logs**: Arquivar transferências antigas
2. **Análise de Performance**: Otimizar queries
3. **Auditoria de Segurança**: Revisar políticas RLS
4. **Backup de Dados**: Preservar histórico de transferências

### Atualizações

- Novas validações
- Limites de transferência
- Tipos de ingresso
- Políticas de segurança

---

## 📞 Suporte

Para dúvidas ou problemas:
- **Email**: suporte@pulakatraca.com
- **Documentação**: [Link para docs]
- **Issues**: [Repositório GitHub]

---

*Sistema desenvolvido para PulaKatraca - Plataforma de Eventos*
