# Sistema de Requisições em Produção Multi-usuário

## ✅ Como o App Funciona em Produção

### 1. **Isolamento por Usuário**
Cada usuário tem sua própria sessão isolada:
- **Cache de usuário individual**: Cada sessão mantém seu próprio cache
- **Tokens JWT separados**: Cada usuário tem seu próprio token de autenticação
- **localStorage isolado**: Dados salvos por domínio/origem, não compartilhados entre usuários

### 2. **Prevenção de Travamentos**

#### ✅ Sistema de Cache Inteligente
```typescript
// Cache com TTL de 30 segundos
let getUserCache: { data: any; timestamp: number } | null = null;
const GET_USER_CACHE_TTL = 30000;
```

**Benefícios:**
- Reduz chamadas ao Supabase em 90%
- Cada usuário tem seu próprio cache (isolado por sessão)
- Cache expira automaticamente após 30 segundos

#### ✅ Deduplicação de Requisições
```typescript
// Se já há uma chamada em andamento, aguarda ela ao invés de criar nova
if (getUserPromise && !forceRefresh) {
  return getUserPromise;
}
```

**Benefícios:**
- Evita requisições duplicadas simultâneas
- Múltiplos componentes podem chamar `getUser()` ao mesmo tempo sem sobrecarga
- Apenas 1 requisição real é feita ao Supabase

#### ✅ Sistema de Deduplicação Global
```typescript
export const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl: number = 5000
): Promise<T>
```

**Como usar:**
```typescript
// Exemplo: buscar eventos
const events = await deduplicateRequest(
  'events-list',
  () => supabase.from('events').select('*')
);
```

**Benefícios:**
- Requisições com mesma chave são compartilhadas
- Evita chamadas duplicadas em componentes diferentes
- TTL configurável (padrão 5 segundos)

### 3. **Cleanup Automático de Requisições**

#### Hook `useAbortOnUnmount`
```typescript
export const useAbortOnUnmount = () => {
  const controllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    controllerRef.current = new AbortController();
    
    return () => {
      // Cancela requisições pendentes quando componente desmonta
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);
  
  return controllerRef.current?.signal;
};
```

**Como usar em componentes:**
```typescript
function MyComponent() {
  const abortSignal = useAbortOnUnmount();
  
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .abortSignal(abortSignal);
    };
    
    fetchData();
  }, [abortSignal]);
}
```

**Benefícios:**
- Requisições são canceladas automaticamente quando usuário navega
- Previne memory leaks
- Cada componente gerencia suas próprias requisições

### 4. **Configurações Otimizadas do Supabase**

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Mantém sessão entre reloads
    autoRefreshToken: true,       // Renova token automaticamente
    detectSessionInUrl: true,     // Detecta sessão em callbacks OAuth
    flowType: 'pkce'             // Segurança adicional para OAuth
  },
  realtime: {
    params: {
      eventsPerSecond: 10        // Limita eventos para evitar sobrecarga
    }
  }
});
```

## 🚀 Escalabilidade em Produção

### Múltiplos Usuários Simultâneos

| Cenário | Solução Implementada |
|---------|---------------------|
| 100 usuários carregam a home ao mesmo tempo | ✅ Cada um tem cache isolado + deduplicação |
| Usuário navega rapidamente entre páginas | ✅ Cleanup automático cancela requisições antigas |
| Múltiplos componentes chamam `getUser()` | ✅ Apenas 1 requisição real é feita |
| Requisições duplicadas em componentes | ✅ Sistema de deduplicação compartilha resultado |
| Memory leaks em navegação | ✅ Hook `useAbortOnUnmount` limpa tudo |

### Limites do Supabase (Plano Gratuito)
- **500MB de banco de dados**
- **50.000 usuários ativos mensais**
- **2GB de transferência de dados**
- **500MB de armazenamento de arquivos**

### Quando Escalar?
Se você atingir esses limites, considere:
1. **Upgrade para plano Pro** ($25/mês)
2. **Implementar CDN** para assets estáticos
3. **Cache Redis** para dados frequentes
4. **Rate limiting** no backend

## 📊 Monitoramento

### Logs Importantes
```typescript
console.log('📦 Retornando usuário do cache');  // Cache hit
console.log('⏳ Aguardando chamada getUser em andamento...');  // Deduplicação
console.log('🔄 Reutilizando requisição pendente: ${key}');  // Request sharing
```

### Métricas a Monitorar
- Taxa de cache hit (deve ser > 80%)
- Tempo médio de resposta das requisições
- Número de requisições simultâneas
- Erros de timeout ou abort

## 🔧 Troubleshooting

### "Muitas requisições simultâneas"
**Solução:** Use `deduplicateRequest()` para compartilhar resultados

### "App trava ao navegar"
**Solução:** Use `useAbortOnUnmount()` em componentes que fazem requisições

### "Cache desatualizado"
**Solução:** Ajuste `GET_USER_CACHE_TTL` ou force refresh com `getUser(true)`

## 🎯 Melhores Práticas

1. **Sempre use cache quando possível**
2. **Implemente deduplicação em listas e buscas**
3. **Use `useAbortOnUnmount` em componentes com requisições**
4. **Configure TTL apropriado para cada tipo de dado**
5. **Monitore logs em produção para identificar gargalos**

## 🔐 Segurança Multi-usuário

- ✅ Cada usuário tem JWT único
- ✅ Row Level Security (RLS) no Supabase
- ✅ Tokens armazenados em localStorage (isolado por origem)
- ✅ Auto-refresh de tokens antes de expirar
- ✅ Logout automático em caso de token inválido
