# 🎪 INSTRUÇÕES PARA CORRIGIR MODAL DE EVENTOS

## ❌ PROBLEMAS IDENTIFICADOS E SOLUÇÕES

### 1. 🖼️ **ERRO DE UPLOAD DE IMAGEM (Status 400)**

#### **❌ Problema:**
```
Failed to load resource: the server responded with a status of 400
Erro no upload: Object
```

#### **✅ SOLUÇÕES IMPLEMENTADAS:**

1. **Sanitização de nomes de arquivo:**
   - Remove caracteres especiais e espaços
   - Converte para lowercase
   - Evita problemas de encoding

2. **Criação automática do bucket:**
   - Verifica se bucket 'event-images' existe
   - Cria automaticamente se necessário
   - Configura permissões adequadas

3. **Aumento do limite para 5MB:**
   - Limite aumentado de 2MB para 5MB
   - Suporte a WebP adicionado
   - Validações melhoradas

4. **Logs detalhados:**
   - Console logs para debug
   - Mensagens de erro específicas
   - Progress tracking melhorado

### 2. 🖥️ **TELA BRANCA AO CLICAR EM "PRÓXIMO"**

#### **❌ Problema:**
Modal ficava em branco ao avançar etapas

#### **✅ SOLUÇÕES IMPLEMENTADAS:**

1. **Validação por etapa:**
   - Função `validateCurrentStep()` implementada
   - Validações específicas para cada seção
   - Mensagens de erro claras

2. **Navegação segura:**
   - Função `goToNextStep()` com validação
   - Prevenção de avanço sem dados obrigatórios
   - Confirmações para campos opcionais

3. **Estados controlados:**
   - Reset de estados em caso de erro
   - Limpeza de preview de imagem
   - Input file resetado após upload

### 3. 📱 **MELHORIAS MOBILE**

#### **✅ RESPONSIVIDADE APRIMORADA:**

1. **Layout adaptativo:**
   - Padding reduzido em mobile (`p-2 sm:p-4`)
   - Altura máxima ajustada (`max-h-[95vh]`)
   - Progress bar menor em mobile

2. **Textos responsivos:**
   - Títulos menores em mobile (`text-lg sm:text-2xl`)
   - Botões com texto adaptado
   - Ícones redimensionados

3. **Espaçamento otimizado:**
   - Gaps reduzidos em mobile (`gap-2 sm:gap-3`)
   - Padding interno ajustado
   - Área de conteúdo maximizada

### 4. 🗃️ **ATUALIZAÇÃO DA TABELA EVENTS**

#### **✅ NOVAS COLUNAS ADICIONADAS:**

1. **Metadados de imagem:**
   - `image_size` (INTEGER) - Tamanho em bytes
   - `image_format` (TEXT) - Formato do arquivo

2. **Dados estendidos:**
   - `subcategory` (TEXT) - Subcategoria do evento
   - `end_date` (TIMESTAMP) - Data de término
   - `address` (TEXT) - Endereço completo
   - `location_type` (TEXT) - Tipo de local

3. **Auditoria:**
   - `created_by` (UUID) - Quem criou
   - `updated_at` (TIMESTAMP) - Última atualização

## 🚀 **COMO APLICAR AS CORREÇÕES**

### **1. 📝 EXECUTAR SCRIPT SQL:**

```sql
-- Copie TODO o conteúdo do arquivo: update_events_table.sql
-- Cole no SQL Editor do Supabase
-- Execute o script
```

### **2. 🔧 CONFIGURAR STORAGE (SE NECESSÁRIO):**

1. **Acesse Supabase Dashboard:**
   - Vá para Storage > Buckets
   - Verifique se 'event-images' existe

2. **Se não existir, configure:**
   ```
   Nome: event-images
   Public: ✅ Sim
   File size limit: 5MB
   Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
   ```

3. **Políticas RLS:**
   ```sql
   -- Permitir upload para usuários autenticados
   CREATE POLICY "Authenticated users can upload images" ON storage.objects
   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   
   -- Permitir visualização pública
   CREATE POLICY "Public can view images" ON storage.objects
   FOR SELECT USING (bucket_id = 'event-images');
   ```

### **3. 🧪 TESTAR FUNCIONALIDADES:**

#### **✅ TESTE DE UPLOAD:**
1. Abra modal de criação de evento
2. Tente fazer upload de uma imagem
3. Verifique se preview aparece
4. Confirme se não há erros 400

#### **✅ TESTE DE NAVEGAÇÃO:**
1. Preencha etapa 1 (nome + assunto obrigatórios)
2. Clique "Próximo" - deve avançar
3. Teste com campos vazios - deve mostrar erro
4. Teste todas as 5 etapas

#### **✅ TESTE MOBILE:**
1. Abra em dispositivo móvel ou DevTools
2. Verifique se modal se adapta à tela
3. Teste navegação entre etapas
4. Confirme se textos estão legíveis

## 🐛 **TROUBLESHOOTING**

### **❌ Ainda erro 400 no upload:**

1. **Verificar bucket:**
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'event-images';
   ```

2. **Verificar políticas:**
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'event-images';
   ```

3. **Logs do navegador:**
   - Abra DevTools (F12)
   - Vá para Network
   - Tente upload e veja detalhes do erro

### **❌ Tela ainda fica branca:**

1. **Console do navegador:**
   - Procure por erros JavaScript
   - Verifique se `validateCurrentStep` está funcionando

2. **Dados obrigatórios:**
   - Etapa 1: Nome + Assunto
   - Etapa 2: Todas as datas/horas
   - Etapa 4: Cidade/Estado (se físico)

### **❌ Layout quebrado no mobile:**

1. **Forçar refresh:**
   - Ctrl+F5 ou Cmd+Shift+R
   - Limpar cache do navegador

2. **Verificar viewport:**
   - DevTools > Toggle device toolbar
   - Testar diferentes tamanhos

## 📊 **MELHORIAS IMPLEMENTADAS**

### **✅ UPLOAD DE IMAGEM:**
- ✅ Limite aumentado para 5MB
- ✅ Suporte a WebP
- ✅ Sanitização de nomes
- ✅ Criação automática de bucket
- ✅ Logs detalhados
- ✅ Mensagens de erro específicas
- ✅ Reset automático após upload

### **✅ VALIDAÇÃO DE ETAPAS:**
- ✅ Validação por seção
- ✅ Campos obrigatórios marcados
- ✅ Confirmações para opcionais
- ✅ Validação de datas lógicas
- ✅ Validação de ingressos

### **✅ RESPONSIVIDADE:**
- ✅ Layout mobile otimizado
- ✅ Textos adaptativos
- ✅ Espaçamento inteligente
- ✅ Altura dinâmica
- ✅ Progress bar responsivo

### **✅ BANCO DE DADOS:**
- ✅ Novas colunas adicionadas
- ✅ Índices para performance
- ✅ Trigger para updated_at
- ✅ Políticas RLS atualizadas
- ✅ Migração de dados existentes

## 🎯 **RESULTADO ESPERADO**

Após aplicar todas as correções:

✅ **Upload de imagem funcionando** sem erros 400
✅ **Navegação entre etapas** sem tela branca
✅ **Layout mobile** otimizado e responsivo
✅ **Validações** em tempo real funcionando
✅ **Banco de dados** atualizado com novas funcionalidades
✅ **Storage** configurado corretamente
✅ **Performance** melhorada com índices

---

**🚀 EXECUTE O SCRIPT SQL PRIMEIRO, DEPOIS TESTE O MODAL!**