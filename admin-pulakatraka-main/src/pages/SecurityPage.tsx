import React, { useState, useEffect } from 'react';
import { Shield, Eye, AlertTriangle, CheckCircle, User, Lock, Key, Activity, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SecurityLog {
  id: string;
  type: 'login' | 'failed_login' | 'password_change' | 'admin_action' | 'suspicious_activity';
  user_id: string;
  user_email: string;
  action: string;
  ip: string;
  location: string;
  device: string;
  created_at: string;
  status: 'success' | 'failed' | 'blocked';
  risk_level: 'low' | 'medium' | 'high';
}

interface SecurityStats {
  total_logins_today: number;
  blocked_attempts: number;
  active_sessions: number;
}

interface PostgrestError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    total_logins_today: 0,
    blocked_attempts: 0,
    active_sessions: 0
  });
  const [filterType, setFilterType] = useState<'all' | 'login' | 'failed_login' | 'admin_action' | 'suspicious_activity'>('all');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSecurityLogs();
    fetchSecurityStats();
    fetchUserSettings();
  }, [user]);

  const fetchSecurityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar logs de segurança:', error);
    }
  };

  const fetchSecurityStats = async () => {
    try {
      // Buscar logins de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayLoginsCount, error: loginsError } = await supabase
        .from('security_logs')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'login')
        .gte('created_at', today.toISOString()) as { count: number | null; error: PostgrestError | null };

      if (loginsError) throw loginsError;

      // Buscar tentativas bloqueadas
      const { count: blockedAttemptsCount, error: blockedError } = await supabase
        .from('security_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'blocked') as { count: number | null; error: PostgrestError | null };

      if (blockedError) throw blockedError;

      // Buscar sessões ativas
      const { count: activeSessionsCount, error: sessionsError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('active', true) as { count: number | null; error: PostgrestError | null };

      if (sessionsError) throw sessionsError;

      setStats({
        total_logins_today: todayLoginsCount || 0,
        blocked_attempts: blockedAttemptsCount || 0,
        active_sessions: activeSessionsCount || 0
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de segurança:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setTwoFactorEnabled(data.two_factor_enabled || false);
        setSessionTimeout(data.session_timeout?.toString() || '30');
        setIpWhitelist(data.ip_whitelist || '');
      }
    } catch (error) {
      console.error('Erro ao buscar configurações do usuário:', error);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesRisk = filterRisk === 'all' || log.risk_level === filterRisk;
    return matchesType && matchesRisk;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed_login':
        return <AlertTriangle className="w-4 h-4" />;
      case 'admin_action':
        return <Shield className="w-4 h-4" />;
      case 'suspicious_activity':
        return <Eye className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'failed_login':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700';
      case 'admin_action':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
      case 'suspicious_activity':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          two_factor_enabled: twoFactorEnabled,
          session_timeout: parseInt(sessionTimeout),
          ip_whitelist: ipWhitelist,
        });

      if (error) throw error;
      alert('Configurações de segurança salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    }
  };

  const handleBlockIP = async (ip: string) => {
    if (!confirm(`Tem certeza que deseja bloquear o IP ${ip}?`)) return;

    try {
      const { error } = await supabase
        .from('blocked_ips')
        .insert({ ip, blocked_by: user?.id });

      if (error) throw error;
      alert(`IP ${ip} bloqueado com sucesso!`);
      fetchSecurityLogs();
    } catch (error) {
      console.error('Erro ao bloquear IP:', error);
      alert('Erro ao bloquear IP. Tente novamente.');
    }
  };

  const handleForceLogout = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ active: false })
        .neq('user_id', user?.id); // Não deslogar a sessão atual

      if (error) throw error;
      alert('Logout forçado em todas as sessões com sucesso!');
      fetchSecurityStats();
    } catch (error) {
      console.error('Erro ao forçar logout:', error);
      alert('Erro ao forçar logout. Tente novamente.');
    }
  };

  const handleRegenerateApiToken = async () => {
    try {
      const { data, error } = await supabase.rpc('regenerate_api_token', {
        user_id: user?.id
      });

      if (error) throw error;
      alert(`Novo token de API gerado: ${data}`);
    } catch (error) {
      console.error('Erro ao regenerar token de API:', error);
      alert('Erro ao regenerar token de API. Tente novamente.');
    }
  };

  const handleSecurityCheck = async () => {
    try {
      const { error } = await supabase.rpc('run_security_check', {
        user_id: user?.id
      });

      if (error) throw error;
      alert('Verificação de segurança concluída com sucesso!');
      fetchSecurityLogs();
    } catch (error) {
      console.error('Erro ao executar verificação de segurança:', error);
      alert('Erro ao executar verificação de segurança. Tente novamente.');
    }
  };

  const handleExportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Converter logs para CSV
      const headers = ['ID', 'Tipo', 'Usuário', 'Ação', 'IP', 'Localização', 'Dispositivo', 'Data', 'Status', 'Nível de Risco'];
      const rows = data.map(log => [
        log.id,
        log.type,
        log.user_email,
        log.action,
        log.ip,
        log.location,
        log.device,
        log.created_at,
        log.status,
        log.risk_level
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Criar e baixar arquivo CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `security_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      alert('Erro ao exportar logs. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dados de segurança...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Configurações de Segurança</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitoramento e configuração de segurança do sistema</p>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-green-100 dark:border-green-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status do Sistema</p>
              <p className="text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">Seguro</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 lg:p-4 rounded-xl">
              <Shield className="w-6 lg:w-8 h-6 lg:h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-100 dark:border-blue-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Logins Hoje</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stats.total_logins_today}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 lg:p-4 rounded-xl">
              <User className="w-6 lg:w-8 h-6 lg:h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-red-100 dark:border-red-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Tentativas Bloqueadas</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stats.blocked_attempts}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 lg:p-4 rounded-xl">
              <AlertTriangle className="w-6 lg:w-8 h-6 lg:h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-100 dark:border-purple-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Sessões Ativas</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stats.active_sessions}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 lg:p-4 rounded-xl">
              <Activity className="w-6 lg:w-8 h-6 lg:h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Configurações de Autenticação</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Autenticação em Dois Fatores</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Adiciona uma camada extra de segurança</p>
              </div>
              <button
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeout de Sessão (minutos)
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                IPs Permitidos (Whitelist)
              </label>
              <textarea
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={4}
                placeholder="192.168.1.0/24"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Um IP ou range por linha</p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Salvar Configurações
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Ações de Segurança</h3>
          
          <div className="space-y-4">
            <button
              onClick={handleForceLogout}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 active:scale-95"
            >
              <Lock className="w-5 h-5" />
              <span>Forçar Logout Geral</span>
            </button>

            <button
              onClick={handleRegenerateApiToken}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 active:scale-95"
            >
              <Key className="w-5 h-5" />
              <span>Regenerar Token API</span>
            </button>

            <button
              onClick={handleSecurityCheck}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 active:scale-95"
            >
              <Shield className="w-5 h-5" />
              <span>Verificação de Segurança</span>
            </button>

            <button
              onClick={handleExportLogs}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 active:scale-95"
            >
              <Eye className="w-5 h-5" />
              <span>Exportar Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Logs de Segurança</h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'login' | 'failed_login' | 'admin_action' | 'suspicious_activity')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os tipos</option>
              <option value="login">Login</option>
              <option value="failed_login">Login Falhado</option>
              <option value="admin_action">Ação Admin</option>
              <option value="suspicious_activity">Atividade Suspeita</option>
            </select>
            
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as 'all' | 'low' | 'medium' | 'high')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os riscos</option>
              <option value="low">Baixo</option>
              <option value="medium">Médio</option>
              <option value="high">Alto</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Tipo</th>
                <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Usuário</th>
                <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ação</th>
                <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Localização</th>
                <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Risco</th>
                <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Data</th>
                <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(log.type)}`}>
                      {getTypeIcon(log.type)}
                      <span className="ml-1 capitalize">{log.type.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{log.user_email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{log.device}</p>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-gray-900 dark:text-white">{log.action}</td>
                  <td className="px-4 lg:px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{log.location}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{log.ip}</p>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(log.risk_level)}`}>
                      {log.risk_level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => alert(`Visualizar detalhes do log ${log.id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {log.risk_level === 'high' && (
                        <button 
                          onClick={() => handleBlockIP(log.ip)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}