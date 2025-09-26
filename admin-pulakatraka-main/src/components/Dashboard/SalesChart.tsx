import React, { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SalesData {
  month: string;
  sales: number;
}

interface MonthlySummary {
  currentMonth: number;
  previousMonth: number;
  growth: number;
}

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function SalesChart() {
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({
    currentMonth: 0,
    previousMonth: 0,
    growth: 0
  });

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);

        // Buscar vendas dos últimos 12 meses
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 11);

        const { data: tickets, error } = await supabase
          .from('tickets')
          .select('price, purchase_date')
          .gte('purchase_date', startDate.toISOString())
          .lte('purchase_date', endDate.toISOString());

        if (error) {
          console.log('⚠️ Erro ao buscar tickets para SalesChart:', error);
          // Definir dados padrão em caso de erro
          const defaultData = Array(12).fill(0).map((_, i) => ({
            month: monthNames[i],
            sales: 0
          }));
          setSalesData(defaultData);
          setSummary({
            currentMonth: 0,
            previousMonth: 0,
            growth: 0
          });
          return;
        }

        // Agrupar vendas por mês
        const monthlySales = Array(12).fill(0).map((_, i) => ({
          month: monthNames[i],
          sales: 0
        }));

        tickets?.forEach(ticket => {
          if (ticket.purchase_date) {
            const date = new Date(ticket.purchase_date);
            const monthIndex = date.getMonth();
            if (monthIndex >= 0 && monthIndex < 12) {
              monthlySales[monthIndex].sales += ticket.price || 0;
            }
          }
        });

        // Calcular resumo mensal
        const currentMonthIndex = new Date().getMonth();
        const previousMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
        const currentMonthSales = monthlySales[currentMonthIndex].sales;
        const previousMonthSales = monthlySales[previousMonthIndex].sales;
        const growth = previousMonthSales === 0 ? 0 : ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100;

        setSalesData(monthlySales);
        setSummary({
          currentMonth: currentMonthSales,
          previousMonth: previousMonthSales,
          growth
        });
      } catch (error) {
        console.error('❌ Erro ao buscar dados de vendas:', error);
        // Definir dados padrão em caso de erro
        const defaultData = Array(12).fill(0).map((_, i) => ({
          month: monthNames[i],
          sales: 0
        }));
        setSalesData(defaultData);
        setSummary({
          currentMonth: 0,
          previousMonth: 0,
          growth: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  const maxSales = Math.max(...salesData.map(d => d.sales));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vendas Mensais</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Performance de vendas ao longo do ano</p>
        </div>
        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {summary.growth > 0 ? '+' : ''}{summary.growth.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="h-64">
        <div className="flex items-end justify-between h-full space-x-2">
          {salesData.map((data) => (
            <div key={data.month} className="flex flex-col items-center flex-1">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 rounded-t-md min-h-[20px] transition-all duration-500 hover:from-blue-600 hover:to-blue-500 dark:hover:from-blue-700 dark:hover:to-blue-600"
                style={{ 
                  height: `${maxSales === 0 ? 0 : (data.sales / maxSales) * 100}%` 
                }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">{data.month}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summary.currentMonth)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Este mês</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summary.previousMonth)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Mês anterior</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${summary.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {summary.growth > 0 ? '+' : ''}{summary.growth.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Crescimento</p>
        </div>
      </div>
    </div>
  );
}