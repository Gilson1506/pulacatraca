import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSecurePayment } from '../hooks/useSecurePayment';
import frontendCardHashService from '../services/frontendCardHashService';
import { PAGARME_CONFIG, VALIDATION_CONFIG, UI_CONFIG } from '../config/pagarme';
import './CheckoutForm.css';

const SecureCheckoutForm = ({ items = [], preSelectedPaymentMethod = null, preCalculatedTotal = null, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const {
    paymentState,
    formState,
    formData,
    updateFormData,
    setFormData,
    processPayment,
    resetForm,
    calculateTotal,
    calculateConvenienceFee,
    calculateProcessorFee,
    calculateFee,
    calculateTotalWithFee,
    formatCurrency,
  } = useSecurePayment(preCalculatedTotal);

  const [showCardForm, setShowCardForm] = useState(true);
  const [cardBrand, setCardBrand] = useState('unknown');

  // Formatação de campos
  const handleInputChange = (fieldPath, value, type = 'text') => {
    let formattedValue = value ?? '';

    switch (type) {
      case 'card_number':
        formattedValue = value.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || value;
        break;
      case 'expiry':
        formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, '$1/$2');
        break;
      case 'cpf':
        formattedValue = value
          .replace(/\D/g, '')
          .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          .slice(0, 14);
        break;
      case 'phone':
        formattedValue = value
          .replace(/\D/g, '')
          .replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        break;
      case 'cep':
        formattedValue = value
          .replace(/\D/g, '')
          .replace(/(\d{5})(\d{3}).*/, '$1-$2');
        break;
      default:
        break;
    }

    updateFormData(fieldPath, formattedValue);
  };

  // Inputs de cliente
  const renderInput = (field, label, type = 'text', placeholder = '', required = true) => {
    const fieldPath = `customer.${field}`;
    const value = formData?.customer?.[field] ?? '';
    const error = formState?.errors?.[fieldPath];

    return (
      <div className="form-group">
        <label htmlFor={field}>
          {label} {required && <span className="required">*</span>}
        </label>
        <input
          id={field}
          type={type}
          value={value}
          onChange={(e) => handleInputChange(fieldPath, e.target.value, type)}
          placeholder={placeholder}
          required={required}
          className={error ? 'error' : ''}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  };

  // Inputs de endereço
  const renderAddressInput = (field, label, placeholder = '') => {
    const fieldPath = `customer.address.${field}`;
    const value = formData?.customer?.address?.[field] ?? '';
    const error = formState?.errors?.[fieldPath];

    return (
      <div className="form-group">
        <label htmlFor={field}>
          {label} <span className="required">*</span>
        </label>
        <input
          id={field}
          type="text"
          value={value}
          onChange={(e) =>
            handleInputChange(fieldPath, e.target.value, field === 'zip_code' ? 'cep' : 'text')
          }
          placeholder={placeholder}
          required
          className={error ? 'error' : ''}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  };

  // Inputs de cartão
  const renderCardInput = (field, label, type = 'text', placeholder = '') => {
    const fieldPath = `card.${field}`;
    const value = formData?.card?.[field] ?? '';
    const error = formState?.errors?.[fieldPath];

    return (
      <div className="form-group">
        <label htmlFor={field}>
          {label} <span className="required">*</span>
        </label>
        <input
          id={field}
          type={type === 'password' ? 'password' : 'text'}
          value={value}
          onChange={(e) =>
            handleInputChange(
              fieldPath,
              e.target.value,
              field === 'number' ? 'card_number' : 'text'
            )
          }
          placeholder={placeholder}
          required
          className={error ? 'error' : ''}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  };

  // Inicializar itens e método de pagamento
  useEffect(() => {
    if (items && items.length > 0) {
      setFormData((prev) => ({
        ...prev,
        items: [...items],
      }));
    }

    if (preSelectedPaymentMethod) {
      const mappedMethod =
        preSelectedPaymentMethod === 'card' ? 'credit_card' : preSelectedPaymentMethod;
      updateFormData('paymentMethod', mappedMethod);
      setShowCardForm(mappedMethod === 'credit_card' || mappedMethod === 'debit_card');
    }

    // Scroll para o topo do formulário quando carregar
    setTimeout(() => {
      const formElement = document.getElementById('checkout-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  }, [items, preSelectedPaymentMethod, updateFormData, setFormData]);

  // Detectar bandeira do cartão
  useEffect(() => {
    const number = formData?.card?.number ? String(formData.card.number) : '';
    if (number) {
      const cleanNumber = number.replace(/\s/g, '');
      if (/^4/.test(cleanNumber)) setCardBrand('visa');
      else if (/^5[1-5]/.test(cleanNumber)) setCardBrand('mastercard');
      else if (/^3[47]/.test(cleanNumber)) setCardBrand('amex');
      else if (/^6/.test(cleanNumber)) setCardBrand('discover');
      else if (/^3[0-6]/.test(cleanNumber)) setCardBrand('diners');
      else if (/^2/.test(cleanNumber)) setCardBrand('mastercard');
      else setCardBrand('unknown');
    } else {
      setCardBrand('unknown');
    }
  }, [formData?.card?.number]);

  // Função para gerar card_hash no frontend usando SDK Pagar.me
  const generateCardHash = async (cardData) => {
    try {
      console.log('🔑 Gerando card_hash no frontend usando SDK Pagar.me...');
      
      // Usar o novo serviço de geração de card hash
      const cardHash = await frontendCardHashService.generateCardHash({
        number: cardData.card_number,
        holder_name: cardData.card_holder_name,
        exp_month: parseInt(cardData.card_expiration_date.substring(0, 2)),
        exp_year: parseInt(cardData.card_expiration_date.substring(2, 4)) + 2000,
        cvv: cardData.card_cvv,
      });

      console.log('✅ Card hash gerado com sucesso:', cardHash);
      return cardHash;
    } catch (error) {
      console.error('❌ Erro ao gerar card_hash:', error);
      throw new Error('Erro ao gerar card_hash: ' + (error.message || 'Erro desconhecido'));
    }
  };

  // -------------------------
  // Submit
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert('Faça login para continuar');
      return;
    }

    if (!formData?.items?.length) {
      alert('Adicione itens ao carrinho');
      return;
    }

    try {
      if (formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card') {
        const { number, holder_name, exp_month, exp_year, cvv } = formData.card || {};
        if (!number || !holder_name || !exp_month || !exp_year || !cvv) {
          alert('Preencha todos os dados do cartão');
          return;
        }

        // Gerar card_hash usando fetch direto para a API do Pagar.me
        const cardData = {
          card_number: String(number).replace(/\s/g, ''),
          card_holder_name: holder_name,
          card_expiration_date: `${exp_month.toString().padStart(2, '0')}${exp_year.toString().slice(-2)}`,
          card_cvv: cvv,
        };

        const card_hash = await generateCardHash(cardData);
        const paymentResult = await processPayment(card_hash);
        if (typeof onSuccess === 'function') {
          console.log('🚀 Chamando onSuccess com resultado do cartão:', paymentResult);
          onSuccess(paymentResult);
        }
      } else {
        // PIX
        const paymentResult = await processPayment();
        if (typeof onSuccess === 'function') {
          console.log('🚀 Chamando onSuccess com resultado do PIX:', paymentResult);
          onSuccess(paymentResult);
        }
      }
    } catch (error) {
      console.error('❌ Erro no checkout:', error);
      alert(`Erro: ${error?.message || 'Falha no checkout'}`);
    }
  };

  // -------------------------
  // UI Helpers
  // -------------------------
  const renderOrderSummary = () => {
    const total = calculateTotal();
    const convenienceFee = calculateConvenienceFee();
    const processorFee = calculateProcessorFee();
    const totalFee = calculateFee();
    const totalWithFee = calculateTotalWithFee();

    return (
      <div className="order-summary">
        <h3>Resumo do Pedido</h3>
        <div className="totals">
          <div className="subtotal">
            <span>Subtotal:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {convenienceFee > 0 && (
            <div className="fee-detail">
              <span>Taxa de Conveniência:</span>
              <span>{formatCurrency(convenienceFee)}</span>
            </div>
          )}
          {processorFee > 0 && (
            <div className="fee-detail">
              <span>
                Taxa da Processadora 
                ({formData.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}):
              </span>
              <span>{formatCurrency(processorFee)}</span>
            </div>
          )}
          <div className="total">
            <strong>Total Final:</strong>
            <strong>{formatCurrency(totalWithFee)}</strong>
          </div>
        </div>
      </div>
    );
  };

  const renderCardForm = () => {
    if (!(formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card'))
      return null;

    return (
      <div className="card-form compact">
        <div className="card-header">
          <h4>Dados do Cartão</h4>
          {cardBrand !== 'unknown' && <div className={`card-brand ${cardBrand}`}>{cardBrand.toUpperCase()}</div>}
        </div>

        <div className="form-grid-1">
          {renderCardInput('number', 'Número do Cartão', 'card_number', '0000 0000 0000 0000')}
        </div>

        <div className="form-grid-1">
          {renderCardInput('holder_name', 'Nome no Cartão', 'text', 'NOME COMO ESTÁ NO CARTÃO')}
        </div>

        <div className="form-grid-3">
          <div className="form-group-date">
            <label htmlFor="exp_month">Mês <span className="required">*</span></label>
            <select
              id="exp_month"
              value={formData?.card?.exp_month || ''}
              onChange={(e) => updateFormData('card.exp_month', e.target.value)}
              required
            >
              <option value="">Mês</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group-date">
            <label htmlFor="exp_year">Ano <span className="required">*</span></label>
            <select
              id="exp_year"
              value={formData?.card?.exp_year || ''}
              onChange={(e) => updateFormData('card.exp_year', e.target.value)}
              required
            >
              <option value="">Ano</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {renderCardInput('cvv', 'CVV', 'password', '123')}
        </div>
      </div>
    );
  };

  const renderPixQRCode = () => {
    if (formData.paymentMethod !== 'pix') return null;

    const hasImage = !!paymentState?.pixQrCode;
    if (!hasImage) return null;

    return (
      <div className="pix-qr-code">
        <h4>📱 PIX Gerado</h4>
        {hasImage && (
          <div className="qr-code-container">
            <img
              src={paymentState.pixQrCode}
              alt="QR Code PIX"
              className="qr-code-image"
              referrerPolicy="no-referrer"
            />
            {/* botão de abrir em nova aba removido a pedido do usuário */}
          </div>
        )}
        <p className="pix-instructions">Escaneie o QR Code</p>
        <p className="pix-expiration">⏰ Expira em 24 horas</p>
      </div>
    );
  };

  const renderStatusMessages = () => {
    if (paymentState?.isLoading) {
      return (
        <div className="status-message loading">
          <div className="spinner"></div>
          <p>{UI_CONFIG?.LOADING?.text || 'Processando pagamento...'}</p>
        </div>
      );
    }

    if (paymentState?.error) {
      return (
        <div className="status-message error">
          <p>❌ {paymentState.error}</p>
        </div>
      );
    }

    if (paymentState?.success) {
      const isPixPending =
        formData.paymentMethod === 'pix' && paymentState?.paymentStatus !== 'paid';
      return (
        <div className={`status-message ${isPixPending ? 'pending' : 'success'}`}>
          {isPixPending ? (
            <>
              <p>⏳ Aguardando pagamento PIX</p>
              {paymentState?.orderId && <p>Pedido: {paymentState.orderId}</p>}
              {renderPixQRCode()}
              <small>Após o pagamento, o status será atualizado automaticamente pela Pagar.me.</small>
            </>
          ) : (
            <>
              <p>✅ {UI_CONFIG?.MESSAGES?.SUCCESS || 'Pagamento realizado com sucesso!'}</p>
              {paymentState?.orderId && <p>Pedido: {paymentState.orderId}</p>}
            </>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div id="checkout-form" className="checkout-form">
      {/* Cabeçalho removido a pedido do usuário (título, método e mensagem de segurança) */}

      <form onSubmit={handleSubmit}>
        {renderOrderSummary()}

        <div className="form-section compact">
          <h3>Dados Pessoais</h3>
          <div className="form-grid-2">
            {renderInput('name', 'Nome Completo', 'text', 'Seu nome completo')}
            {renderInput('email', 'Email', 'email', 'seu@email.com')}
            {renderInput('document', 'CPF/CNPJ', 'cpf', '000.000.000-00')}
            {renderInput('phone', 'Telefone', 'phone', '(11) 99999-9999')}
          </div>
        </div>

        <div className="form-section compact">
          <h3>Endereço de Cobrança</h3>
          <div className="form-grid-2">
            {renderAddressInput('street', 'Rua', 'Nome da rua')}
            {renderAddressInput('number', 'Número', '123')}
            {renderAddressInput('complement', 'Complemento', 'Apto, bloco, etc.')}
            {renderAddressInput('zip_code', 'CEP', '00000-000')}
            {renderAddressInput('neighborhood', 'Bairro', 'Nome do bairro')}
            {renderAddressInput('city', 'Cidade', 'Nome da cidade')}
          </div>
          <div className="form-row-single">
            {renderAddressInput('state', 'Estado', 'SP')}
          </div>
        </div>

        {renderCardForm()}
        {renderStatusMessages()}

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel || resetForm}
            className="btn-secondary"
            disabled={paymentState?.isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={paymentState?.isLoading || !formState?.isValid || !(formData?.items?.length)}
          >
            {paymentState?.isLoading
              ? 'Processando...'
              : formData.paymentMethod === 'credit_card' || formData.paymentMethod === 'debit_card'
              ? 'Pagar com Cartão'
              : 'Gerar PIX'}
          </button>
        </div>
      </form>

      {/* Bloco de informações de segurança removido a pedido do usuário */}
    </div>
  );
};

export default SecureCheckoutForm;
