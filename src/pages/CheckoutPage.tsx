import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, QrCode, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const CheckoutPage = () => {
  const { items, updateQuantity, removeFromCart, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    // Simular processamento de pagamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simular compra bem-sucedida
    clearCart();
    navigate('/profile', { 
      state: { 
        message: 'Compra realizada com sucesso! Seus ingressos foram enviados para o seu email.',
        newTickets: items.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          eventName: item.eventName,
          eventDate: item.eventDate,
          eventLocation: item.eventLocation,
          ticketType: item.ticketType,
          quantity: item.quantity,
          qrCode: `QR-${Math.random().toString(36).substr(2, 9)}`,
          status: 'ativo'
        }))
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Carrinho vazio</h2>
          <p className="text-gray-600 mb-8">Adicione alguns ingressos ao seu carrinho para continuar.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Explorar eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Finalizar compra</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cart Items */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Seus ingressos</h2>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.eventImage}
                        alt={item.eventName}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.eventName}</h3>
                        <p className="text-sm text-gray-500">{item.ticketType}</p>
                        <p className="text-sm text-gray-500">{new Date(item.eventDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 text-sm flex items-center space-x-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Método de pagamento</h2>
                <div className="space-y-3">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'card' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-gray-600" />
                      <span>Cartão de crédito/débito</span>
                    </div>
                  </div>
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'pix' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <div className="flex items-center space-x-3">
                      <QrCode className="h-5 w-5 text-gray-600" />
                      <span>PIX</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4">Resumo do pedido</h2>
                
                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-gray-600">
                        {item.eventName} ({item.quantity}x)
                      </span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xl font-bold">Total:</span>
                    <span className="text-xl font-bold text-pink-600">
                      R$ {getTotalPrice().toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Processando...' : 'Finalizar compra'}
                  </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>🔒 Compra segura e protegida</p>
                  <p>Seus ingressos serão enviados por email e WhatsApp</p>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold mb-3">📱 Receba seus ingressos</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Email com QR Code</li>
                  <li>• WhatsApp com ingresso digital</li>
                  <li>• Acesso direto no app</li>
                  <li>• Histórico de compras</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;