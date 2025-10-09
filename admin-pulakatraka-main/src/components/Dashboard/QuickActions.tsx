import React from 'react';
import { Users, Calendar, MessageCircle, BarChart3, Settings, DollarSign, Ticket, Eye, CreditCard } from 'lucide-react';

const actions = [
  {
    label: 'Novo Usuário',
    icon: Users,
    color: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700',
    action: 'create-user'
  },
  {
    label: 'Aprovar Evento',
    icon: Calendar,
    color: 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700',
    action: 'approve-event'
  },
  {
    label: 'Visualizar Finanças',
    icon: DollarSign,
    color: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700',
    action: 'view-financials'
  },
  {
    label: 'Visualizar Ingressos',
    icon: Ticket,
    color: 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700',
    action: 'view-tickets'
  },
  {
    label: 'Chat Suporte',
    icon: MessageCircle,
    color: 'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700',
    action: 'open-chat'
  },
  {
    label: 'Gerar Relatório',
    icon: BarChart3,
    color: 'bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700',
    action: 'generate-report'
  },
  {
    label: 'Configurações',
    icon: Settings,
    color: 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700',
    action: 'open-settings'
  }
];

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Ações Rápidas</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {actions.map((action) => (
          <button
            key={action.action}
            onClick={() => onAction(action.action)}
            className={`${action.color} text-white p-4 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95`}
          >
            <action.icon className="w-6 h-6 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}