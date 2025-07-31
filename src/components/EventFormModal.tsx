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
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const addSectionDetail = (sectionIndex: number, detailIndex: number) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].details.splice(detailIndex + 1, 0, '');
    setFormData({ ...formData, sections: newSections });
  };

  const removeSectionDetail = (sectionIndex: number, detailIndex: number) => {
    const newSections = [...formData.sections];
    if (newSections[sectionIndex].details.length > 1) {
      newSections[sectionIndex].details.splice(detailIndex, 1);
      setFormData({ ...formData, sections: newSections });
    }
  };

  if (!isOpen) return null;

  const renderBannerUpload = () => (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-800 mb-3">
        Banner do Evento
      </label>
      <p className="text-xs text-gray-600 mb-4">
        Recomendado: 1200x600px, máximo 5MB (PNG, JPG, JPEG)
      </p>
      
      {formData.image ? (
        <div className="relative group">
          <img 
            src={formData.image} 
            alt="Banner" 
            className="w-full h-48 object-cover rounded-xl border-2 border-gray-200" 
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-xl flex items-center justify-center">
            <button
              type="button"
              onClick={handleRemoveImage}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transform hover:scale-110"
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-pink-400 hover:bg-pink-50 transition-all duration-200 group">
            {isUploading ? (
              <div className="text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-sm text-gray-600 font-medium">Enviando imagem...</p>
                <p className="text-xs text-gray-400">Por favor, aguarde</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">📁</div>
                <p className="text-sm text-gray-700 font-semibold mb-1">Clique para fazer upload</p>
                <p className="text-xs text-gray-500">PNG, JPG, JPEG até 5MB</p>
              </div>
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
  );

  const renderBasicFields = () => (
    <div className="space-y-6">
      {renderBannerUpload()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Nome do Evento *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            placeholder="Digite o nome do evento"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Categoria *
          </label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
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

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Preço do Ingresso (€) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Data de Início *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Horário de Início *
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Data de Término *
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Horário de Término *
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            required
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Localização *
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={e => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            placeholder="Endereço completo do evento"
            required
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Descrição *
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200 resize-none"
            placeholder="Descreva o evento, atrações, programação..."
            required
          />
        </div>
      </div>
    </div>
  );

  const renderTicketsFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Total de Ingressos *
          </label>
          <input
            type="number"
            min="1"
            value={formData.totalTickets}
            onChange={e => setFormData({ ...formData, totalTickets: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Status do Evento
          </label>
          <select
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as 'ativo' | 'adiado' | 'cancelado' })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
          >
            <option value="ativo">✅ Ativo</option>
            <option value="adiado">⏸️ Adiado</option>
            <option value="cancelado">❌ Cancelado</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderDetailsFields = () => (
    <div className="space-y-8">
      {/* Important Notes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-800">
            Informações Importantes
          </label>
          <button
            type="button"
            onClick={() => addArrayItem('importantNotes', formData.importantNotes.length - 1)}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium hover:bg-pink-50 px-3 py-1 rounded-lg transition-all duration-200"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-3">
          {formData.importantNotes.map((note, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                value={note}
                onChange={e => {
                  const newNotes = [...formData.importantNotes];
                  newNotes[index] = e.target.value;
                  setFormData({ ...formData, importantNotes: newNotes });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
                placeholder="Ex: Chegue 30 minutos antes do evento"
              />
              {formData.importantNotes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('importantNotes', index)}
                  className="w-12 h-12 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Attractions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-800">
            Atrações do Evento
          </label>
          <button
            type="button"
            onClick={() => addArrayItem('attractions', formData.attractions.length - 1)}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium hover:bg-pink-50 px-3 py-1 rounded-lg transition-all duration-200"
          >
            + Adicionar
          </button>
        </div>
        <div className="space-y-3">
          {formData.attractions.map((attraction, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                value={attraction}
                onChange={e => {
                  const newAttractions = [...formData.attractions];
                  newAttractions[index] = e.target.value;
                  setFormData({ ...formData, attractions: newAttractions });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
                placeholder="Ex: Banda XYZ, DJ ABC"
              />
              {formData.attractions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('attractions', index)}
                  className="w-12 h-12 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-800">
            Seções do Evento
          </label>
          <button
            type="button"
            onClick={addSection}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium hover:bg-pink-50 px-3 py-1 rounded-lg transition-all duration-200"
          >
            + Adicionar Seção
          </button>
        </div>
        <div className="space-y-6">
          {formData.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-gray-50 p-6 rounded-xl border-2 border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">
                  Seção {sectionIndex + 1}
                </h4>
                {formData.sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(sectionIndex)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Seção
                  </label>
                  <input
                    type="text"
                    value={section.name}
                    onChange={e => {
                      const newSections = [...formData.sections];
                      newSections[sectionIndex].name = e.target.value;
                      setFormData({ ...formData, sections: newSections });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
                    placeholder="Ex: Programação, Palestrantes, Horários"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Detalhes
                    </label>
                    <button
                      type="button"
                      onClick={() => addSectionDetail(sectionIndex, section.details.length - 1)}
                      className="text-xs text-pink-600 hover:text-pink-700 font-medium"
                    >
                      + Adicionar detalhe
                    </button>
                  </div>
                  <div className="space-y-2">
                    {section.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={detail}
                          onChange={e => {
                            const newSections = [...formData.sections];
                            newSections[sectionIndex].details[detailIndex] = e.target.value;
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-100"
                          placeholder="Detalhe da seção"
                        />
                        {section.details.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSectionDetail(sectionIndex, detailIndex)}
                            className="w-10 h-10 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center justify-center"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nota da Seção
                  </label>
                  <textarea
                    value={section.note || ''}
                    onChange={e => {
                      const newSections = [...formData.sections];
                      newSections[sectionIndex].note = e.target.value;
                      setFormData({ ...formData, sections: newSections });
                    }}
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200 resize-none"
                    placeholder="Observações adicionais sobre esta seção"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContactFields = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Telefone de Contato *
        </label>
        <input
          type="tel"
          value={formData.contactInfo.phone}
          onChange={e => setFormData({
            ...formData,
            contactInfo: { ...formData.contactInfo, phone: e.target.value }
          })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
          placeholder="+351 123 456 789"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-800">
            Horários de Atendimento *
          </label>
          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              contactInfo: { ...formData.contactInfo, hours: [...formData.contactInfo.hours, ''] }
            })}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium hover:bg-pink-50 px-3 py-1 rounded-lg transition-all duration-200"
          >
            + Adicionar Horário
          </button>
        </div>
        <div className="space-y-3">
          {formData.contactInfo.hours.map((hour, index) => (
            <div key={index} className="flex gap-3">
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
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all duration-200"
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
                  className="w-12 h-12 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${isMobile ? 'max-w-md max-h-[90vh]' : 'max-w-6xl max-h-[95vh]'}`}>
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-600 z-10 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {event ? 'Editar Evento' : 'Criar Novo Evento'}
              </h2>
              <p className="text-pink-100 text-sm mt-1">
                {isMobile ? 'Preencha todos os campos' : 'Configure seu evento com todos os detalhes'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-pink-200 hover:bg-white hover:bg-opacity-20 w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(95vh-80px)]">
          {isMobile ? (
            /* MOBILE: Simple single scroll view */
            <div className="p-6 space-y-8">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-800 text-sm font-medium">
                  📱 Versão Mobile Simplificada
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Todos os campos em uma única tela para facilitar o preenchimento
                </p>
              </div>

              {renderBasicFields()}
              
              <hr className="border-gray-200" />
              
              {renderTicketsFields()}
              
              <hr className="border-gray-200" />
              
              {renderContactFields()}

              {/* Mobile Actions */}
              <div className="sticky bottom-0 bg-white pt-6 border-t border-gray-200 -mx-6 px-6 pb-6">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={isSaving}
                    loadingText="Salvando..."
                    variant="primary"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
                  >
                    {event ? 'Salvar' : 'Criar Evento'}
                  </LoadingButton>
                </div>
              </div>
            </div>
          ) : (
            /* DESKTOP: Complete tabbed interface */
            <div className="flex h-full">
              {/* Sidebar Navigation */}
              <div className="w-64 bg-gray-50 border-r border-gray-200 p-6">
                <nav className="space-y-2">
                  {[
                    { id: 'basic', name: 'Informações Básicas', icon: '📝', desc: 'Nome, data, local' },
                    { id: 'tickets', name: 'Ingressos', icon: '🎫', desc: 'Preços e disponibilidade' },
                    { id: 'details', name: 'Detalhes', icon: '📋', desc: 'Atrações e seções' },
                    { id: 'contact', name: 'Contato', icon: '📞', desc: 'Informações de contato' }
                  ].map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                        currentSection === section.id
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg">{section.icon}</span>
                        <span className="font-semibold text-sm">{section.name}</span>
                      </div>
                      <p className={`text-xs ${
                        currentSection === section.id ? 'text-pink-100' : 'text-gray-500'
                      }`}>
                        {section.desc}
                      </p>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-8 overflow-y-auto">
                  <div className="max-w-4xl">
                    {currentSection === 'basic' && (
                      <div>
                        <div className="mb-8">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">Informações Básicas</h3>
                          <p className="text-gray-600">Configure as informações principais do seu evento</p>
                        </div>
                        {renderBasicFields()}
                      </div>
                    )}

                    {currentSection === 'tickets' && (
                      <div>
                        <div className="mb-8">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">Configurações de Ingressos</h3>
                          <p className="text-gray-600">Defina preços, quantidade e status do evento</p>
                        </div>
                        {renderTicketsFields()}
                      </div>
                    )}

                    {currentSection === 'details' && (
                      <div>
                        <div className="mb-8">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">Detalhes do Evento</h3>
                          <p className="text-gray-600">Adicione atrações, programação e informações extras</p>
                        </div>
                        {renderDetailsFields()}
                      </div>
                    )}

                    {currentSection === 'contact' && (
                      <div>
                        <div className="mb-8">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">Informações de Contato</h3>
                          <p className="text-gray-600">Configure como os participantes podem entrar em contato</p>
                        </div>
                        {renderContactFields()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="flex justify-between items-center max-w-4xl">
                    <div className="text-sm text-gray-600">
                      Seção: <span className="font-semibold capitalize">{currentSection}</span>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-white hover:shadow-md transition-all duration-200"
                      >
                        Cancelar
                      </button>
                      <LoadingButton
                        type="submit"
                        isLoading={isSaving}
                        loadingText="Salvando..."
                        variant="primary"
                        className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                      >
                        {event ? 'Salvar Alterações' : 'Criar Evento'}
                      </LoadingButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;