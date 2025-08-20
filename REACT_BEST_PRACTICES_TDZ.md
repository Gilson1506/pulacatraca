# 🚀 Guia: Evitando Erros "Cannot access before initialization" em React

## 📋 Resumo do Problema

O erro **"ReferenceError: Cannot access 'X' before initialization"** ocorre devido ao **Temporal Dead Zone (TDZ)** do JavaScript, quando variáveis declaradas com `const` ou `let` são acessadas antes de serem inicializadas.

## 🔍 Principais Causas

### 1. **Variáveis usadas antes da declaração**
```javascript
// ❌ PROBLEMA
console.log(titulo); // ReferenceError
const titulo = "Meu Evento";

// ✅ SOLUÇÃO
const titulo = "Meu Evento";
console.log(titulo); // Funciona
```

### 2. **Hooks do React fora de ordem**
```javascript
// ❌ PROBLEMA
function ComponenteProblema() {
  const handleClick = () => {
    setTitulo("Novo"); // ❌ useState ainda não foi declarado
  };
  
  const [titulo, setTitulo] = useState(""); // ❌ Muito tarde
  
  return <button onClick={handleClick}>{titulo}</button>;
}

// ✅ SOLUÇÃO
function ComponenteCorreto() {
  const [titulo, setTitulo] = useState(""); // ✅ Hooks primeiro
  
  const handleClick = () => {
    setTitulo("Novo"); // ✅ Agora funciona
  };
  
  return <button onClick={handleClick}>{titulo}</button>;
}
```

### 3. **Arrow Functions com minificação problemática**
```javascript
// ❌ PROBLEMA (pode causar TDZ na minificação)
const result = tickets.map(t => t.price);

// ✅ SOLUÇÃO (mais seguro para minificação)
const result = tickets.map(function(ticket) {
  return ticket.price;
});
```

### 4. **IIFE (Immediately Invoked Function Expression) problemáticas**
```javascript
// ❌ PROBLEMA
const config = {
  maxValue: (() => {
    const values = data.map(t => t.value); // 't' pode causar TDZ
    return Math.max(...values);
  })()
};

// ✅ SOLUÇÃO
const calculateMaxValue = (data) => {
  const values = data.map(function(item) {
    return item.value;
  });
  return Math.max(...values);
};

const config = {
  maxValue: calculateMaxValue(data)
};
```

## 📏 Ordem Correta em Componentes React

```javascript
import React, { useState, useEffect, useRef } from 'react';

function ComponenteCorreto() {
  // 1. ✅ Hooks primeiro (sempre no topo)
  const [estado1, setEstado1] = useState("");
  const [estado2, setEstado2] = useState([]);
  const [loading, setLoading] = useState(false);
  const refInput = useRef(null);
  
  // 2. ✅ Variáveis derivadas (depois dos hooks)
  const dadosProcessados = useMemo(() => {
    return estado2.map(function(item) {
      return { ...item, processed: true };
    });
  }, [estado2]);
  
  // 3. ✅ Funções de manipulação
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Lógica aqui
    } finally {
      setLoading(false);
    }
  };
  
  // 4. ✅ useEffect no final
  useEffect(() => {
    // Inicialização
  }, []);
  
  // 5. ✅ Render
  return (
    <div>
      {/* JSX aqui */}
    </div>
  );
}
```

## 🛠️ Padrões Seguros para Criação de Eventos

### ✅ Estrutura Recomendada
```javascript
function CreateEventForm() {
  // 1. Estados primeiro
  const [title, setTitle] = useState("");
  const [tickets, setTickets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 2. Funções auxiliares
  const validateForm = () => {
    if (!title.trim()) {
      alert("Título é obrigatório");
      return false;
    }
    return true;
  };
  
  const processTickets = (ticketList) => {
    return ticketList.map(function(ticket) {
      return {
        id: ticket.id,
        name: ticket.title,
        price: ticket.price || 0,
        quantity: ticket.quantity || 1
      };
    });
  };
  
  // 3. Handler principal
  const handleCreateEvent = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const processedTickets = processTickets(tickets);
      const eventData = {
        title: title.trim(),
        tickets: processedTickets,
        createdAt: new Date().toISOString()
      };
      
      // Criar evento
      await createEvent(eventData);
      
    } catch (error) {
      console.error("Erro ao criar evento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleCreateEvent(); }}>
      {/* Form fields */}
    </form>
  );
}
```

## 🚨 Evite Estes Padrões

### ❌ Não faça isso:
```javascript
// Hooks condicionais
if (condition) {
  const [state, setState] = useState(""); // ❌ Hook condicional
}

// Variáveis antes da declaração
console.log(myVar); // ❌ 
const myVar = "value";

// Arrow functions com nomes muito curtos em produção
items.map(t => t.id); // ❌ 't' pode causar problemas na minificação

// IIFE complexas inline
const value = (() => {
  const x = data.map(t => t.val); // ❌ Possível TDZ
  return x[0];
})();
```

### ✅ Faça isso:
```javascript
// Hooks sempre no topo
const [state, setState] = useState("");

// Declaração antes do uso
const myVar = "value";
console.log(myVar);

// Funções nomeadas para melhor debugging
items.map(function(item) {
  return item.id;
});

// Funções auxiliares separadas
const processData = (data) => {
  return data.map(function(item) {
    return item.val;
  });
};
const value = processData(data)[0];
```

## 🎯 Checklist de Verificação

- [ ] Todos os hooks estão no topo do componente?
- [ ] Variáveis são declaradas antes de serem usadas?
- [ ] Arrow functions usam nomes descritivos em vez de letras únicas?
- [ ] Não há imports circulares?
- [ ] Funções complexas estão separadas em funções auxiliares?
- [ ] Estados são inicializados com valores padrão apropriados?

## 🔧 Ferramentas de Prevenção

1. **ESLint** - Configurar regras para detectar problemas de TDZ
2. **TypeScript** - Ajuda a detectar problemas de inicialização
3. **React DevTools** - Para debuggar estados e props
4. **Source Maps** - Para debuggar código minificado

Seguindo essas práticas, você evitará a maioria dos erros de "Cannot access before initialization" em seus projetos React.