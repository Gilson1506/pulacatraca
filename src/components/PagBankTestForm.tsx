// src/components/PagBankTestForm.tsx
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePagBankPayment } from '../hooks/usePagBankPayment';

interface PagBankTestFormProps {
  onPaymentSuccess?: (data: any) => void;
  onPaymentError?: (error: any) => void;
}

const PagBankTestForm: React.FC<PagBankTestFormProps> = ({
  onPaymentSuccess,
  onPaymentError
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  
  const {
    loading,
    error,
    result,
    createPixPayment,
    createCardPayment,
    clearError,
    clearResult
  } = usePagBankPayment();

  // Estados para dados do cliente
  const [customerData, setCustomerData] = useState({
    name: 'Jose da Silva',
    email: 'jose@teste.com',
    tax_id: '12345678909',
    phone: '11999999999'
  });

  // Estados para dados do item
  const [itemData, setItemData] = useState({
    name: 'Ingresso VIP Teste',
    quantity: 1,
    unit_amount: 5000 // R$ 50,00
  });

  // Estados para dados do cartão
  const [cardData, setCardData] = useState({
    number: '4111111111111111',
    exp_month: '03',
    exp_year: '2026',
    security_code: '123',
    holder_name: 'Jose da Silva',
    holder_tax_id: '12345678909'
  });

  const handlePayment = async () => {
    try {
      if (paymentMethod === 'pix') {
        const pixOrder = {
          reference_id: `teste-pix-${Date.now()}`,
          customer: {
            name: customerData.name,
            email: customerData.email,
            tax_id: customerData.tax_id,
            phones: [
              {
                country: '55',
                area: customerData.phone.substring(0, 2),
                number: customerData.phone.substring(2),
                type: 'MOBILE'
              }
            ]
          },
          items: [
            {
              name: itemData.name,
              quantity: itemData.quantity,
              unit_amount: itemData.unit_amount
            }
          ],
          qr_codes: [
            {
              amount: {
                value: itemData.unit_amount * itemData.quantity
              },
              expiration_date: new Date(Date.now() + 3600000).toISOString()
            }
          ]
        };

        await createPixPayment(pixOrder);
      } else {
        const cardOrder = {
          reference_id: `teste-cartao-${Date.now()}`,
          customer: {
            name: customerData.name,
            email: customerData.email,
            tax_id: customerData.tax_id,
            phones: [
              {
                country: '55',
                area: customerData.phone.substring(0, 2),
                number: customerData.phone.substring(2),
                type: 'MOBILE'
              }
            ]
          },
          items: [
            {
              name: itemData.name,
              quantity: itemData.quantity,
              unit_amount: itemData.unit_amount
            }
          ],
          charges: [
            {
              reference_id: `charge-${Date.now()}`,
              description: 'Pagamento com cartão de crédito',
              amount: {
                value: itemData.unit_amount * itemData.quantity,
                currency: 'BRL'
              },
              payment_method: {
                type: 'CREDIT_CARD',
                installments: 1,
                capture: true,
                soft_descriptor: 'PulaKatraca',
                card: {
                  number: cardData.number,
                  exp_month: cardData.exp_month,
                  exp_year: cardData.exp_year,
                  security_code: cardData.security_code,
                  holder: {
                    name: cardData.holder_name,
                    tax_id: cardData.holder_tax_id
                  }
                }
              }
            }
          ]
        };

        await createCardPayment(cardOrder);
      }

      if (result) {
        onPaymentSuccess?.(result);
      }
    } catch (err: any) {
      onPaymentError?.(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Cabeçalho Profissional */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl p-8 shadow-2xl mb-6">
        <div className="text-center text-white">
          <div className="flex justify-center items-center mb-3">
            <div className="bg-white rounded-full p-3 mr-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">PagBank Payment Gateway</h1>
          </div>
          <p className="text-blue-100 text-sm">Ambiente de Testes - Sandbox</p>
          <div className="mt-4 flex justify-center gap-4 text-xs">
            <span className="bg-white/20 px-3 py-1 rounded-full">✓ PIX Instantâneo</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">✓ Cartão de Crédito</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">✓ API Sandbox</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-b-2xl shadow-xl p-8">

      {/* Seletor de método de pagamento */}
      <div className="mb-8">
        <label className="block text-lg font-semibold mb-4 text-gray-800">Escolha o Método de Pagamento</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'pix' 
              ? 'border-green-500 bg-green-50 shadow-md' 
              : 'border-gray-200 hover:border-green-300'
          }`}>
            <input
              type="radio"
              value="pix"
              checked={paymentMethod === 'pix'}
              onChange={(e) => setPaymentMethod(e.target.value as 'pix' | 'credit_card')}
              className="mr-3 w-5 h-5 text-green-600"
            />
            <div className="flex items-center flex-1">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-4.41 0-8-3.59-8-8V7l8-4 8 4v5c0 4.41-3.59 8-8 8z"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800">PIX</div>
                <div className="text-xs text-gray-600">Pagamento instantâneo</div>
              </div>
            </div>
          </label>
          <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'credit_card' 
              ? 'border-blue-500 bg-blue-50 shadow-md' 
              : 'border-gray-200 hover:border-blue-300'
          }`}>
            <input
              type="radio"
              value="credit_card"
              checked={paymentMethod === 'credit_card'}
              onChange={(e) => setPaymentMethod(e.target.value as 'pix' | 'credit_card')}
              className="mr-3 w-5 h-5 text-blue-600"
            />
            <div className="flex items-center flex-1">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800">Cartão de Crédito</div>
                <div className="text-xs text-gray-600">Parcelamento disponível</div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Dados do cliente */}
      <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
          <span className="bg-blue-100 p-2 rounded-lg mr-2">👤</span>
          Dados do Cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Nome Completo</label>
            <input
              type="text"
              value={customerData.name}
              onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="Digite o nome completo"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">E-mail</label>
            <input
              type="email"
              value={customerData.email}
              onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="exemplo@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">CPF</label>
            <input
              type="text"
              value={customerData.tax_id}
              onChange={(e) => setCustomerData({...customerData, tax_id: e.target.value})}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Telefone</label>
            <input
              type="text"
              value={customerData.phone}
              onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </div>

      {/* Dados do item */}
      <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
          <span className="bg-purple-100 p-2 rounded-lg mr-2">🎫</span>
          Dados do Produto/Serviço
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-gray-700">Descrição do Item</label>
            <input
              type="text"
              value={itemData.name}
              onChange={(e) => setItemData({...itemData, name: e.target.value})}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              placeholder="Ex: Ingresso VIP, Produto, Serviço..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Quantidade</label>
            <input
              type="number"
              value={itemData.quantity}
              onChange={(e) => setItemData({...itemData, quantity: parseInt(e.target.value) || 1})}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              min="1"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-semibold mb-2 text-gray-700">Valor Unitário (em centavos)</label>
            <input
              type="number"
              value={itemData.unit_amount}
              onChange={(e) => setItemData({...itemData, unit_amount: parseInt(e.target.value) || 0})}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              min="1"
              placeholder="Ex: 5000 = R$ 50,00"
            />
          </div>
        </div>
        <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Valor Total:</span>
            <span className="text-2xl font-bold text-purple-600">
              R$ {((itemData.unit_amount * itemData.quantity) / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Dados do cartão (apenas para cartão de crédito) */}
      {paymentMethod === 'credit_card' && (
        <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span className="bg-blue-100 p-2 rounded-lg mr-2">💳</span>
            Dados do Cartão de Crédito
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2 text-gray-700">Número do Cartão</label>
              <input
                type="text"
                value={cardData.number}
                onChange={(e) => setCardData({...cardData, number: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono text-lg"
                placeholder="4111 1111 1111 1111"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Mês de Validade</label>
              <input
                type="text"
                value={cardData.exp_month}
                onChange={(e) => setCardData({...cardData, exp_month: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="12"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Ano de Validade</label>
              <input
                type="text"
                value={cardData.exp_year}
                onChange={(e) => setCardData({...cardData, exp_year: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="2030"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">CVV</label>
              <input
                type="text"
                value={cardData.security_code}
                onChange={(e) => setCardData({...cardData, security_code: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono"
                placeholder="123"
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Nome no Cartão</label>
              <input
                type="text"
                value={cardData.holder_name}
                onChange={(e) => setCardData({...cardData, holder_name: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all uppercase"
                placeholder="NOME COMO NO CARTÃO"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">CPF do Titular</label>
              <input
                type="text"
                value={cardData.holder_tax_id}
                onChange={(e) => setCardData({...cardData, holder_tax_id: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="000.000.000-00"
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100/50 border border-blue-300 rounded-lg">
            <p className="text-xs text-gray-700">
              🔒 <strong>Teste Seguro:</strong> Use o cartão 4539 6206 5992 2097 para testes no ambiente sandbox.
            </p>
          </div>
        </div>
      )}

      {/* Botão de pagamento */}
      <div className="mb-8">
        <button
          onClick={handlePayment}
          disabled={loading}
          className={`w-full py-5 px-8 rounded-xl font-bold text-white text-lg shadow-2xl transform transition-all duration-200 ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : paymentMethod === 'pix' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-105 hover:shadow-3xl' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-105 hover:shadow-3xl'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando Pagamento...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {paymentMethod === 'pix' ? (
                <>
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                  </svg>
                  Gerar QR Code PIX
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pagar com Cartão de Crédito
                </>
              )}
            </span>
          )}
        </button>
      </div>

      {/* Resultado PIX */}
      {result && result.qr_codes && result.qr_codes.length > 0 && (
        <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg">
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-green-800 mb-2">✅ PIX Gerado com Sucesso!</h3>
            <p className="text-green-700">Escaneie o QR Code abaixo para pagar</p>
          </div>
          
          {/* QR Code Visual */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-6 rounded-xl shadow-xl border-4 border-green-500">
              {/* Tentar usar a imagem da API primeiro, senão gerar com biblioteca */}
              {result.qr_codes[0].links?.find((l: any) => l.media === 'image/png')?.href ? (
                <img 
                  src={result.qr_codes[0].links.find((l: any) => l.media === 'image/png').href}
                  alt="QR Code PIX"
                  className="w-[280px] h-[280px]"
                />
              ) : (
                <QRCodeSVG 
                  value={result.qr_codes[0].text}
                  size={280}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
          </div>

          {/* Informações do Pagamento */}
          <div className="bg-white rounded-lg p-4 shadow-md space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">📋 ID do Pedido:</span>
                <span className="text-gray-600 break-all">{result.id}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">💰 Valor:</span>
                <span className="text-gray-600">
                  R$ {((result.qr_codes[0].amount?.value || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">⏰ Expira em:</span>
                <span className="text-gray-600">
                  {new Date(result.qr_codes[0].expiration_date).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">🔗 Referência:</span>
                <span className="text-gray-600">{result.reference_id}</span>
              </div>
            </div>

            {/* PIX Copia e Cola */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="font-semibold text-gray-700 mb-2">📋 PIX Copia e Cola:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={result.qr_codes[0].text}
                  readOnly
                  className="flex-1 p-2 text-xs bg-gray-50 border border-gray-300 rounded-md font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.qr_codes[0].text);
                    alert('✅ Código PIX copiado!');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-green-800 hover:text-green-900">
              🔍 Ver resposta completa da API
            </summary>
            <pre className="mt-2 text-xs bg-white p-3 rounded-lg border border-gray-200 overflow-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Resultado Cartão */}
      {result && result.charges && result.charges.length > 0 && (
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-lg">
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-blue-800 mb-2">
              {result.charges[0].status === 'PAID' ? '✅ Pagamento Aprovado!' : '⏳ Processando Pagamento...'}
            </h3>
            <p className="text-blue-700">
              {result.charges[0].status === 'PAID' 
                ? 'Sua transação foi concluída com sucesso' 
                : 'Aguarde a confirmação do pagamento'}
            </p>
          </div>

          {/* Status Visual */}
          <div className="flex justify-center mb-6">
            <div className={`p-8 rounded-full ${
              result.charges[0].status === 'PAID' 
                ? 'bg-green-100 border-4 border-green-500' 
                : 'bg-yellow-100 border-4 border-yellow-500'
            }`}>
              <div className="text-6xl">
                {result.charges[0].status === 'PAID' ? '✓' : '⏱'}
              </div>
            </div>
          </div>

          {/* Informações do Pagamento */}
          <div className="bg-white rounded-lg p-4 shadow-md space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">📋 ID do Pedido:</span>
                <span className="text-gray-600 break-all">{result.id}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">💳 ID da Cobrança:</span>
                <span className="text-gray-600 break-all">{result.charges[0].id}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">💰 Valor:</span>
                <span className="text-gray-600">
                  R$ {((result.charges[0].amount?.value || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">📊 Status:</span>
                <span className={`font-semibold ${
                  result.charges[0].status === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {result.charges[0].status}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">🕐 Criado em:</span>
                <span className="text-gray-600">
                  {new Date(result.charges[0].created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              {result.charges[0].paid_at && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 mr-2">✅ Pago em:</span>
                  <span className="text-gray-600">
                    {new Date(result.charges[0].paid_at).toLocaleString('pt-BR')}
                  </span>
              </div>
            )}
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">💳 Método:</span>
                <span className="text-gray-600">
                  {result.charges[0].payment_method?.type || 'N/A'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-gray-700 mr-2">🔗 Referência:</span>
                <span className="text-gray-600">{result.reference_id}</span>
              </div>
            </div>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-blue-800 hover:text-blue-900">
              🔍 Ver resposta completa da API
            </summary>
            <pre className="mt-2 text-xs bg-white p-3 rounded-lg border border-gray-200 overflow-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-lg font-semibold mb-2 text-red-800">❌ Erro no Pagamento</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      </div>
    </div>
  );
};

export default PagBankTestForm;
