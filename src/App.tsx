import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';
import { ModalProvider } from './contexts/ModalContext';
import AppRoutes from './AppRoutes';
import CookieConsent from './components/CookieConsent';
import WhatsAppButton from './components/WhatsAppButton';

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <ModalProvider>
          <AppRoutes />
        
        {/* Banner de Cookies LGPD/GDPR Compliant */}
        <CookieConsent
          delaySeconds={5}
          position="bottom"
          privacyPolicyUrl="/politica"
          onAccept={() => {
            console.log('✅ Cookies aceitos - Tracking ativado');
            // Aqui você pode ativar Google Analytics, Facebook Pixel, etc.
            // gtag('consent', 'update', { 'analytics_storage': 'granted' });
            // fbq('consent', 'grant');
          }}
          onReject={() => {
            console.log('❌ Cookies rejeitados - Tracking desativado');
            // Aqui você pode desativar todos os trackings
          }}
        />

          {/* Botão flutuante do WhatsApp */}
          <WhatsAppButton 
            phoneNumber="5511968033591"
            message="Olá! Gostaria de mais informações sobre os eventos do Pulakatraca."
            position="bottom-left"
          />
        </ModalProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;