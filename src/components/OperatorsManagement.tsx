import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit3, Key, Activity, Users, AlertCircle, CheckCircle, XCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EventOperator } from '../types/supabase';
import ProfessionalLoader from './ProfessionalLoader';

interface OperatorsManagementProps {
  organizerId: string;
}

const OperatorsManagement: React.FC<OperatorsManagementProps> = ({ organizerId }) => {
  const [operators, setOperators] = useState<EventOperator[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<EventOperator | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    event_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchOperators();
    fetchEvents();
  }, [organizerId]);

  const fetchOperators = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_organizer_operators', {
        p_organizer_id: organizerId,
        p_include_inactive: true
      });

      if (error) throw error;
      setOperators(data || []);
    } catch (error: any) {
      showToast('error', `Erro ao carregar operadores: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_date, status')
        .eq('organizer_id', organizerId)
        .eq('status', 'approved')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar eventos:', error);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase.rpc('create_event_operator', {
        p_organizer_id: organizerId,
        p_event_id: formData.event_id || null,
        p_name: formData.name,
        p_email: formData.email || null,
        p_phone: formData.phone || null,
        p_notes: formData.notes || null
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        showToast('success', result.message);
        setShowCreateModal(false);
        resetForm();
        fetchOperators();
      } else {
        showToast('error', result.message);
      }
    } catch (error: any) {
      showToast('error', `Erro ao criar operador: ${error.message}`);
    }
  };

  const handleUpdateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperator) return;

    try {
      const { data, error } = await supabase.rpc('update_event_operator', {
        p_operator_id: selectedOperator.id,
        p_organizer_id: organizerId,
        p_name: formData.name,
        p_email: formData.email || null,
        p_phone: formData.phone || null,
        p_notes: formData.notes || null
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        showToast('success', result.message);
        setShowEditModal(false);
        setSelectedOperator(null);
        resetForm();
        fetchOperators();
      } else {
        showToast('error', result.message);
      }
    } catch (error: any) {
      showToast('error', `Erro ao atualizar operador: ${error.message}`);
    }
  };

  const handleDeleteOperator = async (operatorId: string) => {
    if (!confirm('Tem certeza que deseja remover este operador?')) return;

    try {
      const { data, error } = await supabase.rpc('delete_event_operator', {
        p_operator_id: operatorId,
        p_organizer_id: organizerId
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        showToast('success', result.message);
        fetchOperators();
      } else {
        showToast('error', result.message);
      }
    } catch (error: any) {
      showToast('error', `Erro ao remover operador: ${error.message}`);
    }
  };

  const handleToggleActive = async (operator: EventOperator) => {
    try {
      const { data, error } = await supabase.rpc('update_event_operator', {
        p_operator_id: operator.id,
        p_organizer_id: organizerId,
        p_is_active: !operator.is_active
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        showToast('success', operator.is_active ? 'Operador desativado' : 'Operador ativado');
        fetchOperators();
      } else {
        showToast('error', result.message);
      }
    } catch (error: any) {
      showToast('error', `Erro ao atualizar status: ${error.message}`);
    }
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('success', 'Código copiado!');
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', event_id: '', notes: '' });
  };

  const openEditModal = (operator: EventOperator) => {
    setSelectedOperator(operator);
    setFormData({
      name: operator.name,
      email: operator.email || '',
      phone: operator.phone || '',
      event_id: operator.event_id || '',
      notes: operator.notes || ''
    });
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ProfessionalLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Operadores de Entrada</h2>
          <p className="text-gray-600 mt-1">Gerencie os operadores que realizam check-in nos seus eventos</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Novo Operador
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total de Operadores</div>
              <div className="text-2xl font-bold text-gray-900">{operators.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Operadores Ativos</div>
              <div className="text-2xl font-bold text-gray-900">
                {operators.filter(o => o.is_active).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Check-ins Realizados</div>
              <div className="text-2xl font-bold text-gray-900">
                {operators.reduce((sum, o) => sum + o.total_checkins, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operators List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lista de Operadores</h3>
        </div>

        {operators.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum operador cadastrado</h3>
            <p className="text-gray-600 mb-4">Crie seu primeiro operador para começar</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            >
              Criar Operador
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código de Acesso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-ins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {operators.map((operator) => (
                  <tr key={operator.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{operator.name}</div>
                      {operator.last_access && (
                        <div className="text-xs text-gray-500">
                          Último acesso: {new Date(operator.last_access).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{operator.email || '-'}</div>
                      <div className="text-xs text-gray-500">{operator.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {operator.event_title || 'Todos os eventos'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1 bg-gray-100 rounded font-mono text-lg font-bold">
                          {operator.access_code}
                        </code>
                        <button
                          onClick={() => copyAccessCode(operator.access_code)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Copiar código"
                        >
                          <Copy className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{operator.total_checkins}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(operator)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          operator.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {operator.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(operator)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title="Editar"
                        >
                          <Edit3 className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteOperator(operator.id)}
                          className="p-2 hover:bg-red-100 rounded"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Novo Operador</h3>
            <form onSubmit={handleCreateOperator} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Nome do operador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evento (opcional)
                </label>
                <select
                  value={formData.event_id}
                  onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Todos os eventos</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para permitir acesso a todos os eventos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Informações adicionais..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Criar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOperator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Operador</h3>
            <form onSubmit={handleUpdateOperator} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedOperator(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorsManagement;
