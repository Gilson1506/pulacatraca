// src/hooks/usePagBankPayment.ts
import { useState } from 'react';
import PagBankService, { PagBankPixOrder, PagBankCardOrder, PagBankResponse } from '../services/pagbankService';

interface UsePagBankPaymentReturn {
  loading: boolean;
  error: string | null;
  result: PagBankResponse | null;
  createPixPayment: (orderData: PagBankPixOrder) => Promise<void>;
  createCardPayment: (orderData: PagBankCardOrder) => Promise<void>;
  getOrder: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  generateCardToken: (cardData: any) => Promise<string>;
  clearError: () => void;
  clearResult: () => void;
}

export const usePagBankPayment = (): UsePagBankPaymentReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PagBankResponse | null>(null);

  const pagBankService = new PagBankService();

  const handleError = (err: any) => {
    console.error('Erro no PagBank:', err);
    setError(err.message || 'Erro desconhecido');
  };

  const createPixPayment = async (orderData: PagBankPixOrder) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await pagBankService.createPixOrder(orderData);
      setResult(response);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const createCardPayment = async (orderData: PagBankCardOrder) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await pagBankService.createCardOrder(orderData);
      setResult(response);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const getOrder = async (orderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pagBankService.getOrder(orderId);
      setResult(response);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await pagBankService.cancelOrder(orderId);
      setResult(response);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const generateCardToken = async (cardData: any): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const response = await pagBankService.generateCardToken(cardData);
      return response.card_token;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const clearResult = () => {
    setResult(null);
  };

  return {
    loading,
    error,
    result,
    createPixPayment,
    createCardPayment,
    getOrder,
    cancelOrder,
    generateCardToken,
    clearError,
    clearResult
  };
};

export default usePagBankPayment;
