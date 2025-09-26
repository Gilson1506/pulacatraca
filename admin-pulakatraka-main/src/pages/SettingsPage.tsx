import React, { useState, useEffect } from 'react';
import { Save, Globe, Bell, Palette, Database, Users, Calendar, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  adminEmail: string;
  supportEmail: string;
  maxEventsPerOrganizer: string;
  eventApprovalRequired: boolean;
  autoCarouselApproval: boolean;
  commissionRate: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxTicketsPerPurchase: string;
  refundPeriodDays: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const defaultSettings: SystemSettings = {
  siteName: '',
  siteDescription: '',
  adminEmail: '',
  supportEmail: '',
  maxEventsPerOrganizer: '10',
  eventApprovalRequired: true,
  autoCarouselApproval: false,
  commissionRate: '10',
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  maintenanceMode: false,
  allowRegistration: true,
  requireEmailVerification: true,
  maxTicketsPerPurchase: '10',
  refundPeriodDays: '7',
  primaryColor: '#2563EB',
  secondaryColor: '#059669',
  accentColor: '#EA580C'
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSettingChange = (key: keyof SystemSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('system_settings')
      .upsert(settings);

    if (!error) {
      alert('Configurações salvas com sucesso!');
    } else {
      alert('Erro ao salvar configurações. Tente novamente.');
    }
  };

  const handleUploadLogo = async () => {
    // Implementar upload de logo usando o storage do Supabase
    alert('Funcionalidade de upload de logo em desenvolvimento');
  };

  const handleBackupDatabase = async () => {
    // Implementar backup usando funções do Supabase
    alert('Iniciando backup do banco de dados...');
  };

  const handleRestoreDatabase = async () => {
    if (!confirm('Tem certeza que deseja restaurar o banco de dados? Esta ação não pode ser desfeita.')) {
      return;
    }

    // Implementar restauração usando funções do Supabase
    alert('Processo de restauração iniciado...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Configurações do Sistema</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie as configurações gerais da plataforma</p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 hover:scale-105 active:scale-95"
        >
          <Save className="w-5 h-5" />
          <span>Salvar Todas as Configurações</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações Gerais</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do Site</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => handleSettingChange('siteName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição do Site</label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) => handleSettingChange('siteDescription', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email do Administrador</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => handleSettingChange('adminEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email de Suporte</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo da Plataforma</label>
              <button
                onClick={handleUploadLogo}
                className="w-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Clique para fazer upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* Event Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações de Eventos</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Máximo de Eventos por Organizador</label>
              <select
                value={settings.maxEventsPerOrganizer}
                onChange={(e) => handleSettingChange('maxEventsPerOrganizer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="5">5 eventos</option>
                <option value="10">10 eventos</option>
                <option value="20">20 eventos</option>
                <option value="unlimited">Ilimitado</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Aprovação de Eventos Obrigatória</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Eventos precisam ser aprovados antes de ficarem visíveis</p>
              </div>
              <button
                onClick={() => handleSettingChange('eventApprovalRequired', !settings.eventApprovalRequired)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.eventApprovalRequired ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.eventApprovalRequired ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Aprovação Automática para Carrossel</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Eventos aprovados entram automaticamente no carrossel</p>
              </div>
              <button
                onClick={() => handleSettingChange('autoCarouselApproval', !settings.autoCarouselApproval)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoCarouselApproval ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoCarouselApproval ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Taxa de Comissão (%)</label>
              <input
                type="number"
                value={settings.commissionRate}
                onChange={(e) => handleSettingChange('commissionRate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
                max="50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período de Reembolso (dias)</label>
              <select
                value={settings.refundPeriodDays}
                onChange={(e) => handleSettingChange('refundPeriodDays', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações de Usuários</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Permitir Novos Registros</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Usuários podem criar novas contas</p>
              </div>
              <button
                onClick={() => handleSettingChange('allowRegistration', !settings.allowRegistration)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowRegistration ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.allowRegistration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Verificação de Email Obrigatória</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Usuários devem verificar email antes de usar a plataforma</p>
              </div>
              <button
                onClick={() => handleSettingChange('requireEmailVerification', !settings.requireEmailVerification)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requireEmailVerification ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Máximo de Ingressos por Compra</label>
              <select
                value={settings.maxTicketsPerPurchase}
                onChange={(e) => handleSettingChange('maxTicketsPerPurchase', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="5">5 ingressos</option>
                <option value="10">10 ingressos</option>
                <option value="20">20 ingressos</option>
                <option value="50">50 ingressos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-lg">
              <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações de Notificações</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Notificações por Email</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enviar notificações importantes por email</p>
              </div>
              <button
                onClick={() => handleSettingChange('emailNotifications', !settings.emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Notificações por SMS</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enviar alertas críticos por SMS</p>
              </div>
              <button
                onClick={() => handleSettingChange('smsNotifications', !settings.smsNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.smsNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Push Notifications</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Notificações push no navegador</p>
              </div>
              <button
                onClick={() => handleSettingChange('pushNotifications', !settings.pushNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-pink-100 dark:bg-pink-900/50 p-2 rounded-lg">
            <Palette className="w-6 h-6 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personalização Visual</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor Primária</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor Secundária</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor de Destaque</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => handleSettingChange('accentColor', e.target.value)}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                value={settings.accentColor}
                onChange={(e) => handleSettingChange('accentColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Maintenance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
            <Database className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manutenção do Sistema</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Modo de Manutenção</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Desabilita acesso público à plataforma</p>
              </div>
              <button
                onClick={() => {
                  if (!settings.maintenanceMode || confirm('Tem certeza que deseja ativar o modo de manutenção?')) {
                    handleSettingChange('maintenanceMode', !settings.maintenanceMode);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleBackupDatabase}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 active:scale-95"
            >
              <Database className="w-5 h-5" />
              <span>Fazer Backup do Banco</span>
            </button>

            <button
              onClick={handleRestoreDatabase}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 active:scale-95"
            >
              <Upload className="w-5 h-5" />
              <span>Restaurar Banco</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}