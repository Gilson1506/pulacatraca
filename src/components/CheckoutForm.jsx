import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import usePagarmePayment from '../hooks/usePagarmePayment';
import { PAGARME_CONFIG, VALIDATION_CONFIG, UI_CONFIG } from '../config/pagarme';
import './CheckoutForm.css';

/**
 * Componente principal de checkout com Pagar.me
 * Suporta cartão de crédito, débito e PIX
 */
const CheckoutForm = ({ items = [], onSuccess, onCancel }) => {
  const { user } = useAuth();
  const {
    paymentState,
    formState,
    formData,
    updateFormData,
    processPayment,
    resetForm,
    calculateTotal,
    formatCurrency,
    addItem,
    removeItem,
    updateItemQuantity
  } = usePagarmePayment();

  // Estados locais
  const [activeTab, setActiveTab] = useState('credit_card');
  const [showCardForm, setShowCardForm] = useState(true);
  const [cardBrand, setCardBrand] = useState('unknown');

  // Inicializar itens quando o componente montar
  useEffect(() => {
    if (items && items.length > 0) {
      items.forEach(item => addItem(item));
    }
  }, [items, addItem]);

  // Detectar bandeira do cartão
  useEffect(() => {
    if (formData.card?.number) {
      const cleanNumber = formData.card.number.replace(/\s/g, '');
      if (/^4/.test(cleanNumber)) setCardBrand('visa');
      else if (/^5[1-5]/.test(cleanNumber)) setCardBrand('mastercard');
      else if (/^3[47]/.test(cleanNumber)) setCardBrand('amex');
      else if (/^6/.test(cleanNumber)) setCardBrand('discover');
      else if (/^3[0-6]/.test(cleanNumber)) setCardBrand('diners');
      else if (/^2/.test(cleanNumber)) setCardBrand('mastercard');
      else setCardBrand('unknown');
    }
  }, [formData.card?.number]);

  // Atualizar método de pagamento
  const handlePaymentMethodChange = (method) => {
    updateFormData('paymentMethod', method);
    setActiveTab(method);
    setShowCardForm(method === 'credit_card' || method === 'debit_card');
  };

  // Atualizar dados do formulário
  const handleInputChange = (field, value, type = 'text') => {
    let formattedValue = value;
    
    // Formatar campos específicos
    switch (type) {
      case 'card_number':
        formattedValue = value.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || value;
        break;
      case 'expiry':
        formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, '$1/$2');
        break;
      case 'cpf':
        formattedValue = value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        break;
      case 'phone':
        formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        break;
      case 'cep':
        formattedValue = value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
        break;
    }
    
    updateFormData(field, formattedValue);
  };

  // Processar pagamento
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Faça login para continuar');
      return;
    }

    if (formData.items.length === 0) {
      alert('Adicione itens ao carrinho');
      return;
    }

    await processPayment();
  };

  // Renderizar campo de input
  const renderInput = (field, label, type = 'text', placeholder = '', required = true) => {
    const fieldPath = field.includes('.') ? field : `customer.${field}`;
    const value = field.includes('.') 
      ? field.split('.').reduce((obj, key) => obj?.[key], formData)
      : formData.customer[field];
    
    const error = formState.errors[fieldPath];

    return (
      <div className="form-group">
        <label htmlFor={field}>
          {label} {required && <span className="required">*</span>}
        </label>
        <input
          id={field}
          type={type}
          value={value || ''}
          onChange={(e) => handleInputChange(fieldPath, e.target.value, type)}
          placeholder={placeholder}
          required={required}
          className={error ? 'error' : ''}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  };

  // Renderizar campo de endereço
  const renderAddressInput = (field, label, placeholder = '') => {
    const fieldPath = `address.${field}`;
    const value = formData.customer.address[field];
    const error = formState.errors[fieldPath];

    return (
      <div className="form-group">
        <label htmlFor={field}>
          {label} <span className="required">*</span>
        </label>
        <input
          id={field}
          type="text"
          value={value || ''}
          onChange={(e) => handleInputChange(fieldPath, e.target.value)}
          placeholder={placeholder}
          required
          className={error ? 'error' : ''}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  };

  // Renderizar campo do cartão
  const renderCardInput = (field, label, type = 'text', placeholder = '') => {
    const value = formData.card[field];
    const error = formState.errors[`card.${field}`];

    return (
      <div className="form-group">
        <label htmlFor={field}>
          {label} <span className="required">*</span>
        </label>
        <input
          id={field}
          type={type}
          value={value || ''}
          onChange={(e) => handleInputChange(`card.${field}`, e.target.value, type)}
          placeholder={placeholder}
          required
          className={error ? 'error' : ''}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  };

  // Renderizar seletor de parcelas
  const renderInstallmentsSelect = () => {
    if (formData.paymentMethod !== 'credit_card') return null;

    return (
      <div className="form-group">
        <label htmlFor="installments">
          Parcelas <span className="required">*</span>
        </label>
        <select
          id="installments"
          value={formData.card.installments}
          onChange={(e) => updateFormData('card.installments', parseInt(e.target.value))}
          required
        >
          {PAGARME_CONFIG.PAYMENT_CONFIG.CARD.installments.map(installment => (
            <option key={installment} value={installment}>
              {installment}x de {formatCurrency(calculateTotal() / installment)}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Renderizar resumo do pedido
  const renderOrderSummary = () => {
    if (formData.items.length === 0) {
      return (
        <div className="order-summary empty">
          <p>Nenhum item no carrinho</p>
        </div>
      );
    }

    return (
      <div className="order-summary">
        <h3>Resumo do Pedido</h3>
        <div className="items-list">
          {formData.items.map((item, index) => (
            <div key={index} className="item">
              <div className="item-info">
                <span className="item-name">{item.description}</span>
                <span className="item-price">{formatCurrency(item.amount)}</span>
              </div>
              <div className="item-actions">
                <button
                  type="button"
                  onClick={() => updateItemQuantity(index, Math.max(1, item.quantity - 1))}
                  className="quantity-btn"
                >
                  -
                </button>
                <span className="quantity">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateItemQuantity(index, item.quantity + 1)}
                  className="quantity-btn"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="remove-btn"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="order-total">
          <strong>Total: {formatCurrency(calculateTotal())}</strong>
        </div>
      </div>
    );
  };

  // Renderizar métodos de pagamento
  const renderPaymentMethods = () => {
    return (
      <div className="payment-methods">
        <h3>Método de Pagamento</h3>
        <div className="payment-tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'credit_card' ? 'active' : ''}`}
            onClick={() => handlePaymentMethodChange('credit_card')}
          >
            💳 Cartão de Crédito
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'debit_card' ? 'active' : ''}`}
            onClick={() => handlePaymentMethodChange('debit_card')}
          >
            💳 Cartão de Débito
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'pix' ? 'active' : ''}`}
            onClick={() => handlePaymentMethodChange('pix')}
          >
            📱 PIX
          </button>

        </div>
      </div>
    );
  };

  // Renderizar formulário do cartão
  const renderCardForm = () => {
    if (!showCardForm) return null;

    return (
      <div className="card-form">
        <div className="card-header">
          <h4>Dados do Cartão</h4>
          {cardBrand !== 'unknown' && (
            <div className={`card-brand ${cardBrand}`}>
              {cardBrand.toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="card-row">
          {renderCardInput('number', 'Número do Cartão', 'text', '0000 0000 0000 0000')}
        </div>
        
        <div className="card-row">
          {renderCardInput('holder_name', 'Nome no Cartão', 'text', 'NOME COMO ESTÁ NO CARTÃO')}
        </div>
        
        <div className="card-row">
          <div className="form-group">
            <label htmlFor="exp_month">
              Mês <span className="required">*</span>
            </label>
            <select
              id="exp_month"
              value={formData.card.exp_month}
              onChange={(e) => updateFormData('card.exp_month', e.target.value)}
              required
            >
              <option value="">Mês</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString().padStart(2, '0')}>
                  {month.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="exp_year">
              Ano <span className="required">*</span>
            </label>
            <select
              id="exp_year"
              value={formData.card.exp_year}
              onChange={(e) => updateFormData('card.exp_year', e.target.value)}
              required
            >
              <option value="">Ano</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          {renderCardInput('cvv', 'CVV', 'password', '123')}
        </div>
        
        {renderInstallmentsSelect()}
      </div>
    );
  };

  // Renderizar mensagens de status
  const renderStatusMessages = () => {
    if (paymentState.isLoading) {
      return (
        <div className="status-message loading">
          <div className="spinner"></div>
          <p>{UI_CONFIG.LOADING.text}</p>
        </div>
      );
    }

    if (paymentState.error) {
      return (
        <div className="status-message error">
          <p>❌ {paymentState.error}</p>
        </div>
      );
    }

    if (paymentState.success) {
      return (
        <div className="status-message success">
          <p>✅ {UI_CONFIG.MESSAGES.SUCCESS}</p>
          {paymentState.orderId && (
            <p>Pedido: {paymentState.orderId}</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="checkout-form">
      <div className="checkout-header">
        <h2>Finalizar Compra</h2>
        <p>Complete os dados para finalizar sua compra</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Resumo do Pedido */}
        {renderOrderSummary()}

        {/* Dados do Cliente */}
        <div className="form-section">
          <h3>Dados Pessoais</h3>
          <div className="form-row">
            {renderInput('name', 'Nome Completo', 'text', 'Seu nome completo')}
            {renderInput('email', 'Email', 'email', 'seu@email.com')}
          </div>
          <div className="form-row">
            {renderInput('document', 'CPF/CNPJ', 'text', '000.000.000-00')}
            {renderInput('phone', 'Telefone', 'tel', '(11) 99999-9999')}
          </div>
        </div>

        {/* Endereço */}
        <div className="form-section">
          <h3>Endereço de Cobrança</h3>
          <div className="form-row">
            {renderAddressInput('street', 'Rua', 'Nome da rua')}
            {renderAddressInput('number', 'Número', '123')}
          </div>
          <div className="form-row">
            {renderAddressInput('complement', 'Complemento', 'Apto, bloco, etc.')}
            {renderAddressInput('zip_code', 'CEP', '00000-000')}
          </div>
          <div className="form-row">
            {renderAddressInput('neighborhood', 'Bairro', 'Nome do bairro')}
            {renderAddressInput('city', 'Cidade', 'Nome da cidade')}
          </div>
          <div className="form-row">
            {renderAddressInput('state', 'Estado', 'SP')}
          </div>
        </div>

        {/* Métodos de Pagamento */}
        {renderPaymentMethods()}

        {/* Formulário do Cartão */}
        {renderCardForm()}

        {/* Mensagens de Status */}
        {renderStatusMessages()}

        {/* Botões de Ação */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel || resetForm}
            className="btn-secondary"
            disabled={paymentState.isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={paymentState.isLoading || !formState.isValid || formData.items.length === 0}
          >
            {paymentState.isLoading ? 'Processando...' : 'Finalizar Compra'}
          </button>
        </div>
      </form>

      {/* Informações de Segurança */}
      <div className="security-info">
        <p>🔒 Seus dados estão protegidos com criptografia SSL</p>
        <p>💳 Pagamento processado com segurança pelo Pagar.me</p>
      </div>
    </div>
  );
};

export default CheckoutForm;

