import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, User, Building, Phone, FileText, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OrganizerRegisterPage = () => {
  const [formData, setFormData] = useState({
    // Dados pessoais
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Dados da empresa/organização
    companyName: '',
    cnpj: '',
    companyType: 'empresa', // empresa, pessoa_fisica, ong
    description: '',
    // Endereço
    cep: '',
    address: '',
    city: '',
    state: '',
    // Documentos
    cpf: '',
    // Termos
    acceptTerms: false,
    acceptPrivacy: false
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Garantir que a página carregue do topo
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      setError('Você deve aceitar os termos e política de privacidade.');
      setIsLoading(false);
      return;
    }

    try {
      // Registrar como organizador
      await register(formData.name, formData.email, formData.password, 'organizer');

      // Redireciona direto para o dashboard do organizador
      navigate('/organizer-dashboard', { replace: true });
      return;
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message?.includes('already registered')) {
          setError('Este email já está registrado. Por favor, faça login.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Erro ao criar conta de organizador. Tente novamente.');
      }
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados Pessoais</h2>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nome completo *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Digite seu nome completo"
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Digite seu email"
          />
        </div>
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Telefone *
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
            CPF *
          </label>
          <input
            type="text"
            id="cpf"
            name="cpf"
            value={formData.cpf}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="000.000.000-00"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados da Empresa/Organização</h2>
      <div>
        <label htmlFor="companyType" className="block text-sm font-medium text-gray-700">
          Tipo de organização *
        </label>
        <select
          id="companyType"
          name="companyType"
          value={formData.companyType}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          <option value="empresa">Empresa</option>
          <option value="pessoa_fisica">Pessoa Física</option>
          <option value="ong">ONG/Associação</option>
        </select>
      </div>
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Nome da empresa/organização *
        </label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Digite o nome da empresa"
          />
        </div>
      </div>
      {formData.companyType === 'empresa' && (
        <div>
          <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
            CNPJ *
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              id="cnpj"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="00.000.000/0000-00"
            />
          </div>
        </div>
      )}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Descrição da atividade *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          required
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Descreva o tipo de eventos que você organiza..."
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Endereço</h2>
      <div>
        <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
          CEP *
        </label>
        <input
          type="text"
          id="cep"
          name="cep"
          value={formData.cep}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="00000-000"
        />
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Endereço completo *
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Rua, número, bairro"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            Cidade *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Digite a cidade"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            Estado *
          </label>
          <select
            id="state"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="">Selecione o estado</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Senha e Confirmação</h2>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Senha *
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Digite sua senha"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirmar senha *
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Confirme sua senha"
        />
      </div>
      <div className="space-y-3 pt-4">
        <label className="flex items-start">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleInputChange}
            className="mt-1 mr-3"
            required
          />
          <span className="text-sm text-gray-600">
            Aceito os{' '}
            <Link to="/terms" className="text-pink-600 hover:text-pink-700">
              Termos de Uso
            </Link>{' '}
            para organizadores de eventos
          </span>
        </label>
        <label className="flex items-start">
          <input
            type="checkbox"
            name="acceptPrivacy"
            checked={formData.acceptPrivacy}
            onChange={handleInputChange}
            className="mt-1 mr-3"
            required
          />
          <span className="text-sm text-gray-600">
            Aceito a{' '}
            <Link to="/privacy" className="text-pink-600 hover:text-pink-700">
              Política de Privacidade
            </Link>
          </span>
        </label>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Próximos passos:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Sua conta será analisada em até 24 horas</li>
          <li>• Você receberá um email de confirmação</li>
          <li>• Após aprovação, poderá criar e gerenciar eventos</li>
          <li>• Terá acesso ao painel de organizador</li>
        </ul>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Dados Pessoais';
      case 2: return 'Empresa/Organização';
      case 3: return 'Endereço';
      case 4: return 'Finalização';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-2 sm:py-4 md:py-8 px-4 sm:px-6 lg:px-8 flex items-start sm:items-center justify-center overflow-auto">
      <div className="max-w-2xl w-full my-auto flex flex-col justify-center min-h-0">
        {/* Back Button */}
        <Link
          to="/register"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 sm:mb-6 md:mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm sm:text-base">Voltar para cadastro normal</span>
        </Link>
        {/* Register Card */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 w-full max-h-screen overflow-y-auto">
          {/* Logo */}
          <div className="text-center mb-6">
            <img
              src="/logo-com-qr.png"
              alt="Logo PULACATRACA"
              className="h-12 sm:h-16 md:h-20 w-auto mx-auto"
            />
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-2">Cadastro de Organizador</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Crie sua conta para organizar eventos na plataforma
            </p>
          </div>
          {/* Progress Bar */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Etapa {currentStep} de 4: {getStepTitle()}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2" />
              <p className="text-green-600 text-sm">Cadastro realizado com sucesso! Redirecionando...</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step Content */}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 sm:mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 sm:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Voltar
                </button>
              )}
              <div className="ml-auto">
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 sm:px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm sm:text-base"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-bold text-sm sm:text-base shadow-md flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        Criando conta...
                      </span>
                    ) : (
                      'Finalizar cadastro'
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
          {/* Login Link */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-sm sm:text-base text-gray-600">
              Já possui uma conta de organizador?{' '}
              <Link to="/login" className="text-pink-600 hover:text-pink-700 font-medium">
                Faça login
              </Link>
            </p>
          </div>
        </div>
        {/* Footer Links */}
        <div className="mt-6 sm:mt-8 text-center space-x-4">
          <Link to="/terms" className="text-gray-500 hover:text-gray-700 text-sm">
            Termos de uso
          </Link>
          <Link to="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">
            Política de privacidade
          </Link>
        </div>
        {/* Language Flags */}
        <div className="mt-3 sm:mt-4 flex justify-center space-x-2">
          <span className="text-xl sm:text-2xl">🇧🇷</span>
          <span className="text-xl sm:text-2xl">🇺🇸</span>
          <span className="text-xl sm:text-2xl">🇪🇸</span>
        </div>
      </div>
    </div>
  );
};

export default OrganizerRegisterPage; 