import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { uploadEventBanner, deleteEventBanner } from '../lib/supabase';

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
  endDate?: string; // ✅ NOVA: Data de término
  endTime?: string; // ✅ NOVA: Hora de término
  location: string;
  description: string;
  status: 'ativo' | 'adiado' | 'cancelado';
  ticketsSold?: number;
  totalTickets: number;
  revenue?: number;
  category: string;
  price: number; // ✅ ADICIONADO CAMPO DE PREÇO
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
  const [currentStep, setCurrentStep] = useState(1); // ✅ CONTROLE DE PASSOS
  const [isMobile, setIsMobile] = useState(false); // ✅ DETECÇÃO MOBILE
  
  const [formData, setFormData] = useState<Event>(event || {
    name: '',
    date: '',
    time: '',
    endDate: '', // ✅ NOVA
    endTime: '', // ✅ NOVA
    location: '',
    description: '',
    status: 'ativo',
    totalTickets: 0,
    category: '',
    price: 0, // ✅ VALOR INICIAL DO PREÇO
    importantNotes: [''],
    sections: [{
      name: '',
      details: [''],
      note: ''
    }],
    attractions: [''],
    contactInfo: {
      phone: '',
      hours: ['']
    }
  });

  const [imagePreview, setImagePreview] = useState<string | undefined>(event?.image);
  const [currentSection, setCurrentSection] = useState<'basic' | 'tickets' | 'details' | 'contact'>('basic');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ✅ DETECÇÃO MOBILE E CONTROLE DE PASSOS
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ NAVEGAÇÃO ENTRE PASSOS (MOBILE)
  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setCurrentSection('basic');
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      try {
        setUploadingImage(true);
        setSelectedFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to Supabase
        const imageUrl = await uploadEventBanner(file, formData.id);
        setFormData(prev => ({ ...prev, image: imageUrl }));
        
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        alert('Erro ao fazer upload da imagem. Tente novamente.');
        // Reset on error
        setImagePreview(undefined);
        setSelectedFile(null);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      if (formData.image && formData.image.startsWith('http')) {
        // Only delete if it's a URL (uploaded to Supabase)
        await deleteEventBanner(formData.image);
      }
      setImagePreview(undefined);
      setFormData(prev => ({ ...prev, image: undefined }));
      setSelectedFile(null);
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      // Continue with removal even if deletion fails
      setImagePreview(undefined);
      setFormData(prev => ({ ...prev, image: undefined }));
      setSelectedFile(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addArrayItem = (field: keyof Event, index: number) => {
    if (Array.isArray(formData[field])) {
      const newArray = [...(formData[field] as any[])];
      newArray.splice(index + 1, 0, '');
      setFormData({ ...formData, [field]: newArray });
    }
  };

  const removeArrayItem = (field: keyof Event, index: number) => {
    if (Array.isArray(formData[field]) && (formData[field] as any[]).length > 1) {
      const newArray = [...(formData[field] as any[])];
      newArray.splice(index, 1);
      setFormData({ ...formData, [field]: newArray });
    }
  };

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, { name: '', details: [''], note: '' }]
    }));
  };

  const removeSection = (index: number) => {
    if (formData.sections.length > 1) {
      const newSections = [...formData.sections];
      newSections.splice(index, 1);
      setFormData({ ...formData, sections: newSections });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {event ? 'Editar Evento' : 'Criar Novo Evento'}
          </h2>
          <button 
            onClick={() => {
              resetForm();
              onClose();
            }} 
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Navigation - Desktop Tabs / Mobile Steps */}
          {isMobile ? (
            // ✅ MOBILE: Indicador de Passos
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentStep === 1 && 'Informações Básicas'}
                  {currentStep === 2 && 'Detalhes do Evento'}
                  {currentStep === 3 && 'Finalizar'}
                </h3>
                <span className="text-sm text-gray-500">
                  {currentStep}/3
                </span>
              </div>
              <div className="flex space-x-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full ${
                      step <= currentStep ? 'bg-pink-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            // ✅ DESKTOP: Tabs Normais
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => setCurrentSection('basic')}
                className={`px-4 py-2 -mb-px ${currentSection === 'basic' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}
              >
                Informações Básicas
              </button>
              <button
                type="button"
                onClick={() => setCurrentSection('tickets')}
                className={`px-4 py-2 -mb-px ${currentSection === 'tickets' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}
              >
                Ingressos e Setores
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

          {/* ✅ CONTEÚDO BASEADO EM MOBILE/DESKTOP */}
          {/* Desktop: Baseado em currentSection | Mobile: Baseado em currentStep */}
          {((!isMobile && currentSection === 'basic') || (isMobile && currentStep === 1)) && (
            <div className="space-y-6">
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
                            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
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

              {/* ✅ DATAS E HORÁRIOS DE INÍCIO E FIM */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Data e Horário</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Término (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate || ''}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário de Término (opcional)
                    </label>
                    <input
                      type="time"
                      value={formData.endTime || ''}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
              </div>

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
          )}

          {/* Tickets and Sections */}
          {((!isMobile && currentSection === 'tickets') || (isMobile && currentStep === 2)) && (
            <div className="space-y-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço do Ingresso (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="0,00"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Digite 0 para eventos gratuitos
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Setores
                  </label>
                  <button
                    type="button"
                    onClick={addSection}
                    className="text-sm text-pink-600 hover:text-pink-700"
                  >
                    + Adicionar Setor
                  </button>
                </div>
                <div className="space-y-4">
                  {formData.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Setor {sectionIndex + 1}</h4>
                        {formData.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(sectionIndex)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome do Setor
                          </label>
                          <input
                            type="text"
                            value={section.name}
                            onChange={e => {
                              const newSections = [...formData.sections];
                              newSections[sectionIndex].name = e.target.value;
                              setFormData({ ...formData, sections: newSections });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            required
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Detalhes do Setor
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const newSections = [...formData.sections];
                                newSections[sectionIndex].details.push('');
                                setFormData({ ...formData, sections: newSections });
                              }}
                              className="text-sm text-pink-600 hover:text-pink-700"
                            >
                              + Adicionar Detalhe
                            </button>
                          </div>
                          {section.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={detail}
                                onChange={e => {
                                  const newSections = [...formData.sections];
                                  newSections[sectionIndex].details[detailIndex] = e.target.value;
                                  setFormData({ ...formData, sections: newSections });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                required
                              />
                              {section.details.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSections = [...formData.sections];
                                    newSections[sectionIndex].details.splice(detailIndex, 1);
                                    setFormData({ ...formData, sections: newSections });
                                  }}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observação do Setor
                          </label>
                          <input
                            type="text"
                            value={section.note || ''}
                            onChange={e => {
                              const newSections = [...formData.sections];
                              newSections[sectionIndex].note = e.target.value;
                              setFormData({ ...formData, sections: newSections });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Details Section */}
          {((!isMobile && currentSection === 'details') || (isMobile && currentStep === 2)) && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Atrações
                  </label>
                  <button
                    type="button"
                    onClick={() => addArrayItem('attractions', formData.attractions.length - 1)}
                    className="text-sm text-pink-600 hover:text-pink-700"
                  >
                    + Adicionar Atração
                  </button>
                </div>
                {formData.attractions.map((attraction, index) => (
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
                      required
                    />
                    {formData.attractions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('attractions', index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Informações Importantes
                  </label>
                  <button
                    type="button"
                    onClick={() => addArrayItem('importantNotes', formData.importantNotes.length - 1)}
                    className="text-sm text-pink-600 hover:text-pink-700"
                  >
                    + Adicionar Informação
                  </button>
                </div>
                {formData.importantNotes.map((note, index) => (
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
                      required
                    />
                    {formData.importantNotes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('importantNotes', index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Section */}
          {((!isMobile && currentSection === 'contact') || (isMobile && currentStep === 3)) && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone para Contato
                </label>
                <input
                  type="text"
                  value={formData.contactInfo.phone}
                  onChange={e => setFormData({
                    ...formData,
                    contactInfo: { ...formData.contactInfo, phone: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Horários de Atendimento
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newHours = [...formData.contactInfo.hours, ''];
                      setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, hours: newHours }
                      });
                    }}
                    className="text-sm text-pink-600 hover:text-pink-700"
                  >
                    + Adicionar Horário
                  </button>
                </div>
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
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ FORM ACTIONS - RESPONSIVO */}
          <div className="mt-8">
            {isMobile ? (
              // ✅ MOBILE: Navegação de Passos
              <div className="flex justify-between gap-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Voltar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    {event ? 'Salvar' : 'Criar'}
                  </button>
                )}
              </div>
            ) : (
              // ✅ DESKTOP: Botões Normais
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  {event ? 'Salvar Alterações' : 'Criar Evento'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal; 