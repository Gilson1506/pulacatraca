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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="relative bg-gray-100/90 backdrop-blur-sm border border-gray-300/60 rounded-lg shadow-2xl w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col transform transition-all duration-500 ease-out animate-fadeInUp">
        {/* Header */}
        <div className="relative bg-gray-200/80 backdrop-blur-md px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-300/60">
          <div className="absolute inset-0 bg-gray-200/80"></div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-1.5 sm:p-2 hover:bg-gray-300/50 rounded-sm transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative z-10">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-xl sm:text-2xl">👤</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-center text-gray-800 px-6">Definir Usuário do Ingresso</h2>
            <p className="text-gray-600 text-xs sm:text-sm text-center mt-1 px-2">
              Informe os dados de quem irá usar este ingresso
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white p-3 sm:p-4">
          {errors.general && (
            <div className="mb-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-sm">
              <p className="text-red-600 text-xs sm:text-sm">⚠️ {errors.general}</p>
            </div>
          )}

          {/* Botão para usar dados do comprador */}
          {currentUser && (
            <div className="mb-3 sm:mb-4">
              <button
                type="button"
                onClick={handleUseBuyerData}
                disabled={loading}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-50 border border-gray-300 rounded-sm text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
              >
                <span className="text-sm sm:text-lg">👤</span>
                <span className="truncate">Usar meus dados ({currentUser.name})</span>
              </button>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all duration-200 text-sm ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-gray-500'
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
              <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                E-mail *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all duration-200 text-sm ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-gray-500'
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
              <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                CPF ou CNPJ (opcional)
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={handleDocumentChange}
                className={`w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all duration-200 text-sm ${
                  errors.document 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-gray-500'
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
          <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-gray-50 border border-gray-300 rounded-sm">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-gray-500 text-sm sm:text-lg flex-shrink-0">ℹ️</div>
              <div className="min-w-0">
                <p className="text-gray-800 text-xs sm:text-sm font-medium mb-1">
                  Importante
                </p>
                <ul className="text-gray-600 text-xs space-y-1">
                  <li>• Estes dados serão associados permanentemente ao ingresso</li>
                  <li>• O QR Code será gerado com base nestas informações</li>
                  <li>• Não será possível alterar após confirmar</li>
                </ul>
              </div>
                        </div>
          </div>
        </form>

        {/* Actions - Fixo no bottom */}
        <div className="sticky bottom-0 bg-gray-200/80 backdrop-blur-md border-t border-gray-300/60 p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-sm text-gray-700 font-medium hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 text-xs sm:text-sm"
            >
              Cancelar
            </button>
            <LoadingButton
              type="submit"
              isLoading={loading}
              loadingText="Salvando..."
              disabled={!formData.name?.trim() || !formData.email?.trim()}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-pink-600 text-white rounded-sm font-bold hover:bg-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              onClick={handleSubmit}
            >
              Confirmar
            </LoadingButton>
          </div>
        </div>
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