import React from 'react';

const SystemNotConfigured: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="text-6xl mb-6">⚠️</div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Sistema Não Configurado
          </h1>
          
          {/* Description */}
          <p className="text-gray-600 mb-6 text-lg">
            O sistema de usuários de ingressos ainda não foi configurado no Supabase.
          </p>
          
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-left">
            <h3 className="text-blue-900 font-semibold mb-3">📋 Para configurar o sistema:</h3>
            <ol className="text-blue-800 text-sm space-y-2">
              <li><strong>1.</strong> Acesse o Supabase Dashboard</li>
              <li><strong>2.</strong> Vá para SQL Editor</li>
              <li><strong>3.</strong> Execute o script: <code className="bg-blue-100 px-2 py-1 rounded">supabase_ticket_users.sql</code></li>
              <li><strong>4.</strong> Aguarde a execução completa</li>
              <li><strong>5.</strong> Recarregue esta página</li>
            </ol>
          </div>
          
          {/* SQL Script Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-gray-900 font-semibold mb-3">📄 O script SQL irá criar:</h3>
            <ul className="text-gray-700 text-sm space-y-1 text-left">
              <li>• Tabela <code>ticket_users</code> (id, name, email, document)</li>
              <li>• Campo <code>ticket_user_id</code> na tabela tickets</li>
              <li>• Políticas RLS para segurança</li>
              <li>• Triggers para QR Code automático</li>
              <li>• Índices para performance</li>
              <li>• Função de validação de QR Code</li>
            </ul>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg"
            >
              🔄 Recarregar Página
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-xl font-semibold transition-all duration-200"
            >
              ← Voltar
            </button>
          </div>
          
          {/* Help */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-yellow-800 text-sm">
              <strong>💡 Dica:</strong> Após executar o script, todos os ingressos existentes continuarão funcionando. 
              O sistema apenas adicionará a funcionalidade de definir usuários específicos para cada ingresso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemNotConfigured;