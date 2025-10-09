import React, { ElementType } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string | null;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: ElementType;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'emerald' | 'indigo' | 'cyan' | 'amber' | 'teal' | 'pink';
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-800'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-100 dark:border-green-800'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-100 dark:border-orange-800'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-800'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-800'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-800'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-800'
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    icon: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-100 dark:border-cyan-800'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800'
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    icon: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-100 dark:border-teal-800'
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    icon: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-100 dark:border-pink-800'
  }
};

export default function StatsCard({ title, value, change, changeType, icon: Icon, color }: StatsCardProps) {
  const styles = colorStyles[color] || colorStyles.blue; // Fallback para azul se cor não existir

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${styles.border} p-6 hover:shadow-lg transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value}</p>
          {change && (
            <div className="flex items-center space-x-1">
              <span className={`text-sm font-semibold ${
                changeType === 'positive' ? 'text-green-600' : 
                changeType === 'negative' ? 'text-red-600' : 
                'text-gray-600 dark:text-gray-400'
              }`}>
                {change}
              </span>
              {changeType !== 'neutral' && (
                <span className="text-sm text-gray-500 dark:text-gray-500">vs mês anterior</span>
              )}
            </div>
          )}
        </div>
        <div className={`${styles.bg} p-4 rounded-xl`}>
          <Icon className={`w-8 h-8 ${styles.icon}`} />
        </div>
      </div>
    </div>
  );
}