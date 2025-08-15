# Sistema de Check-in - Configuração e Uso

## 📋 Pré-requisitos

1. **Banco de Dados**: Execute o script `create_checkin_table.sql` no Supabase SQL Editor
2. **Permissões**: O usuário deve ser organizador de evento
3. **Navegador**: Suporte a câmera para QR Code (HTTPS obrigatório)

## 🚀 Configuração Inicial

### 1. Executar Script SQL

Execute o arquivo `create_checkin_table.sql` no Supabase SQL Editor. Este script:

- ✅ Cria a tabela `check_ins` com todos os campos necessários
- 🔒 Configura políticas RLS para segurança
- 📈 Adiciona índices para performance
- 🛡️ Cria função `perform_check_in` para check-ins seguros
- 🔍 Cria função `search_tickets_for_checkin` para busca
- 📝 Adiciona auditoria e logs

### 2. Verificar Tabelas Existentes

Certifique-se de que as seguintes tabelas existem:
- `events` (eventos)
- `tickets` (ingressos)
- `ticket_users` (usuários dos ingressos)
- `profiles` (perfis de usuários)
- `check_ins` (registros de check-in) ← **Nova tabela**

## 🎯 Funcionalidades Implementadas

### ✅ Leitura de QR Code
- Scanner real usando câmera do dispositivo
- Suporte a câmera traseira (preferencial)
- Destaque visual da área de scan
- Processamento automático ao detectar código

### ✅ Busca Manual
- Busca por nome do participante
- Busca por documento (CPF, etc.)
- Busca por código do ingresso
- Resultados em tempo real

### ✅ Verificações de Segurança
- ✓ Ticket pertence ao evento
- ✓ Organizador tem permissão no evento
- ✓ Ticket está ativo/válido
- ✓ Prevenção de check-ins duplicados
- ✓ Auditoria completa de tentativas

### ✅ Registros e Estatísticas
- Histórico completo de check-ins
- Status: sucesso, duplicado, inválido
- Contadores em tempo real
- Filtragem e busca nos registros

## 🔧 Como Usar

### Acesso à Página
1. Faça login como organizador
2. Acesse `/checkin` no sistema
3. O sistema carregará automaticamente seu evento ativo

### Scanner QR Code
1. Clique em "Ativar Scanner"
2. Permita acesso à câmera
3. Posicione o QR code na área destacada
4. O check-in será processado automaticamente

### Busca Manual
1. Digite nome, documento ou código na busca
2. Selecione o participante nos resultados
3. Clique em "Fazer Check-in"

## 🔒 Segurança e Políticas RLS

### Políticas Implementadas
- Organizadores só veem check-ins dos próprios eventos
- Verificação de ownership em todas as operações
- Logs de auditoria para todas as tentativas
- Prevenção de SQL injection e ataques

### Dados Armazenados para Auditoria
- Código do ticket no momento do check-in
- Nome do cliente no momento do check-in
- Documento do cliente (se disponível)
- Timestamp preciso da operação
- Status da operação (sucesso/duplicado/inválido)

## 📱 Compatibilidade

### Navegadores Suportados
- ✅ Chrome/Chromium (recomendado)
- ✅ Firefox
- ✅ Safari (iOS)
- ✅ Edge
- ⚠️ Requer HTTPS para acesso à câmera

### Dispositivos
- ✅ Desktop com webcam
- ✅ Smartphones (Android/iOS)
- ✅ Tablets
- 📱 Responsivo para todos os tamanhos

## 🛠️ Dependências Instaladas

```json
{
  "qr-scanner": "^1.4.2"
}
```

## 🔍 Estrutura da Tabela check_ins

```sql
CREATE TABLE check_ins (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL,
  event_id UUID NOT NULL,
  organizer_id UUID NOT NULL,
  ticket_user_id UUID,
  status TEXT CHECK (status IN ('checked_in', 'duplicate', 'invalid')),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  -- Campos de auditoria
  ticket_code TEXT,
  ticket_type TEXT,
  customer_name TEXT,
  customer_document TEXT
);
```

## 🚨 Troubleshooting

### Problema: "Nenhum Evento Ativo"
**Solução**: Certifique-se de ter um evento com status 'approved'

### Problema: Câmera não funciona
**Soluções**:
- Verifique se está usando HTTPS
- Permita acesso à câmera no navegador
- Use um navegador compatível

### Problema: "Ticket não encontrado"
**Verificações**:
- Código do ticket está correto
- Ticket pertence ao evento atual
- Ticket não foi cancelado

### Problema: Busca não retorna resultados
**Verificações**:
- Nome/documento está correto
- Participante foi cadastrado no evento
- Permissões RLS estão corretas

## 📞 Suporte

Para problemas técnicos:
1. Verifique os logs do navegador (F12)
2. Confirme se todas as tabelas foram criadas
3. Verifique as políticas RLS no Supabase
4. Teste com dados de exemplo

## 🔄 Atualizações Futuras

Funcionalidades planejadas:
- [ ] Export de relatórios de check-in
- [ ] Notificações em tempo real
- [ ] Múltiplos eventos simultâneos
- [ ] Check-in offline com sincronização