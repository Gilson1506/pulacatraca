// src/pages/PagBankTestPage.tsx
import React from 'react';
import PagBankTestForm from '../components/PagBankTestForm';

const PagBankTestPage: React.FC = () => {
  const handlePaymentSuccess = (data: any) => {
    console.log('✅ Pagamento realizado com sucesso:', data);
    // Aqui você pode adicionar lógica adicional, como redirecionar para uma página de sucesso
  };

  const handlePaymentError = (error: any) => {
    console.error('❌ Erro no pagamento:', error);
    // Aqui você pode adicionar lógica adicional, como mostrar um toast de erro
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">

        <PagBankTestForm
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>
    </div>
  );
};

export default PagBankTestPage;
