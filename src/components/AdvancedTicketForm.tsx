import React, { useState } from 'react';
import { Plus, Minus, X, Calendar, Clock, Info } from 'lucide-react';

interface BatchData {
  batch_number: number;
  batch_name: string;
  price_masculine: number;
  price_feminine: number;
  quantity: number;
  sale_start_date: string;
  sale_start_time: string;
  sale_end_date: string;
  sale_end_time: string;
}

interface AdvancedTicketData {
  id: string;
  title: string;
  area: string;
  price: number;
  price_feminine: number;
  quantity: number;
  description: string;
  sale_period_type: 'date' | 'batch';
  sale_start_date: string;
  sale_start_time: string;
  sale_end_date: string;
  sale_end_time: string;
  availability: 'public' | 'restricted' | 'manual';
  min_quantity: number;
  max_quantity: number;
  has_half_price: boolean;
  batches: BatchData[];
}

interface AdvancedTicketFormProps {
  ticket: AdvancedTicketData;
  onUpdate: (ticketId: string, updates: Partial<AdvancedTicketData>) => void;
  onRemove: (ticketId: string) => void;
  canRemove: boolean;
}

const AdvancedTicketForm: React.FC<AdvancedTicketFormProps> = ({
  ticket,
  onUpdate,
  onRemove,
  canRemove
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateField = (field: keyof AdvancedTicketData, value: any) => {
    onUpdate(ticket.id, { [field]: value });
  };

  const addBatch = () => {
    const newBatch: BatchData = {
      batch_number: ticket.batches.length + 1,
      batch_name: `Lote ${ticket.batches.length + 1}`,
      price_masculine: ticket.price,
      price_feminine: ticket.price_feminine,
      quantity: Math.floor(ticket.quantity / 3),
      sale_start_date: '',
      sale_start_time: '00:00',
      sale_end_date: '',
      sale_end_time: '23:59'
    };
    
    updateField('batches', [...ticket.batches, newBatch]);
  };

  const updateBatch = (index: number, field: keyof BatchData, value: any) => {
    const newBatches = [...ticket.batches];
    newBatches[index] = { ...newBatches[index], [field]: value };
    updateField('batches', newBatches);
  };

  const removeBatch = (index: number) => {
    const newBatches = ticket.batches.filter((_, i) => i !== index);
    updateField('batches', newBatches);
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">🎫</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {ticket.title || 'Novo Ingresso'}
            </h3>
            <p className="text-sm text-gray-600">
              Configure preços, lotes e disponibilidade
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {isExpanded ? 'Menos' : 'Mais'} opções
          </button>
          {canRemove && (
            <button
              onClick={() => onRemove(ticket.id)}
              className="w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Campos Básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título do Ingresso *
          </label>
          <input
            type="text"
            value={ticket.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Ex: VIP - Área Open Bar"
            maxLength={45}
          />
          <p className="text-xs text-gray-500 mt-1">
            {45 - ticket.title.length} caracteres restantes
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Área do Ingresso *
          </label>
          <select
            value={ticket.area}
            onChange={(e) => updateField('area', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="Pista">Pista</option>
            <option value="Camarote">Camarote</option>
            <option value="Área VIP">Área VIP</option>
            <option value="Backstage">Backstage</option>
            <option value="Premium">Premium</option>
            <option value="Open Bar">Open Bar</option>
          </select>
        </div>
      </div>

      {/* Preços por Gênero */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-3">
          Preços por Gênero
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preço Masculino (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={ticket.price}
              onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preço Feminino (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={ticket.price_feminine}
              onChange={(e) => updateField('price_feminine', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Período das Vendas */}
      <div>
        <h4 className="text-md font-semibold text-gray-800 mb-3">
          Período das Vendas
        </h4>
        
        <div className="flex gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              name={`sale_period_${ticket.id}`}
              value="date"
              checked={ticket.sale_period_type === 'date'}
              onChange={(e) => updateField('sale_period_type', e.target.value)}
              className="mr-2"
            />
            Por data
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={`sale_period_${ticket.id}`}
              value="batch"
              checked={ticket.sale_period_type === 'batch'}
              onChange={(e) => updateField('sale_period_type', e.target.value)}
              className="mr-2"
            />
            Por lote
          </label>
        </div>

        {ticket.sale_period_type === 'date' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Início das Vendas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={ticket.sale_start_date}
                  onChange={(e) => updateField('sale_start_date', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={ticket.sale_start_time}
                  onChange={(e) => updateField('sale_start_time', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Término das Vendas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={ticket.sale_end_date}
                  onChange={(e) => updateField('sale_end_date', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={ticket.sale_end_time}
                  onChange={(e) => updateField('sale_end_time', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-sm font-medium text-gray-700">Lotes</h5>
              <button
                onClick={addBatch}
                className="flex items-center gap-1 px-3 py-1 text-sm text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Lote
              </button>
            </div>
            
            <div className="space-y-4">
              {ticket.batches.map((batch, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="font-medium text-gray-800">Lote {batch.batch_number}</h6>
                    {ticket.batches.length > 1 && (
                      <button
                        onClick={() => removeBatch(index)}
                        className="text-red-500 hover:bg-red-50 w-6 h-6 rounded flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Preço Masculino (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={batch.price_masculine}
                        onChange={(e) => updateBatch(index, 'price_masculine', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Preço Feminino (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={batch.price_feminine}
                        onChange={(e) => updateBatch(index, 'price_feminine', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={batch.quantity}
                        onChange={(e) => updateBatch(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Início das Vendas
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={batch.sale_start_date}
                          onChange={(e) => updateBatch(index, 'sale_start_date', e.target.value)}
                          className="flex-1 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-pink-500"
                        />
                        <input
                          type="time"
                          value={batch.sale_start_time}
                          onChange={(e) => updateBatch(index, 'sale_start_time', e.target.value)}
                          className="px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configurações Avançadas */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade Total
              </label>
              <input
                type="number"
                min="1"
                value={ticket.quantity}
                onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mínima por Compra
              </label>
              <input
                type="number"
                min="1"
                value={ticket.min_quantity}
                onChange={(e) => updateField('min_quantity', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máxima por Compra
              </label>
              <input
                type="number"
                min="1"
                value={ticket.max_quantity}
                onChange={(e) => updateField('max_quantity', parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disponibilidade
            </label>
            <select
              value={ticket.availability}
              onChange={(e) => updateField('availability', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="public">Para todo o público</option>
              <option value="restricted">Restrito a convidados</option>
              <option value="manual">Para ser adicionado manualmente</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={ticket.has_half_price}
                onChange={(e) => updateField('has_half_price', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Criar meia-entrada?
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Saiba mais sobre as políticas de meia-entrada
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição do Ingresso (opcional)
            </label>
            <textarea
              value={ticket.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              rows={3}
              placeholder="Esse ingresso dá direito a 2 bebidas + copo personalizado."
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {100 - ticket.description.length} caracteres restantes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedTicketForm;