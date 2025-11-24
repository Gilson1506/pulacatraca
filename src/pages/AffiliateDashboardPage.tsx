import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    TrendingUp, DollarSign, Link as LinkIcon,
    Clock, CheckCircle, XCircle, Loader2, ArrowLeft
} from 'lucide-react';
import { formatCurrency } from '../config/affiliate';
import AffiliateLinkGenerator from '../components/AffiliateLinkGenerator';
import { getAffiliateSales } from '../services/affiliateTracking';

interface AffiliateData {
    id: string;
    affiliate_code: string;
    status: string;
    total_sales: number;
    total_commission: number;
    pending_commission: number;
    paid_commission: number;
    created_at: string;
    approved_at: string | null;
    rejected_at: string | null;
    rejection_reason: string | null;
}

const AffiliateDashboardPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
    const [sales, setSales] = useState<any[]>([]);
    const [loadingSales, setLoadingSales] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
            return;
        }

        const fetchAffiliateData = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('affiliates')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') {
                        // Não é afiliado
                        navigate('/affiliate/register');
                    } else {
                        throw error;
                    }
                    return;
                }

                setAffiliateData(data);
            } catch (err) {
                console.error('Erro ao buscar dados do afiliado:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAffiliateData();
    }, [user, authLoading, navigate]);

    // Buscar vendas quando afiliado for carregado
    useEffect(() => {
        const fetchSales = async () => {
            if (!affiliateData?.id) return;

            setLoadingSales(true);
            try {
                const salesData = await getAffiliateSales(affiliateData.id, 10);
                setSales(salesData);
            } catch (err) {
                console.error('Erro ao buscar vendas:', err);
            } finally {
                setLoadingSales(false);
            }
        };

        fetchSales();
    }, [affiliateData]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            </div>
        );
    }

    if (!affiliateData) {
        return null;
    }

    // Status pendente
    if (affiliateData.status === 'pending') {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Voltar para Home
                    </button>

                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Cadastro em Análise
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Seu cadastro como afiliado está sendo analisado.
                            Você será notificado por e-mail quando for aprovado.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 text-left">
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Código de Afiliado:</strong> {affiliateData.affiliate_code}
                            </p>
                            <p className="text-sm text-gray-700">
                                <strong>Data de Cadastro:</strong>{' '}
                                {new Date(affiliateData.created_at).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Status rejeitado
    if (affiliateData.status === 'rejected') {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Voltar para Home
                    </button>

                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Cadastro Rejeitado
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Infelizmente seu cadastro como afiliado foi rejeitado.
                        </p>
                        {affiliateData.rejection_reason && (
                            <div className="bg-red-50 rounded-lg p-4 text-left mb-6">
                                <p className="text-sm text-red-900">
                                    <strong>Motivo:</strong> {affiliateData.rejection_reason}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-gray-600">
                            Entre em contato com o suporte para mais informações.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard ativo
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Voltar para Home
                    </button>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Dashboard de Afiliado
                            </h1>
                            <p className="text-gray-600">
                                Código: <span className="font-mono font-semibold">{affiliateData.affiliate_code}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-semibold">Ativo</span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Total de Vendas</h3>
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(affiliateData.total_sales)}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Comissão Total</h3>
                            <DollarSign className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(affiliateData.total_commission)}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Pendente</h3>
                            <Clock className="h-5 w-5 text-yellow-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(affiliateData.pending_commission)}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-600">Pago</h3>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(affiliateData.paid_commission)}
                        </p>
                    </div>
                </div>

                {/* Gerador de Links */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <LinkIcon className="h-6 w-6 text-pink-600" />
                        Gerador de Links de Afiliado
                    </h2>
                    <AffiliateLinkGenerator affiliateCode={affiliateData.affiliate_code} />
                </div>

                {/* Vendas Recentes */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-pink-600" />
                        Vendas Recentes
                    </h2>

                    {loadingSales ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Nenhuma venda registrada ainda.</p>
                            <p className="text-sm mt-2">Comece compartilhando seus links de afiliado!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comissão</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {sales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {sale.events?.title || 'Evento'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {formatCurrency(sale.sale_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-green-600">
                                                {formatCurrency(sale.commission_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.payment_method === 'pix' ? 'bg-blue-100 text-blue-800' :
                                                        sale.payment_method === 'credit_card' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {sale.payment_method === 'pix' ? 'PIX' :
                                                        sale.payment_method === 'credit_card' ? 'Cartão' :
                                                            sale.payment_method || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.commission_status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    sale.commission_status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                                        sale.commission_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {sale.commission_status === 'paid' ? 'Pago' :
                                                        sale.commission_status === 'approved' ? 'Aprovado' :
                                                            sale.commission_status === 'pending' ? 'Pendente' :
                                                                'Cancelado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AffiliateDashboardPage;
