import React from 'react';
import { X, Mail, Calendar, Briefcase, CheckCircle } from 'lucide-react';
import type { User } from '../../types';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserDetailsModal({ isOpen, onClose, user }: UserDetailsModalProps) {
  if (!isOpen || !user) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'Inativo': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'Pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
                <img 
                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                  alt={user.name} 
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(user.status)}`}>
                        {user.status}
                    </span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{user.email}</span>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Briefcase className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{user.type}</span>
                </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                    Membro desde: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </span>
            </div>
             <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                    Última atividade: {new Date(user.last_activity).toLocaleDateString('pt-BR')}
                </span>
            </div>
            {user.verified &&
                <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-800 dark:text-green-300 font-semibold">Email Verificado</span>
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
} 