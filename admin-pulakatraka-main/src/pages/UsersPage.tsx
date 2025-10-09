import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, UserCheck, UserX, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserFormModal from '../components/Dashboard/UserFormModal';
import UserDetailsModal from '../components/Dashboard/UserDetailsModal';
import ConfirmModal from '../components/Dashboard/ConfirmModal';

// Interface para usuários do admin (compatível com o banco)
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'organizer' | 'user';
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

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'activate' | 'deactivate';
    userId: string;
    userName: string;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log('Buscando usuários...');
      
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
      }

      console.log('Usuários encontrados:', users);
      console.log('Número de usuários:', users?.length || 0);

      // Mapear os usuários para o formato AdminUser
      const formattedUsers: AdminUser[] = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        last_login: user.last_login,
        is_verified: user.is_verified,
        is_active: user.is_active,
        phone: user.phone,
        company_name: user.company_name,
        cnpj: user.cnpj,
        cpf: user.cpf,
        address: user.address,
        city: user.city,
        state: user.state,
        postal_code: user.postal_code
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700';
      case 'organizer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      case 'user': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'organizer': return 'Organizador';
      case 'user': return 'Usuário';
      default: return role;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700'
      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Ativo' : 'Inativo';
  };

  const handleCreateUser = async (userData: Record<string, unknown>) => {
    try {
      console.log('Criando usuário:', userData);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          phone: userData.phone,
          company_name: userData.company_name,
          cnpj: userData.cnpj,
          cpf: userData.cpf,
          address: userData.address,
          city: userData.city,
          state: userData.state,
          postal_code: userData.postal_code,
          is_verified: userData.is_verified || false,
          is_active: userData.is_active || true
        })
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado ao criar usuário:', error);
        throw error;
      }

      console.log('Usuário criado com sucesso:', data);

      // Recarregar usuários
      await fetchUsers();
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário. Verifique o console para mais detalhes.');
    }
  };

  const handleUpdateUser = async (userData: Record<string, unknown>) => {
    try {
      console.log('Atualizando usuário:', userData);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          phone: userData.phone,
          company_name: userData.company_name,
          cnpj: userData.cnpj,
          cpf: userData.cpf,
          address: userData.address,
          city: userData.city,
          state: userData.state,
          postal_code: userData.postal_code,
          is_verified: userData.is_verified,
          is_active: userData.is_active
        })
        .eq('id', userData.id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado ao atualizar usuário:', error);
        throw error;
      }

      console.log('Usuário atualizado com sucesso:', data);

      // Recarregar usuários
      await fetchUsers();
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário. Verifique o console para mais detalhes.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      console.log('Deletando usuário:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Erro detalhado ao deletar usuário:', error);
        throw error;
      }

      console.log('Usuário deletado com sucesso');

      // Recarregar usuários
      await fetchUsers();
      setIsConfirmModalOpen(false);
      setConfirmAction(null);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      alert('Erro ao deletar usuário. Verifique o console para mais detalhes.');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      console.log('Alterando status do usuário:', userId, 'Ativo:', isActive);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          is_active: isActive
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado ao alterar status do usuário:', error);
        throw error;
      }

      console.log('Status do usuário alterado com sucesso:', data);

      // Recarregar usuários
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      alert('Erro ao alterar status do usuário. Verifique o console para mais detalhes.');
    }
  };

  const handleOpenFormModal = (user?: AdminUser) => {
    setSelectedUser(user || null);
    setIsFormModalOpen(true);
  };

  const handleOpenDetailsModal = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleOpenConfirmModal = (type: 'delete' | 'activate' | 'deactivate', user: AdminUser) => {
    setConfirmAction({
      type,
      userId: user.id,
      userName: user.name
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      switch (confirmAction.type) {
        case 'delete':
          await handleDeleteUser(confirmAction.userId);
          break;
        case 'activate':
          await handleToggleUserStatus(confirmAction.userId, true);
          break;
        case 'deactivate':
          await handleToggleUserStatus(confirmAction.userId, false);
          break;
      }
    } catch (error) {
      console.error('Erro na ação confirmada:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie contas de usuários, organizadores e administradores.</p>
        </div>
        <button
          onClick={() => handleOpenFormModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Todos os Tipos</option>
            <option value="admin">Administrador</option>
            <option value="organizer">Organizador</option>
            <option value="user">Usuário</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Usuário</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contato</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Verificado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>{user.phone || 'N/A'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {user.city && user.state ? `${user.city}, ${user.state}` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(user.is_active)}`}>
                      {getStatusText(user.is_active)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${user.is_verified ? getStatusColor(true) : getStatusColor(false)}`}>
                      {user.is_verified ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleOpenDetailsModal(user)} 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg" 
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenFormModal(user)} 
                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/50 rounded-lg" 
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.is_active ? (
                        <button 
                          onClick={() => handleOpenConfirmModal('deactivate', user)} 
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg" 
                          title="Desativar"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenConfirmModal('activate', user)} 
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg" 
                          title="Ativar"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenConfirmModal('delete', user)} 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg" 
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
      
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={selectedUser ? handleUpdateUser : handleCreateUser}
        userToEdit={selectedUser}
      />
      
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        user={selectedUser}
      />
      
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmAction}
        title={
          confirmAction?.type === 'delete' ? 'Deletar Usuário' :
          confirmAction?.type === 'activate' ? 'Ativar Usuário' :
          'Desativar Usuário'
        }
        message={
          confirmAction?.type === 'delete' ? `Tem certeza que deseja deletar o usuário "${confirmAction?.userName}"?` :
          confirmAction?.type === 'activate' ? `Tem certeza que deseja ativar o usuário "${confirmAction?.userName}"?` :
          `Tem certeza que deseja desativar o usuário "${confirmAction?.userName}"?`
        }
      />
    </div>
  );
}