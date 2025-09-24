# 🎯 Requisitos do Frontend para Sistema de Transferências

## 🔍 O que deve ser garantido no Frontend

### 1. **Verificação de Autenticação**
```javascript
// ✅ GARANTIR que o usuário está logado antes de mostrar opções de transferência
const { user, session } = useAuth();

// Só mostrar botão de transferir se houver usuário autenticado
if (!user || !session) {
  return <div>Faça login para transferir ingressos</div>;
}
```

### 2. **Verificação de Propriedade do Ingresso**
```javascript
// ✅ GARANTIR que o usuário logado é o proprietário do ingresso
const isOwner = ticket.user_id === user.id;

// Só mostrar botão se for o proprietário
{isOwner && (
  <button onClick={openTransferModal}>
    TRANSFERIR INGRESSO
  </button>
)}
```

### 3. **Validação de Dados do Ingresso**
```javascript
// ✅ GARANTIR que o ingresso tem todos os dados necessários
const canTransfer = ticket && 
  ticket.id && 
  ticket.user_id && 
  ticket.ticket_user_id && 
  ticket.status === 'active';

// Desabilitar botão se não puder transferir
<button 
  disabled={!canTransfer}
  onClick={openTransferModal}
>
  TRANSFERIR INGRESSO
</button>
```

### 4. **Verificação de Status do Evento**
```javascript
// ✅ GARANTIR que o evento ainda não começou
const eventHasStarted = new Date(event.start_date) <= new Date();

// Não permitir transferência se evento já começou
if (eventHasStarted) {
  return <div>Transferências não permitidas para eventos que já começaram</div>;
}
```

### 5. **Validação de Email do Destinatário**
```javascript
// ✅ GARANTIR que o email é válido e não é o próprio usuário
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email !== user.email;
};

// Validar antes de enviar
if (!validateEmail(recipientEmail)) {
  setError('Email inválido ou não pode transferir para você mesmo');
  return;
}
```

### 6. **Tratamento de Estados de Loading**
```javascript
// ✅ GARANTIR feedback visual durante operações
const [isTransferring, setIsTransferring] = useState(false);

// Mostrar loading durante transferência
{isTransferring ? (
  <div>Transferindo ingresso...</div>
) : (
  <button onClick={handleTransfer}>
    Confirmar Transferência
  </button>
)}
```

### 7. **Tratamento de Erros**
```javascript
// ✅ GARANTIR que erros são exibidos ao usuário
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);

// Exibir mensagens de erro/sucesso
{error && <div className="error">{error}</div>}
{success && <div className="success">{success}</div>}

// Limpar mensagens ao fechar modal
const closeModal = () => {
  setError(null);
  setSuccess(null);
  setIsOpen(false);
};
```

### 8. **Verificação de Permissões de Transferência**
```javascript
// ✅ GARANTIR que o tipo de ingresso permite transferência
const checkTransferPermissions = async (ticketId) => {
  try {
    const { data, error } = await supabase.rpc('can_transfer_ticket', {
      p_ticket_id: ticketId,
      p_user_id: user.id
    });
    
    if (error) throw error;
    
    if (!data.can_transfer) {
      setError(data.message);
      return false;
    }
    
    return true;
  } catch (error) {
    setError('Erro ao verificar permissões de transferência');
    return false;
  }
};
```

### 9. **Atualização de Dados Após Transferência**
```javascript
// ✅ GARANTIR que os dados são atualizados após transferência
const handleTransferSuccess = async () => {
  setSuccess('Ingresso transferido com sucesso!');
  
  // Recarregar dados do ingresso
  await fetchTicketData();
  
  // Fechar modal após delay
  setTimeout(() => {
    closeModal();
    // Redirecionar ou atualizar lista
    window.location.reload();
  }, 2000);
};
```

### 10. **Validação de Formulário Completa**
```javascript
// ✅ GARANTIR validação completa antes de enviar
const validateForm = () => {
  if (!recipientEmail.trim()) {
    setError('Email do destinatário é obrigatório');
    return false;
  }
  
  if (!validateEmail(recipientEmail)) {
    setError('Email inválido');
    return false;
  }
  
  if (!transferReason.trim()) {
    setError('Motivo da transferência é obrigatório');
    return false;
  }
  
  return true;
};

// Usar na submissão
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsTransferring(true);
  setError(null);
  
  try {
    // Executar transferência
    await executeTransfer();
  } catch (error) {
    setError('Erro na transferência: ' + error.message);
  } finally {
    setIsTransferring(false);
  }
};
```

