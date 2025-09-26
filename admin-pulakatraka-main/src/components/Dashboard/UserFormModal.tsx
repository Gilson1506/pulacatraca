import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Briefcase, CheckCircle } from 'lucide-react';
import type { User as UserType } from '../../types';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<UserType, 'id' | 'created_at' | 'last_activity'>) => void;
  userToEdit?: UserType | null;
}

const initialUserData = {
  name: '',
  email: '',
  type: 'Cliente' as 'Cliente' | 'Organizador',
  status: 'Ativo' as 'Ativo' | 'Inativo' | 'Pendente',
  verified: false,
  avatar_url: '',
};

export default function UserFormModal({ isOpen, onClose, onSave, userToEdit }: UserFormModalProps) {
  const [userData, setUserData] = useState(initialUserData);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setUserData({
          name: userToEdit.name,
          email: userToEdit.email,
          type: userToEdit.type,
          status: userToEdit.status,
          verified: userToEdit.verified,
          avatar_url: userToEdit.avatar_url || '',
        });
      } else {
        setUserData(initialUserData);
      }
    }
  }, [userToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setUserData(prev => ({ ...prev, [name]: checked }));
    } else {
        setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(userData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userToEdit ? 'Editar Usuário' : 'Criar Novo Usuário'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" name="name" value={userData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="email" name="email" value={userData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Usuário</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select name="type" value={userData.type} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="Cliente">Cliente</option>
                            <option value="Organizador">Organizador</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <div className="relative">
                        <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select name="status" value={userData.status} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                            <option value="Pendente">Pendente</option>
                        </select>
                    </div>
                </div>
            </div>
            <div>
                <label className="flex items-center space-x-2">
                    <input type="checkbox" name="verified" checked={userData.verified} onChange={handleChange} className="rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-transparent" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Verificado</span>
                </label>
            </div>
            <div className="pt-4">
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                >
                    <Save className="w-5 h-5" />
                    <span>{userToEdit ? 'Salvar Alterações' : 'Criar Usuário'}</span>
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 