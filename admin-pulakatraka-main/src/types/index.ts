export interface User {
  id: string;
  name: string;
  email: string;
  type: 'Organizador' | 'Cliente';
  status: 'Ativo' | 'Inativo' | 'Pendente';
  created_at: string;
  last_activity: string;
  verified: boolean;
  avatar_url?: string;
}

export interface Event {
  id: string;
  title: string;
  organizer: string;
  category: string;
  date: string;
  location: string;
  status: 'Aprovado' | 'Pendente' | 'Rejeitado' | 'Ativo';
  carousel_approved: boolean;
  carousel_priority: number;
  tickets_sold: number;
  total_tickets: number;
  revenue: number;
  image_url: string;
  description: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  price: number;
  status: 'Pago' | 'Pendente' | 'Cancelado';
  purchaseDate: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  status: 'Aberto' | 'Em Andamento' | 'Resolvido' | 'Fechado';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  category: 'Conta' | 'Pagamento' | 'Evento' | 'Ingresso' | 'Técnico' | 'Outro';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  last_response?: string;
  last_response_at?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  is_staff: boolean;
  attachments?: {
    url: string;
    name: string;
    type: string;
  }[];
}

export interface ChatRoom {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: 'Ativo' | 'Encerrado';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  is_staff: boolean;
  status: 'Enviado' | 'Entregue' | 'Lido';
  attachments?: {
    url: string;
    name: string;
    type: string;
  }[];
}

export interface Message {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  isSupportRep: boolean;
}

export interface FinancialData {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  commissionsOwed: number;
  withdrawalRequests: number;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  submenu?: MenuItem[];
}

export interface AnalyticsData {
  summary: {
    totalUsers: { value: number; change: number };
    totalRevenue: { value: number; change: number };
    ticketsSold: { value: number; change: number };
    conversionRate: { value: number; change: number };
    totalCommission: { value: number; change: number };
  };
  charts: {
    users: ChartData;
    revenue: ChartData;
  };
}

export interface MetricCardData {
  id: string;
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
}

export interface ChartData {
  labels: string[];
  values: number[];
}