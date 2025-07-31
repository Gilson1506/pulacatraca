import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================================
// TYPES
// ============================================================================

export interface EventData {
  title: string
  description: string
  price: number
  currency?: string
  event_date: string
  location?: string
  max_attendees?: number
  category?: string
  images?: string[]
  ticket_types?: TicketType[]
}

export interface TicketType {
  name: string
  price: number
  description?: string
  quantity?: number
}

export interface CheckoutData {
  event_id: string
  ticket_type_id: string
  quantity?: number
  success_url: string
  cancel_url: string
  customer_info?: {
    name?: string
    phone?: string
  }
}

export interface CreateEventResponse {
  success: boolean
  event: {
    id: string
    title: string
    stripe_product_id: string
    prices: Array<{
      stripe_price_id: string
      ticket_type: string
      price: number
      description: string
      quantity_available: number | null
    }>
  }
  message: string
}

export interface CheckoutResponse {
  success: boolean
  checkout_url: string
  transaction_id: string
  session_id: string
  expires_at: number
  message: string
}

export interface SubscriptionAction {
  action: 'create' | 'cancel' | 'update' | 'reactivate'
  priceId?: string
  subscriptionId?: string
}

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

/**
 * Cria um evento no app e gera produto correspondente no Stripe
 */
export async function createEventWithStripeProduct(eventData: EventData): Promise<CreateEventResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Usuário não autenticado')
    }

    const response = await supabase.functions.invoke('create-event-product', {
      body: eventData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.data
  } catch (error) {
    console.error('Erro ao criar evento:', error)
    throw error
  }
}

/**
 * Busca eventos ativos disponíveis
 */
export async function getActiveEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_ticket_types(*)
      `)
      .eq('status', 'active')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar eventos:', error)
    throw error
  }
}

/**
 * Busca detalhes de um evento específico
 */
export async function getEventDetails(eventId: string) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_ticket_types(*),
        tickets(
          id,
          status,
          ticket_code,
          created_at
        )
      `)
      .eq('id', eventId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar detalhes do evento:', error)
    throw error
  }
}

// ============================================================================
// CHECKOUT E PAGAMENTOS
// ============================================================================

/**
 * Cria uma sessão de checkout para compra de ingressos
 */
export async function createCheckoutSession(checkoutData: CheckoutData): Promise<CheckoutResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Usuário não autenticado')
    }

    const response = await supabase.functions.invoke('create-checkout-session', {
      body: checkoutData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.data
  } catch (error) {
    console.error('Erro ao criar checkout:', error)
    throw error
  }
}

/**
 * Cria um Payment Intent para pagamentos diretos
 */
export async function createPaymentIntent(amount: number, metadata: Record<string, string> = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Usuário não autenticado')
    }

    const response = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount,
        metadata,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.data
  } catch (error) {
    console.error('Erro ao criar Payment Intent:', error)
    throw error
  }
}

// ============================================================================
// ASSINATURAS
// ============================================================================

/**
 * Gerencia assinaturas (criar, cancelar, atualizar, reativar)
 */
export async function manageSubscription(action: SubscriptionAction) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Usuário não autenticado')
    }

    const response = await supabase.functions.invoke('create-subscription', {
      body: action,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.data
  } catch (error) {
    console.error('Erro ao gerenciar assinatura:', error)
    throw error
  }
}

/**
 * Acessa o portal do cliente Stripe
 */
export async function getCustomerPortalUrl(returnUrl: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Usuário não autenticado')
    }

    const response = await supabase.functions.invoke('get-customer-portal', {
      body: { returnUrl },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.data
  } catch (error) {
    console.error('Erro ao acessar portal do cliente:', error)
    throw error
  }
}

// ============================================================================
// CONSULTAS E HISTÓRICO
// ============================================================================

/**
 * Busca transações do usuário
 */
export async function getUserTransactions() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        events(title, event_date, location),
        event_ticket_types(ticket_type, price),
        ticket_purchases(
          *,
          tickets(ticket_code, status, used_at)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    throw error
  }
}

/**
 * Busca ingressos do usuário
 */
export async function getUserTickets() {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events(title, event_date, location, images),
        event_ticket_types(ticket_type, price),
        ticket_purchases(quantity, total_amount)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar ingressos:', error)
    throw error
  }
}

/**
 * Busca assinaturas do usuário
 */
export async function getUserSubscriptions() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error)
    throw error
  }
}

/**
 * Busca eventos criados pelo usuário
 */
export async function getUserCreatedEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_ticket_types(*),
        _count_tickets:tickets(count),
        _count_sales:ticket_purchases(count)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar eventos criados:', error)
    throw error
  }
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Formata valor monetário em BRL
 */
export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Formata data para exibição
 */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Verifica se um evento já passou
 */
export function isEventPast(eventDate: string): boolean {
  return new Date(eventDate) < new Date()
}

/**
 * Calcula quantos ingressos restam para um tipo específico
 */
export function getAvailableTickets(ticketType: any, soldTickets: number = 0): number | null {
  if (ticketType.quantity_available === null) {
    return null // Unlimited
  }
  return Math.max(0, ticketType.quantity_available - soldTickets)
}

// ============================================================================
// HOOKS PARA REACT (opcional)
// ============================================================================

/**
 * Hook para monitorar mudanças em tempo real
 */
export function useRealtimeSubscription(table: string, callback: (payload: any) => void) {
  const channel = supabase
    .channel(`public:${table}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table }, 
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}