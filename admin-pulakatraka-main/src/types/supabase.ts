export type UserRole = 'admin' | 'organizer' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
  is_verified: boolean;
  is_active: boolean;
  phone?: string;
  company_name?: string;
  cnpj?: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  organizer_id: string;
  start_date: string;
  end_date: string;
  location: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  image?: string;
  price: number;
  available_tickets: number;
  total_tickets: number;
  category: string;
  tags: string[];
  carousel_approved?: boolean;
  carousel_priority?: number;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string; // Comprador original
  status: 'valid' | 'used' | 'cancelled' | 'expired';
  purchase_date: string;
  price: number;
  qr_code: string;
  
  // Informações do usuário atribuído (pode ser diferente do comprador)
  assigned_user_id?: string;
  assigned_user_name?: string;
  assigned_user_email?: string;
  assigned_user_phone?: string;
  assigned_at?: string;
  assigned_by?: string;
  
  // Informações de check-in
  check_in_date?: string;
  check_in_by?: string;
  check_in_location?: string;
  
  // Informações de uso
  is_used: boolean;
  used_at?: string;
  used_by?: string;
  
  // Notas adicionais
  notes?: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  action: 'purchased' | 'assigned' | 'unassigned' | 'checked_in' | 'used' | 'cancelled' | 'status_changed';
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action_date: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'message' | 'event';
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  payment_method: string;
  payment_id?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at'>;
        Update: Partial<Omit<UserProfile, 'id'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id'>>;
      };
      tickets: {
        Row: Ticket;
        Insert: Omit<Ticket, 'id' | 'purchase_date'>;
        Update: Partial<Omit<Ticket, 'id'>>;
      };
      ticket_history: {
        Row: TicketHistory;
        Insert: Omit<TicketHistory, 'id' | 'action_date' | 'created_at'>;
        Update: Partial<Omit<TicketHistory, 'id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at'>;
        Update: Partial<Omit<ChatMessage, 'id'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id'>>;
      };
    };
  };
} 