import React from 'react';
import CookieConsent, { useCookieConsent } from './CookieConsent';

/**
 * Exemplos de uso do componente CookieConsent
 */
const CookieConsentExample: React.FC = () => {
  // Hook para verificar status de consentimento
  const { hasConsented, accepted, timestamp, resetConsent } = useCookieConsent();

  return (
    <div className="p-8 space-y-8">
      
      {/* Status do Consentimento */}
      <div className="bg-gray-50 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">📊 Status do Consentimento</h2>
        <div className="space-y-2">
          <p><strong>Consentiu:</strong> {hasConsented ? '✅ Sim' : '❌ Não'}</p>
          <p><strong>Aceito:</strong> {accepted === null ? '🤔 Sem resposta' : accepted ? '✅ Aceito' : '❌ Rejeitado'}</p>
          <p><strong>Data:</strong> {timestamp ? new Date(timestamp).toLocaleString('pt-BR') : 'N/A'}</p>
        </div>
        <button
          onClick={resetConsent}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          🗑️ Resetar Consentimento
        </button>
      </div>

      {/* Exemplo 1: Posição Bottom (Padrão) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🔻 Exemplo 1: Posição Bottom (Padrão)</h3>
        <CookieConsent
          delaySeconds={1}
          position="bottom"
          onAccept={() => console.log('✅ Cookies aceitos!')}
          onReject={() => console.log('❌ Cookies rejeitados!')}
        />
      </div>

      {/* Exemplo 2: Posição Center (Modal) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🎯 Exemplo 2: Posição Center (Modal)</h3>
        <CookieConsent
          delaySeconds={2}
          position="center"
          showRejectButton={true}
          privacyPolicyUrl="https://exemplo.com/privacidade"
          onAccept={() => console.log('✅ Modal: Cookies aceitos!')}
          onReject={() => console.log('❌ Modal: Cookies rejeitados!')}
        />
      </div>

      {/* Exemplo 3: Posição Top */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">🔺 Exemplo 3: Posição Top</h3>
        <CookieConsent
          delaySeconds={3}
          position="top"
          showRejectButton={false}
          onAccept={() => console.log('✅ Top: Cookies aceitos!')}
        />
      </div>

      {/* Exemplo 4: Texto Customizado */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">✏️ Exemplo 4: Texto Customizado</h3>
        <CookieConsent
          delaySeconds={4}
          position="bottom"
          customText={{
            title: "🚀 Melhore sua Experiência",
            description: "Utilizamos cookies para personalizar seu conteúdo e oferecer a melhor experiência possível. Quer continuar navegando com essa experiência otimizada?",
            acceptButton: "Sim, Aceitar!",
            rejectButton: "Não, Obrigado",
            privacyLink: "Ver Nossa Política"
          }}
          privacyPolicyUrl="/privacidade"
          onAccept={() => {
            console.log('✅ Customizado: Aceito!');
            // Aqui você pode ativar Google Analytics, Facebook Pixel, etc.
          }}
          onReject={() => {
            console.log('❌ Customizado: Rejeitado!');
            // Aqui você pode desativar tracking scripts
          }}
        />
      </div>

      {/* Exemplo 5: Sem Botão Rejeitar */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">➡️ Exemplo 5: Apenas Aceitar</h3>
        <CookieConsent
          delaySeconds={5}
          position="bottom"
          showRejectButton={false}
          customText={{
            title: "🍪 Notificação de Cookies",
            description: "Este site usa cookies essenciais para funcionamento básico. Clique para aceitar e continuar.",
            acceptButton: "Entendido!"
          }}
          onAccept={() => console.log('✅ Simples: Aceito!')}
        />
      </div>

      {/* Exemplo de Implementação no App Principal */}
      <div className="bg-blue-50 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">📋 Como Implementar no seu App</h3>
        <pre className="bg-gray-800 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`// No seu App.tsx principal
import CookieConsent from './components/CookieConsent';

function App() {
  return (
    <div className="App">
      {/* Seu conteúdo normal */}
      <Routes>
        {/* suas rotas */}
      </Routes>
      
      {/* Banner de Cookies */}
      <CookieConsent
        delaySeconds={1}
        position="bottom"
        privacyPolicyUrl="/privacy"
        onAccept={() => {
          // Ativar Google Analytics
          gtag('consent', 'update', {
            'analytics_storage': 'granted'
          });
          
          // Ativar Facebook Pixel
          fbq('consent', 'grant');
          
          console.log('✅ Tracking ativado');
        }}
        onReject={() => {
          // Desativar todos os trackings
          console.log('❌ Tracking desativado');
        }}
      />
    </div>
  );
}`}
        </pre>
      </div>

      {/* Hook de Verificação */}
      <div className="bg-green-50 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">🔗 Hook para Verificar Consentimento</h3>
        <pre className="bg-gray-800 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`// Em qualquer componente
import { useCookieConsent } from './components/CookieConsent';

function MyComponent() {
  const { hasConsented, accepted } = useCookieConsent();
  
  useEffect(() => {
    if (hasConsented && accepted) {
      // Usuário aceitou - pode carregar scripts de tracking
      loadGoogleAnalytics();
      loadFacebookPixel();
    }
  }, [hasConsented, accepted]);
  
  return (
    <div>
      {hasConsented ? (
        <p>✅ Consentimento dado</p>
      ) : (
        <p>⏳ Aguardando consentimento</p>
      )}
    </div>
  );
}`}
        </pre>
      </div>

      {/* Configurações Avançadas */}
      <div className="bg-purple-50 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">⚙️ Configurações Avançadas</h3>
        <div className="space-y-4 text-sm">
          <div>
            <strong>delaySeconds:</strong> Tempo em segundos antes de mostrar (padrão: 1)
          </div>
          <div>
            <strong>position:</strong> 'bottom' | 'center' | 'top' (padrão: 'bottom')
          </div>
          <div>
            <strong>showRejectButton:</strong> true | false (padrão: true)
          </div>
          <div>
            <strong>privacyPolicyUrl:</strong> URL da política de privacidade (padrão: '/privacy-policy')
          </div>
          <div>
            <strong>customText:</strong> Objeto com textos personalizados
          </div>
          <div>
            <strong>onAccept/onReject:</strong> Callbacks para ações personalizadas
          </div>
        </div>
      </div>

      {/* Compliance LGPD/GDPR */}
      <div className="bg-yellow-50 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">📋 Compliance LGPD/GDPR</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>✅ Consentimento explícito e claro</li>
          <li>✅ Opção de aceitar ou rejeitar</li>
          <li>✅ Link para política de privacidade</li>
          <li>✅ Armazenamento seguro da escolha</li>
          <li>✅ Não aparece novamente após escolha</li>
          <li>✅ Controle granular via callbacks</li>
          <li>✅ Versioning para futuras atualizações</li>
          <li>✅ Timestamp da decisão</li>
        </ul>
      </div>
    </div>
  );
};

export default CookieConsentExample;