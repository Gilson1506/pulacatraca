# 🔧 INSTRUÇÕES PARA CORRIGIR PÁGINA DE CHECK-IN

## ❌ PROBLEMA IDENTIFICADO
A página de check-in não está carregando dados do Supabase corretamente devido a:
1. **Funções RPC ausentes** ou com problemas
2. **Políticas RLS** muito restritivas
3. **Estrutura de dados** inconsistente

## ✅ SOLUÇÃO COMPLETA

### 1. 🗃️ **EXECUTAR SCRIPT SQL NO SUPABASE**

**📍 PASSO A PASSO:**

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Entre no seu projeto

2. **Abra o SQL Editor**
   - Clique em "SQL Editor" no menu lateral
   - Clique em "New Query"

3. **Execute o Script**
   - Copie TODO o conteúdo do arquivo `fix_checkin_functions_complete.sql`
   - Cole no editor SQL
   - Clique em "Run" (▶️)

4. **Verificar Resultado**
   - Deve aparecer mensagens como:
   ```
   NOTICE: === VERIFICANDO ESTRUTURA DAS TABELAS ===
   NOTICE: === VERIFICANDO FUNÇÕES RPC EXISTENTES ===
   NOTICE: === VERIFICANDO RLS ===
   NOTICE: === FUNÇÕES RECRIADAS COM SUCESSO ===
   ```

### 2. 🔄 **TESTAR A PÁGINA DE CHECK-IN**

**📍 ANTES DE TESTAR:**

1. **Certifique-se que você tem:**
   - ✅ Conta de organizador criada
   - ✅ Pelo menos 1 evento aprovado
   - ✅ Pelo menos 1 ingresso vendido para esse evento

2. **Se não tiver dados de teste:**
   ```sql
   -- Execute no SQL Editor do Supabase para criar dados de teste:
   
   -- 1. Verificar seu user_id
   SELECT auth.uid() as meu_user_id;
   
   -- 2. Criar evento de teste (substitua SEU_USER_ID)
   INSERT INTO events (title, description, start_date, location, organizer_id, status, price, category)
   VALUES (
     'Evento de Teste Check-in',
     'Evento para testar o sistema de check-in',
     '2024-02-15 20:00:00',
     'Local de Teste',
     'SEU_USER_ID',  -- Substitua pelo seu user_id
     'approved',
     50.00,
     'teste'
   );
   
   -- 3. Criar ingresso de teste
   INSERT INTO tickets (event_id, name, price, quantity)
   SELECT id, 'Ingresso Padrão', 50.00, 100
   FROM events 
   WHERE title = 'Evento de Teste Check-in'
   LIMIT 1;
   
   -- 4. Criar participante de teste
   INSERT INTO ticket_users (ticket_id, name, email, document, phone)
   SELECT t.id, 'João Silva', 'joao@teste.com', '123.456.789-00', '(11) 99999-9999'
   FROM tickets t
   INNER JOIN events e ON t.event_id = e.id
   WHERE e.title = 'Evento de Teste Check-in'
   LIMIT 1;
   ```

### 3. 🧪 **TESTANDO AS FUNCIONALIDADES**

**📍 ACESSE A PÁGINA:**
- Vá para: `/checkin`
- Faça login como organizador

**📍 O QUE DEVE FUNCIONAR:**

1. **✅ Carregamento do Evento:**
   - Deve mostrar o nome do evento no topo
   - Estatísticas: "X participantes, Y check-ins"

2. **✅ Lista de Participantes:**
   - Deve mostrar participantes com dados completos
   - Status de check-in (verde = feito, cinza = pendente)

3. **✅ Busca Manual:**
   - Digite nome, email, CPF ou telefone
   - Deve filtrar a lista em tempo real

4. **✅ Botões de Check-in:**
   - Clique em "Check-in" de um participante
   - Deve mostrar modal de sucesso/erro

