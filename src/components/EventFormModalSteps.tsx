import React from 'react';
import { X, Upload } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';

// ✅ COMPONENTES SEPARADOS PARA EVITAR PROBLEMAS DE RENDERIZAÇÃO

interface StepProps {
  formData: any;
  setFormData: (data: any) => void;
  imagePreview?: string;
  uploadingImage: boolean;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
}

export const MobileStep1: React.FC<StepProps> = ({ 
  formData, 
  setFormData, 
  imagePreview, 
  uploadingImage, 
  handleImageChange, 
  handleRemoveImage 
}) => (
  <div className="space-y-6">
    {/* Banner */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Banner do Evento
      </label>
      <p className="text-sm text-gray-500 mb-4">
        Escolha uma imagem atrativa para seu evento. Recomendamos dimensões 16:9 (ex: 1200x675px).
      </p>
      <div className="flex items-start space-x-4">
        {imagePreview ? (
          <div className="relative w-32 h-32">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              title="Remover imagem"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="w-full">
            <label className={`w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {uploadingImage ? (
                <>
                  <ProfessionalLoader size="lg" className="mb-2" />
                  <span className="mt-2 text-sm text-gray-500">Enviando imagem...</span>
                  <span className="text-xs text-gray-400">Por favor, aguarde</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-sm text-gray-600 font-medium">Clique para fazer upload</span>
                  <span className="text-xs text-gray-400">PNG, JPG, JPEG até 5MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={uploadingImage}
              />
            </label>
          </div>
        )}
      </div>
    </div>

    {/* Nome */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Nome do Evento
      </label>
      <input
        type="text"
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        required
      />
    </div>

    {/* Datas e Horários */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Data e Horário</h3>
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Início
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Horário de Início
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Término *
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Horário de Término *
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            required
          />
        </div>
      </div>
    </div>

    {/* Local */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Local
      </label>
      <input
        type="text"
        value={formData.location}
        onChange={e => setFormData({ ...formData, location: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        required
      />
    </div>

    {/* Descrição */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Descrição
      </label>
      <textarea
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        rows={4}
        required
      />
    </div>

    {/* Categoria e Preço */}
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categoria
        </label>
        <input
          type="text"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preço (€)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          required
        />
      </div>
    </div>

    {/* Status */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Status
      </label>
      <select
        value={formData.status}
        onChange={e => setFormData({ ...formData, status: e.target.value as 'ativo' | 'adiado' | 'cancelado' })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        <option value="ativo">Ativo</option>
        <option value="adiado">Adiado</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </div>
  </div>
);

export const MobileStep2: React.FC<StepProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    {/* Total de Ingressos */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Total de Ingressos
      </label>
      <input
        type="number"
        value={formData.totalTickets}
        onChange={e => setFormData({ ...formData, totalTickets: parseInt(e.target.value) })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        required
        min="1"
      />
    </div>

    {/* Notas Importantes */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Notas Importantes
      </label>
      {formData.importantNotes.map((note: string, index: number) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            value={note}
            onChange={e => {
              const newNotes = [...formData.importantNotes];
              newNotes[index] = e.target.value;
              setFormData({ ...formData, importantNotes: newNotes });
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Digite uma nota importante..."
          />
        </div>
      ))}
    </div>

    {/* Atrações */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Atrações
      </label>
      {formData.attractions.map((attraction: string, index: number) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            value={attraction}
            onChange={e => {
              const newAttractions = [...formData.attractions];
              newAttractions[index] = e.target.value;
              setFormData({ ...formData, attractions: newAttractions });
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Nome da atração..."
          />
        </div>
      ))}
    </div>
  </div>
);

export const MobileStep3: React.FC<StepProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    {/* Telefone */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Telefone de Contato
      </label>
      <input
        type="tel"
        value={formData.contactInfo.phone}
        onChange={e => setFormData({
          ...formData,
          contactInfo: { ...formData.contactInfo, phone: e.target.value }
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        placeholder="(+351) 123 456 789"
        required
      />
    </div>

    {/* Horários */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Horários de Atendimento
      </label>
      {formData.contactInfo.hours.map((hour: string, index: number) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            value={hour}
            onChange={e => {
              const newHours = [...formData.contactInfo.hours];
              newHours[index] = e.target.value;
              setFormData({
                ...formData,
                contactInfo: { ...formData.contactInfo, hours: newHours }
              });
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Ex: Segunda a Sexta: 9h às 18h"
            required
          />
        </div>
      ))}
    </div>
  </div>
);