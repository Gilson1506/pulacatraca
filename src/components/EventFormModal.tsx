import React, { useState, useEffect } from 'react';
import { uploadEventBanner, deleteEventBanner } from '../lib/supabase';
import LoadingButton from './LoadingButton';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
  onSubmit: (eventData: any) => void;
}

interface Event {
  id?: string;
  name: string;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  location: string;
  description: string;
  status: 'ativo' | 'adiado' | 'cancelado';
  ticketsSold?: number;
  totalTickets: number;
  revenue?: number;
  category: string;
  price: number;
  image?: string;
  dateLabel?: string;
  importantNotes: string[];
  sections: {
    name: string;
    details: string[];
    note?: string;
  }[];
  attractions: string[];
  contactInfo: {
    phone: string;
    hours: string[];
  };
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, event, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [currentSection, setCurrentSection] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<Event>(event || {
    name: '',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    location: '',
    description: '',
    status: 'ativo',
    totalTickets: 100,
    category: '',
    price: 0,
    image: '',
    importantNotes: [''],
    sections: [{ name: '', details: [''], note: '' }],
    attractions: [''],
    contactInfo: {
      phone: '',
      hours: ['']
    }
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadEventBanner(file);
      setFormData({ ...formData, image: imageUrl });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (formData.image) {
      try {
        await deleteEventBanner(formData.image);
      } catch (error) {
        console.error('Erro ao deletar imagem:', error);
      }
      setFormData({ ...formData, image: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addArrayItem = (field: keyof Event, index: number) => {
    const newData = { ...formData };
    if (field === 'importantNotes') {
      (newData[field] as string[]).splice(index + 1, 0, '');
    } else if (field === 'attractions') {
      (newData[field] as string[]).splice(index + 1, 0, '');
    }
    setFormData(newData);
  };

  const removeArrayItem = (field: keyof Event, index: number) => {
    const newData = { ...formData };
    if (field === 'importantNotes' && (newData[field] as string[]).length > 1) {
      (newData[field] as string[]).splice(index, 1);
    } else if (field === 'attractions' && (newData[field] as string[]).length > 1) {
      (newData[field] as string[]).splice(index, 1);
    }
    setFormData(newData);
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [...formData.sections, { name: '', details: [''], note: '' }]
    });
  };

  const removeSection = (sectionIndex: number) => {
    if (formData.sections.length > 1) {
      const newSections = [...formData.sections];
      newSections.splice(sectionIndex, 1);
      setFormData({ ...formData, sections: newSections });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {event ? 'Editar Evento' : 'Criar Novo Evento'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Navigation */}
          {isMobile ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentStep === 1 && 'Informações Básicas'}
                  {currentStep === 2 && 'Ingressos e Detalhes'}
                  {currentStep === 3 && 'Contato e Finalizar'}
                </h3>
                <span className="text-sm text-gray-500">
                  {currentStep}/3
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => setCurrentSection('basic')}
                className={`px-4 py-2 -mb-px ${currentSection === 'basic' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}
              >
                Básico
              </button>
              <button
                type="button"
                onClick={() => setCurrentSection('tickets')}
                className={`px-4 py-2 -mb-px ${currentSection === 'tickets' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}
              >
                Ingressos
              </button>
              <button
                type="button"
                onClick={() => setCurrentSection('details')}
                className={`px-4 py-2 -mb-px ${currentSection === 'details' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}
              >
                Detalhes
              </button>
              <button
                type="button"
                onClick={() => setCurrentSection('contact')}
                className={`px-4 py-2 -mb-px ${currentSection === 'contact' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}
              >
                Contato
              </button>
            </div>
          )}

          {/* Content */}
          <div className="form-content">
            {/* Mobile Steps */}
            {isMobile ? (
              <div className="mobile-steps-container">
                {/* Step 1 - Basic Info */}
                <div className={currentStep === 1 ? 'block' : 'hidden'}>
                  <div className="space-y-6">
                    {/* Banner */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banner do Evento
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Recomendado: 1200x600px, máximo 5MB
                      </p>
                      
                      {formData.image ? (
                        <div className="relative">
                          <img src={formData.image} alt="Banner" className="w-full h-48 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                            {isUploading ? (
                              <>
                                <div className="text-center">
                                  ⏳
                                  <span className="mt-2 text-sm text-gray-500 block">Enviando imagem...</span>
                                  <span className="text-xs text-gray-400 block">Por favor, aguarde</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-center">
                                  📁
                                  <span className="mt-2 text-sm text-gray-600 font-medium block">Clique para fazer upload</span>
                                  <span className="text-xs text-gray-400 block">PNG, JPG, JPEG até 5MB</span>
                                </div>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                          />
                        </label>
                      )}
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

                    {/* Localização */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Localização
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
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2 - Tickets */}
                <div className={currentStep === 2 ? 'block' : 'hidden'}>
                  <div className="space-y-6">
                    {/* Categoria */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoria
                      </label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      >
                        <option value="">Selecione uma categoria</option>
                        <option value="show">Show</option>
                        <option value="teatro">Teatro</option>
                        <option value="palestra">Palestra</option>
                        <option value="workshop">Workshop</option>
                        <option value="festa">Festa</option>
                        <option value="esporte">Esporte</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>

                    {/* Preço */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preço do Ingresso (€)
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

                    {/* Total de Ingressos */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total de Ingressos
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.totalTickets}
                        onChange={e => setFormData({ ...formData, totalTickets: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3 - Contact */}
                <div className={currentStep === 3 ? 'block' : 'hidden'}>
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
                        required
                      />
                    </div>

                    {/* Horários de Atendimento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horários de Atendimento
                      </label>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            contactInfo: { ...formData.contactInfo, hours: [...formData.contactInfo.hours, ''] }
                          })}
                          className="text-sm text-pink-600 hover:text-pink-700"
                        >
                          + Adicionar Horário
                        </button>
                        {formData.contactInfo.hours.map((hour, index) => (
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
                            {formData.contactInfo.hours.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newHours = [...formData.contactInfo.hours];
                                  newHours.splice(index, 1);
                                  setFormData({
                                    ...formData,
                                    contactInfo: { ...formData.contactInfo, hours: newHours }
                                  });
                                }}
                                className="text-red-500 hover:text-red-600"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop Content */
              <div>
                {/* Desktop sections will be added next */}
                <div className="text-center py-8 text-gray-500">
                  Desktop view em desenvolvimento...
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="mt-8">
            {isMobile ? (
              <div className="flex justify-between gap-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  >
                    Próximo
                  </button>
                ) : (
                  <LoadingButton
                    type="submit"
                    isLoading={isSaving}
                    loadingText="Salvando..."
                    variant="primary"
                    size="lg"
                    className="flex-1"
                  >
                    {event ? 'Salvar' : 'Criar'}
                  </LoadingButton>
                )}
              </div>
            ) : (
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={isSaving}
                  loadingText="Salvando..."
                  variant="primary"
                  size="md"
                >
                  {event ? 'Salvar Alterações' : 'Criar Evento'}
                </LoadingButton>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;