5. **✅ Scanner QR (se funcionar):**
   - Clique no botão rosa "Scanner QR"
   - Deve abrir câmera (permita acesso)

6. **✅ Botões de Teste:**
   - "Teste Sucesso" = Modal verde
   - "Teste Aviso" = Modal amarelo  
   - "Teste Erro" = Modal vermelho

### 4. 🐛 **PROBLEMAS COMUNS E SOLUÇÕES**

#### **❌ "Função de busca não encontrada"**
**Solução:** Execute o script SQL novamente

#### **❌ "Nenhum evento aprovado encontrado"**
**Soluções:**
1. Verifique se tem eventos com `status = 'approved'`
2. Execute: `UPDATE events SET status = 'approved' WHERE organizer_id = auth.uid();`

#### **❌ "Nenhum participante encontrado"**
**Soluções:**
1. Verifique se tem ingressos vendidos
2. Use o script de dados de teste acima

#### **❌ "Erro ao processar check-in"**
**Soluções:**
1. Verifique se a tabela `checkin` existe
2. Execute: `CREATE TABLE IF NOT EXISTS checkin (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, ticket_user_id UUID, event_id UUID, organizer_id UUID, created_at TIMESTAMP DEFAULT NOW());`

#### **❌ Modal não aparece**
**Soluções:**
1. Teste os botões "Teste Sucesso/Aviso/Erro"
2. Abra DevTools (F12) e veja se há erros no Console

### 5. 📊 **LOGS DE DEBUG**

**📍 ABRA O CONSOLE DO NAVEGADOR (F12):**

Você deve ver logs como:
```
🔍 Buscando evento atual para organizador: uuid-do-user
📅 Todos os eventos encontrados: [...]
✅ Eventos aprovados: [...]
✅ Evento selecionado: {...}
🔍 Buscando participantes...
✅ Dados recebidos da função RPC: [...]
📊 Estatísticas atualizadas: {...}
```

**❌ Se vir erros:**
- Copie e cole no chat para análise
- Inclua o erro completo da função RPC

### 6. 🎯 **RESULTADO ESPERADO**

Após seguir todos os passos, você deve ter:

✅ **Página carregando sem erros**
✅ **Lista de participantes visível**
✅ **Busca funcionando**
✅ **Check-in funcionando com modais**
✅ **Estatísticas atualizando**
✅ **Scanner QR disponível**

### 7. 🚨 **SE AINDA NÃO FUNCIONAR**

Execute este diagnóstico no SQL Editor:

```sql
-- DIAGNÓSTICO COMPLETO
SELECT 'Funções RPC' as tipo, routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%checkin%' OR routine_name LIKE '%participant%';

SELECT 'Eventos' as tipo, COUNT(*) as total, 
       COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprovados
FROM events WHERE organizer_id = auth.uid();

SELECT 'Participantes' as tipo, COUNT(*) as total
FROM ticket_users tu
INNER JOIN tickets t ON tu.ticket_id = t.id
INNER JOIN events e ON t.event_id = e.id
WHERE e.organizer_id = auth.uid();

SELECT 'Check-ins' as tipo, COUNT(*) as total
FROM checkin WHERE organizer_id = auth.uid();
```

**📞 Compartilhe o resultado deste diagnóstico se precisar de ajuda.**

---

## 🎉 **OUTRAS CORREÇÕES IMPLEMENTADAS**

### ✅ **PÁGINA DE CHECKOUT:**
- ❌ Removido emojis dos detalhes do usuário
- ❌ Removido total do botão "Finalizar Compra"
- ✅ Botão agora mostra apenas "Finalizar Compra"

### ✅ **MODAL DE CRIAÇÃO DE EVENTOS:**
- ❌ Removido emojis das categorias
- ✅ Categorias agora mostram apenas texto limpo

---

**🎯 EXECUTE O SCRIPT SQL PRIMEIRO, DEPOIS TESTE A PÁGINA DE CHECK-IN!**