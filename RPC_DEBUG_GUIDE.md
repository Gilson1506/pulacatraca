# 🚀 GUIA DEBUG RPC FUNCTION - Scanner QR

## 📋 VERIFICAÇÃO COMPLETA DA RPC FUNCTION

### **🎯 1. PRIMEIRO PASSO - Executar SQL no Supabase**

#### **Copie e execute no SQL Editor do Supabase:**
```sql
-- Conteúdo do arquivo: checkin_rpc_function.sql
-- Cole todo o conteúdo no SQL Editor e execute
```

---

### **🔍 2. VERIFICAR SE FUNÇÃO EXISTE**

#### **Teste manual no Supabase SQL Editor:**
```sql
SELECT checkin_by_qr_code('TEST_QR_CODE_123');
```

#### **Resultado esperado:**
```json
{
  "success": false,
  "error": "QR_CODE_NOT_FOUND",
  "message": "Código QR não encontrado ou inválido"
}
```

---

### **🧪 3. TESTE AUTOMÁTICO NO SCANNER**

#### **No Scanner QR:**
1. **Abra** o scanner QR
2. **Clique** no botão "🧪 Testar RPC com QR Exemplo"
3. **Verifique** a resposta:

#### **✅ Se RPC existe:**
```
Alert: "✅ RPC Function está funcionando!"
Console: Resposta detalhada da função
```

#### **❌ Se RPC não existe:**
```
Alert: "❌ RPC Function não existe! Execute o SQL no Supabase"
Console: Erro de função não encontrada
```

---

### **📊 4. DEBUG DETALHADO NO CONSOLE**

#### **Quando escanear QR real, observe no console:**

#### **🚀 Início do Processo:**
```
🚀 RPC DEBUG - INICIANDO PROCESSO
📋 QR Code: PLKTK123456
⏱️ Tempo inicial: 2025-08-03T...
🔗 Verificando conexão Supabase...
👤 Usuário autenticado: user-id-123
📞 Chamando função RPC checkin_by_qr_code...
```

#### **✅ Sucesso:**
```
⏱️ Tempo RPC: 250.50ms
📦 RPC Result Raw: { success: true, action: "NEW_CHECKIN" ... }
🎯 Ação RPC: NEW_CHECKIN
💬 Mensagem RPC: Check-in realizado com sucesso!
✅ Estrutura RPC válida - convertendo para TicketData...
🎉 RPC PROCESSO COMPLETO COM SUCESSO!
⏱️ Tempo total: 320.75ms
👤 Participante: João Silva | Evento: Festa de Verão
```

#### **❌ Erro:**
```
❌ ERRO RPC DETECTADO: function checkin_by_qr_code(text) does not exist
📋 Detalhes do erro: { message: "...", code: "42883" }
💥 ERRO COMPLETO NO PROCESSO RPC:
⏱️ Tempo até erro: 150.25ms
```

---

### **🎭 5. INDICADORES VISUAIS**

#### **No Header do Scanner:**
- **✅ Verde pulsando**: "RPC Function Ativa" 
- **❌ Se não aparecer**: RPC pode não estar funcionando

#### **Na interface:**
- **✅ Texto**: "🚀 RPC Function Ativa - Processamento Ultra-Rápido"
- **🧪 Botão teste**: "🧪 Testar RPC com QR Exemplo"

---

### **🔧 6. PROBLEMAS COMUNS**

#### **Problema 1: "function does not exist"**
```
Solução: Execute checkin_rpc_function.sql no Supabase
```

#### **Problema 2: "permission denied"**
```sql
-- Executar no Supabase:
GRANT EXECUTE ON FUNCTION checkin_by_qr_code(TEXT) TO authenticated;
```

#### **Problema 3: RPC retorna null**
```
Verificar:
- Tabelas existem (ticket_users, tickets, events, checkin)
- QR code existe na tabela ticket_users
- Relacionamentos estão corretos
```

#### **Problema 4: "JSON parsing error"**
```
Verificar:
- Versão PostgreSQL suporta json_build_object
- Função retorna JSON válido
```

---

### **📋 7. TESTE COMPLETO PASSO A PASSO**

#### **✅ Checklist:**
- [ ] 1. Executei SQL no Supabase
- [ ] 2. Testei função manualmente no SQL Editor  
- [ ] 3. Botão teste no scanner funciona
- [ ] 4. Console mostra logs detalhados
- [ ] 5. QR real faz check-in automaticamente
- [ ] 6. Modal exibe dados corretos
- [ ] 7. Performance é rápida (< 500ms)

---

### **🚀 8. PERFORMANCE ESPERADA**

#### **Tempos de resposta:**
- **RPC Call**: 50-300ms
- **Processo total**: 100-500ms
- **Muito mais rápido** que queries múltiplas

#### **Logs de sucesso:**
```
[SCANNER DEBUG] 🚀 [RPC] Iniciando processamento para QR: PLKTK123456
[SCANNER DEBUG] ⏱️ [RPC] Tempo de execução: 245.67ms
[SCANNER DEBUG] 🎯 [RPC] Ação: NEW_CHECKIN | Mensagem: Check-in realizado com sucesso!
[SCANNER DEBUG] 🎉 [RPC] SUCESSO! Tempo total: 334.89ms
[SCANNER DEBUG] 👤 [RPC] Participante: João Silva | Evento: Festa de Verão
```

---

### **💡 9. DICAS DE DEBUG**

#### **F12 → Console → Filtrar por:**
- `RPC DEBUG` - Ver processo completo
- `[RPC]` - Ver logs específicos da RPC
- `[SCANNER DEBUG]` - Ver todos logs do scanner

#### **Comandos úteis no console:**
```javascript
// Testar conexão Supabase
supabase.auth.getUser()

// Testar RPC manualmente
supabase.rpc('checkin_by_qr_code', { p_qr_code: 'TEST' })
```

---

**🎯 Com este debug detalhado, você saberá exatamente se a RPC está funcionando e onde está o problema!**