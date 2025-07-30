import React, { useState } from 'react';
import { createTicketUser } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingButton from './LoadingButton';

interface TicketUserFormProps {
  ticketId: string;
  onSuccess: (ticket: any) => void;
  onCancel: () => void;
  isOpen?: boolean;
}

const TicketUserForm: React.FC<TicketUserFormProps> = ({ ticketId, onSuccess, onCancel, isOpen = true }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    document: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  console.log('🔍 TicketUserForm - currentUser:', currentUser);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name?.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || '')) {
      newErrors.email = 'E-mail inválido';
    }

    if (formData.document && formData.document.length > 0) {
      // Remove caracteres não numéricos para validação
      const cleanDocument = formData.document.replace(/\D/g, '');
      if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
        newErrors.document = 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userData = {
        name: formData.name?.trim() || '',
        email: formData.email?.trim().toLowerCase() || '',
        document: formData.document?.trim() || undefined
      };
      
      console.log('🔍 TicketUserForm - Enviando dados:', userData);
      console.log('🔍 TicketUserForm - formData original:', formData);
      
      // Validar se dados não estão vazios antes de enviar
      if (!userData.name || userData.name === '' || !userData.email || userData.email === '') {
        throw new Error('Dados inválidos: nome ou email vazios');
      }
      
      const ticket = await createTicketUser(ticketId, userData);

      // Passar os dados do usuário para o callback, não o ticket
      onSuccess(userData);
    } catch (error: any) {
      console.error('Erro ao definir usuário:', error);
      
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('duplicate key')) {
        setErrors({ email: 'Este e-mail já está sendo usado em outro ingresso' });
      } else if (errorMessage.includes('não está configurado')) {
        setErrors({ general: 'Sistema não configurado. Execute o script SQL no Supabase primeiro.' });
      } else if (errorMessage.includes('não encontrado')) {
        setErrors({ general: 'Ingresso não encontrado ou sem permissão.' });
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setErrors({ general: 'Tabela ticket_users não existe. Execute o script SQL primeiro.' });
      } else {
        setErrors({ general: 'Erro ao salvar dados. Tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDocument = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Formata CPF (11 dígitos) ou CNPJ (14 dígitos)
    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value);
    setFormData({ ...formData, document: formatted });
  };

  const handleUseBuyerData = () => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        document: currentUser.cpf || currentUser.cnpj || ''
      });
      setErrors({}); // Limpar erros ao preencher automaticamente
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4 text-white relative">
          <button
            onClick={onCancel}
            disabled={loading}
            className="absolute top-4 right-4 text-white hover:text-pink-200 transition-colors disabled:opacity-50"
          >
            ✕
          </button>
          <h2 className="text-xl font-bold pr-8">👤 Definir Usuário do Ingresso</h2>
          <p className="text-pink-100 text-sm mt-1">
            Informe os dados de quem irá usar este ingresso
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">⚠️ {errors.general}</p>
            </div>
          )}

          {/* Botão para usar dados do comprador */}
          {currentUser && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleUseBuyerData}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 font-medium hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="text-lg">👤</span>
                Usar meus dados ({currentUser.name})
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-100 transition-all duration-200 ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-pink-500'
                }`}
                placeholder="Digite o nome completo"
                maxLength={100}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">⚠️ {errors.name}</p>
              )}
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                E-mail *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-100 transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-pink-500'
                }`}
                placeholder="Digite o e-mail"
                maxLength={100}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">⚠️ {errors.email}</p>
              )}
            </div>

            {/* Documento */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                CPF ou CNPJ (opcional)
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={handleDocumentChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-100 transition-all duration-200 ${
                  errors.document 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-pink-500'
                }`}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
                disabled={loading}
              />
              {errors.document && (
                <p className="text-red-500 text-xs mt-1">⚠️ {errors.document}</p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="text-blue-500 text-lg">ℹ️</div>
              <div>
                <p className="text-blue-800 text-sm font-medium mb-1">
                  Importante
                </p>
                <ul className="text-blue-600 text-xs space-y-1">
                  <li>• Estes dados serão associados permanentemente ao ingresso</li>
                  <li>• O QR Code será gerado com base nestas informações</li>
                  <li>• Não será possível alterar após confirmar</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <LoadingButton
              type="submit"
              isLoading={loading}
              loadingText="Salvando..."
              disabled={!formData.name?.trim() || !formData.email?.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              Confirmar
            </LoadingButton>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.3s ease; }
      `}</style>
    </div>
  );
};

export default TicketUserForm;