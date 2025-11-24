import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    User, Mail, FileText, CreditCard, Building2, Hash,
    CheckCircle, AlertCircle, ArrowLeft, Loader2
} from 'lucide-react';
import {
    AFFILIATE_CONFIG,
    AFFILIATE_LABELS,
    validateCPF,
    validateCNPJ,
    formatCPF,
    formatCNPJ,
    formatPhone,
} from '../config/affiliate';

const AffiliateRegisterPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isAlreadyAffiliate, setIsAlreadyAffiliate] = useState(false);

    const [formData, setFormData] = useState({
        documentNumber: '',
        pixType: 'cpf' as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random',
        pixKey: '',
        bankName: '',
        bankAgency: '',
        bankAccount: '',
        acceptTerms: false,
    });

    // Verificar se usuário já é afiliado
    useEffect(() => {
        const checkAffiliateStatus = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('affiliates')
                    .select('id, status')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setIsAlreadyAffiliate(true);
                    if (data.status === 'active') {
                        navigate('/affiliate/dashboard');
                    }
                }
            } catch (err) {
                console.error('Erro ao verificar status de afiliado:', err);
            }
        };

        checkAffiliateStatus();
    }, [user, navigate]);

    // Redirecionar se não estiver logado
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^\d]/g, '');

        // Limitar a 11 (CPF) ou 14 (CNPJ) dígitos
        if (value.length > 14) value = value.slice(0, 14);

        setFormData(prev => ({ ...prev, documentNumber: value }));
    };

    const handlePixKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        // Formatar baseado no tipo
        if (formData.pixType === 'cpf') {
            value = value.replace(/[^\d]/g, '');
            if (value.length > 11) value = value.slice(0, 11);
        } else if (formData.pixType === 'cnpj') {
            value = value.replace(/[^\d]/g, '');
            if (value.length > 14) value = value.slice(0, 14);
        } else if (formData.pixType === 'phone') {
            value = value.replace(/[^\d]/g, '');
            if (value.length > 11) value = value.slice(0, 11);
        }

        setFormData(prev => ({ ...prev, pixKey: value }));
    };

    const validateForm = (): boolean => {
        // Validar documento
        if (formData.documentNumber.length === 11) {
            if (!validateCPF(formData.documentNumber)) {
                setError('CPF inválido');
                return false;
            }
        } else if (formData.documentNumber.length === 14) {
            if (!validateCNPJ(formData.documentNumber)) {
                setError('CNPJ inválido');
                return false;
            }
        } else {
            setError('CPF ou CNPJ inválido');
            return false;
        }

        // Validar chave PIX
        if (!formData.pixKey) {
            setError('Chave PIX é obrigatória');
            return false;
        }

        if (formData.pixType === 'cpf' && !validateCPF(formData.pixKey)) {
            setError('Chave PIX (CPF) inválida');
            return false;
        }

        if (formData.pixType === 'cnpj' && !validateCNPJ(formData.pixKey)) {
            setError('Chave PIX (CNPJ) inválida');
            return false;
        }

        if (formData.pixType === 'email' && !formData.pixKey.includes('@')) {
            setError('Chave PIX (E-mail) inválida');
            return false;
        }

        if (formData.pixType === 'phone' && formData.pixKey.length < 10) {
            setError('Chave PIX (Telefone) inválida');
            return false;
        }

        // Validar termos
        if (!formData.acceptTerms) {
            setError('Você deve aceitar os termos de afiliado');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            // Gerar código de afiliado
            const { data: codeData, error: codeError } = await supabase
                .rpc('generate_affiliate_code');

            if (codeError) throw codeError;

            const affiliateCode = codeData;

            // Inserir afiliado
            const { error: insertError } = await supabase
                .from('affiliates')
                .insert({
                    user_id: user!.id,
                    affiliate_code: affiliateCode,
                    document_number: formData.documentNumber,
                    pix_type: formData.pixType,
                    pix_key: formData.pixKey,
                    bank_name: formData.bankName || null,
                    bank_agency: formData.bankAgency || null,
                    bank_account: formData.bankAccount || null,
                    status: 'pending',
                });

            if (insertError) throw insertError;

            setSuccess(true);

            // Redirecionar após 3 segundos
            setTimeout(() => {
                navigate('/affiliate/dashboard');
            }, 3000);
        } catch (err: any) {
            console.error('Erro ao cadastrar afiliado:', err);
            if (err.message?.includes('duplicate')) {
                setError('Você já está cadastrado como afiliado');
            } else {
                setError(err.message || 'Erro ao processar cadastro. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            </div>
        );
    }

    if (isAlreadyAffiliate) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Você já é um afiliado!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Seu cadastro está em análise. Você será notificado quando for aprovado.
                    </p>
                    <button
                        onClick={() => navigate('/affiliate/dashboard')}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                        Ir para Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Cadastro Enviado!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Seu cadastro foi enviado com sucesso e está em análise.
                        Você será notificado por e-mail quando for aprovado.
                    </p>
                    <div className="text-sm text-gray-500">
                        Redirecionando para o dashboard...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Voltar
                    </button>

                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Seja um Afiliado
                        </h1>
                        <p className="text-gray-600">
                            Promova eventos e ganhe comissões por cada venda
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Informações do Usuário */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Suas Informações
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nome
                                    </label>
                                    <input
                                        type="text"
                                        value={user?.name || ''}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        E-mail
                                    </label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Documento */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Documento
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    CPF ou CNPJ *
                                </label>
                                <input
                                    type="text"
                                    name="documentNumber"
                                    value={formData.documentNumber.length === 11
                                        ? formatCPF(formData.documentNumber)
                                        : formData.documentNumber.length === 14
                                            ? formatCNPJ(formData.documentNumber)
                                            : formData.documentNumber
                                    }
                                    onChange={handleDocumentChange}
                                    required
                                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>
                        </div>

                        {/* Dados PIX */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Dados para Pagamento (PIX)
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Chave PIX *
                                    </label>
                                    <select
                                        name="pixType"
                                        value={formData.pixType}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    >
                                        {Object.entries(AFFILIATE_LABELS.PIX_TYPE).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chave PIX *
                                    </label>
                                    <input
                                        type="text"
                                        name="pixKey"
                                        value={formData.pixType === 'cpf' && formData.pixKey.length === 11
                                            ? formatCPF(formData.pixKey)
                                            : formData.pixType === 'cnpj' && formData.pixKey.length === 14
                                                ? formatCNPJ(formData.pixKey)
                                                : formData.pixType === 'phone'
                                                    ? formatPhone(formData.pixKey)
                                                    : formData.pixKey
                                        }
                                        onChange={handlePixKeyChange}
                                        required
                                        placeholder={
                                            formData.pixType === 'cpf' ? '000.000.000-00' :
                                                formData.pixType === 'cnpj' ? '00.000.000/0000-00' :
                                                    formData.pixType === 'email' ? 'seu@email.com' :
                                                        formData.pixType === 'phone' ? '(00) 00000-0000' :
                                                            'Chave aleatória'
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dados Bancários (Opcional) */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Dados Bancários (Opcional)
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Caso prefira receber por transferência bancária
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Banco
                                    </label>
                                    <input
                                        type="text"
                                        name="bankName"
                                        value={formData.bankName}
                                        onChange={handleInputChange}
                                        placeholder="Ex: Banco do Brasil"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Agência
                                    </label>
                                    <input
                                        type="text"
                                        name="bankAgency"
                                        value={formData.bankAgency}
                                        onChange={handleInputChange}
                                        placeholder="0000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Conta
                                    </label>
                                    <input
                                        type="text"
                                        name="bankAccount"
                                        value={formData.bankAccount}
                                        onChange={handleInputChange}
                                        placeholder="00000-0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Termos */}
                        <div className="border-t pt-6">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="acceptTerms"
                                    checked={formData.acceptTerms}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                    Eu li e aceito os{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/termos-afiliado')}
                                        className="text-pink-600 hover:text-pink-700 underline"
                                    >
                                        termos e condições do programa de afiliados
                                    </button>
                                </span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-6 rounded-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    Enviar Cadastro
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Info Cards */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow p-4 text-center">
                        <div className="text-3xl mb-2">💰</div>
                        <h4 className="font-semibold text-gray-900 mb-1">Ganhe Comissões</h4>
                        <p className="text-sm text-gray-600">
                            Até 30% por venda gerada
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4 text-center">
                        <div className="text-3xl mb-2">🔗</div>
                        <h4 className="font-semibold text-gray-900 mb-1">Links Únicos</h4>
                        <p className="text-sm text-gray-600">
                            Rastreamento automático
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4 text-center">
                        <div className="text-3xl mb-2">📊</div>
                        <h4 className="font-semibold text-gray-900 mb-1">Dashboard</h4>
                        <p className="text-sm text-gray-600">
                            Acompanhe suas vendas
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AffiliateRegisterPage;