## 🚨 **Pontos Críticos a Verificar**

### **Antes de Mostrar Modal de Transferência:**
1. ✅ Usuário está autenticado
2. ✅ Usuário é proprietário do ingresso
3. ✅ Ingresso tem status válido
4. ✅ Evento não começou
5. ✅ Tipo de ingresso permite transferência
6. ✅ Número máximo de transferências não foi atingido

### **Durante a Transferência:**
1. ✅ Email do destinatário é válido
2. ✅ Destinatário não é o próprio usuário
3. ✅ Destinatário existe no sistema
4. ✅ Formulário está completo
5. ✅ Feedback visual de loading
6. ✅ Tratamento de erros

### **Após a Transferência:**
1. ✅ Mensagem de sucesso
2. ✅ Dados atualizados na interface
3. ✅ Modal fechado
4. ✅ Lista de ingressos atualizada
5. ✅ Histórico de transferências atualizado

## 🔧 **Implementação Recomendada**

### **Componente de Transferência:**
```javascript
const TransferModal = ({ ticket, isOpen, onClose, onSuccess }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Validar se pode transferir
  const canTransfer = useMemo(() => {
    return ticket && 
           ticket.user_id === user?.id && 
           ticket.status === 'active' &&
           new Date(ticket.event?.start_date) > new Date();
  }, [ticket, user]);

  // Verificar permissões antes de abrir
  useEffect(() => {
    if (isOpen && !canTransfer) {
      onClose();
      setError('Este ingresso não pode ser transferido');
    }
  }, [isOpen, canTransfer]);

  // Limpar estado ao fechar
  const handleClose = () => {
    setRecipientEmail('');
    setTransferReason('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  // Executar transferência
  const executeTransfer = async () => {
    if (!validateForm()) return;
    
    setIsTransferring(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('transfer_ticket', {
        p_ticket_id: ticket.id,
        p_new_user_email: recipientEmail,
        p_current_user_id: user.id
      });
      
      if (error) throw error;
      
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Erro na transferência: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="transfer-modal">
        <h2>Transferir Ingresso</h2>
        
        {/* Informações do ingresso */}
        <div className="ticket-info">
          <p><strong>Evento:</strong> {ticket.event?.title}</p>
          <p><strong>Proprietário:</strong> {ticket.owner_name}</p>
          <p><strong>Status:</strong> {ticket.status}</p>
          <p><strong>Tipo:</strong> {ticket.ticket_type}</p>
        </div>
        
        {/* Formulário */}
        <form onSubmit={(e) => { e.preventDefault(); executeTransfer(); }}>
          <div className="form-group">
            <label>Email do Destinatário:</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="destinatario@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Motivo da Transferência:</label>
            <textarea
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Explique o motivo da transferência..."
              required
            />
          </div>
          
          {/* Mensagens de erro/sucesso */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          {/* Botões */}
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={handleClose}
              disabled={isTransferring}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isTransferring || !recipientEmail || !transferReason}
            >
              {isTransferring ? 'Transferindo...' : 'Confirmar Transferência'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
```

## 📱 **Testes Recomendados**

### **Testes de Validação:**
- [ ] Usuário não logado não vê botão de transferir
- [ ] Usuário não proprietário não vê botão de transferir
- [ ] Ingresso inativo não pode ser transferido
- [ ] Evento já iniciado não permite transferência
- [ ] Email inválido mostra erro
- [ ] Email próprio mostra erro
- [ ] Formulário incompleto não envia

### **Testes de Funcionalidade:**
- [ ] Modal abre com dados corretos
- [ ] Transferência executa com sucesso
- [ ] Dados são atualizados após transferência
- [ ] Modal fecha automaticamente
- [ ] Lista de ingressos é atualizada
- [ ] Mensagens de erro são exibidas
- [ ] Loading é mostrado durante operação

### **Testes de Segurança:**
- [ ] Usuário não pode transferir ingresso de outro
- [ ] Validações são feitas no frontend e backend
- [ ] Dados sensíveis não são expostos
- [ ] Sessão expirada é tratada

---

**✅ Seguindo estes requisitos, o frontend garantirá uma experiência segura e confiável para transferências de ingressos!**
