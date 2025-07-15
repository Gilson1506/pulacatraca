import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, QrCode, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const CheckoutPage = () => {
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const { event, ticket } = state || {};

  useEffect(() => {
    // Se não houver dados do evento/ticket, redireciona para a home
    if (!event || !ticket) {
      console.warn('Dados do evento ou do ingresso não encontrados. Redirecionando...');
      navigate('/');
    }
  }, [event, ticket, navigate]);

  const handleQuantityChange = (amount: number) => {
    setQuantity((prev) => Math.max(1, prev + amount));
  };

  // Remover taxa de serviço
  // delete serviceFee;
  // delete totalServiceFee;
  // Ajustar cálculo do total:
  const subtotal = ticket ? ticket.price * quantity : 0;
  let taxaCompra = 0;
  if (subtotal < 30) {
    taxaCompra = subtotal * 0.03;
  } else {
    taxaCompra = subtotal * 0.10;
  }
  const taxaPagamento = paymentMethod === 'card' ? subtotal * 0.06 : 0; // 6% cartão, 0 pix
  const totalPrice = subtotal + taxaCompra + taxaPagamento;

  const handleCheckout = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simula a criação de um novo ingresso após a compra
    const newTicketPurchase = {
      id: Math.random().toString(36).substr(2, 9),
      eventName: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      ticketType: ticket.name,
      quantity: quantity,
      qrCode: `QR-${Math.random().toString(36).substr(2, 9)}`,
      status: 'ativo'
    };

    navigate('/profile', {
      state: {
        message: 'Compra realizada com sucesso! Seus ingressos foram enviados para o seu email.',
        newTickets: [newTicketPurchase] // Envia como um array
      }
    });
  };

  // Renderiza uma tela de erro se os dados não foram passados corretamente
  if (!event || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Algo deu errado.</h2>
          <p className="text-gray-600">Você precisa selecionar um evento antes de prosseguir para o checkout.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Voltar para a Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Finalizar compra</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Order Summary & Payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                <div className="flex items-start space-x-4">
                  <img src={event.image} alt={event.title} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{event.title}</h3>
                    <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="text-sm text-gray-500">{event.location}</p>
                  </div>
                </div>
              </div>

              {/* Ticket Details & Quantity */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{ticket.name}</h3>
                    <p className="text-lg font-bold text-pink-600">R$ {ticket.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-100 rounded-full p-1">
                    <button onClick={() => handleQuantityChange(-1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
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
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-3 text-gray-600" />
                        <span className="font-semibold">Cartão de Crédito</span>
                      </div>
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        {paymentMethod === 'card' && <div className="h-2 w-2 rounded-full bg-pink-500"></div>}
                      </div>
                    </div>
                  </div>
                  {/* PIX Payment Method */}
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === 'pix' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <QrCode className="h-5 w-5 mr-3 text-gray-600" />
                        <span className="font-semibold">PIX</span>
                      </div>
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        {paymentMethod === 'pix' && <div className="h-2 w-2 rounded-full bg-pink-500"></div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Price Summary & Checkout Button */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 lg:sticky lg:top-24">
                <h2 className="text-xl font-bold mb-4">Resumo</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal ({quantity} {quantity > 1 ? 'ingressos' : 'ingresso'})</span>
                    <span className="font-medium text-gray-800">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Taxa de Compra</span>
                    <span className="font-medium text-gray-800">R$ {taxaCompra.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Taxa de Pagamento</span>
                    <span className="font-medium text-gray-800">R$ {taxaPagamento.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t my-4"></div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="mt-6 w-full bg-pink-600 text-white py-3 rounded-lg font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Processando...
                    </>
                  ) : (
                    'Pagar'
                  )}
                </button>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Compras abaixo de R$ 30,00: taxa de 3%.</li>
                    <li>Compras a partir de R$ 30,00: taxa de 10%.</li>
                    <li>Pagamento por cartão: taxa adicional de 6%.</li>
                    <li>Pagamento por PIX: taxa 0%.</li>
                    <li>Sua compra será verificada e processada. Aguarde a confirmação no status do pedido.</li>
                  </ul>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">Compra 100% segura.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;