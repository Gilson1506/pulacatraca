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
  banner_url?: string;
  price: number;
  available_tickets: number;
  total_tickets: number;
  category: string;
  tags: string[];
}

export interface TicketUser {
  id: string;
  name: string;
  email: string;
  document?: string; // CPF ou outro documento
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string; // Comprador (buyer)
  ticket_user_id?: string; // Usuário do ingresso (pode ser diferente do comprador)
  status: 'valid' | 'used' | 'cancelled' | 'expired' | 'pending' | 'active';
  purchase_date: string;
  price: number;
  qr_code: string;
  check_in_date?: string;
  ticket_user?: TicketUser; // Dados do usuário do ingresso
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

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SecurityLog {
  id: string;
  user_id?: string;
  event_type: string;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface UserSetting {
  id: string;
  user_id: string;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason?: string;
  blocked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  ticket_user_id: string;
  event_id: string;
  organizer_id: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface ParticipantSearchResult {
  ticket_user_id: string;
  name: string;
  email: string;
  document?: string;
  ticket_id: string;
  ticket_type: string;
  already_checked_in: boolean;
  checkin_date?: string;
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
      ticket_users: {
        Row: TicketUser;
        Insert: Omit<TicketUser, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TicketUser, 'id'>>;
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
      system_settings: {
        Row: SystemSetting;
        Insert: Omit<SystemSetting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SystemSetting, 'id'>>;
      };
      security_logs: {
        Row: SecurityLog;
        Insert: Omit<SecurityLog, 'id' | 'created_at'>;
        Update: Partial<Omit<SecurityLog, 'id'>>;
      };
      user_settings: {
        Row: UserSetting;
        Insert: Omit<UserSetting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSetting, 'id'>>;
      };
      blocked_ips: {
        Row: BlockedIP;
        Insert: Omit<BlockedIP, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BlockedIP, 'id'>>;
      };
      checkin: {
        Row: CheckIn;
        Insert: Omit<CheckIn, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CheckIn, 'id'>>;
      };
    };
  };
} 