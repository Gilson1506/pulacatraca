import React, { useState, useRef } from 'react';
import { X, Upload, Calendar, Clock, MapPin, Ticket, Plus, Minus, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Link, Image, Type, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EventFormData {
  // Seção 1: Informações básicas
  title: string;
  image: string;
  subject: string;
  category: string;
  
  // Seção 2: Data e horário
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  
  // Seção 3: Descrição
  description: string;
  
  // Seção 4: Local
  location_type: 'tbd' | 'physical' | 'online';
  location_search: string;
  location_name: string;
  location_address: string;
  location_cep: string;
  location_street: string;
  location_number: string;
  location_complement: string;
  location_neighborhood: string;
  location_city: string;
  location_state: string;
  
  // Seção 5: Ingressos
  ticket_type: 'paid' | 'free';
  tickets: TicketData[];
}

interface TicketData {
  id: string;
  title: string;
  quantity: number;
  price: number;
  has_half_price: boolean;
  sale_period_type: 'date' | 'batch';
  sale_start_date: string;
  sale_start_time: string;
  sale_end_date: string;
  sale_end_time: string;
  availability: 'public' | 'restricted' | 'manual';
  min_quantity: number;
  max_quantity: number;
  description: string;
}

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onEventCreated }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<EventFormData>({
    // Seção 1
    title: '',
    image: '',
    subject: '',
    category: '',
    
    // Seção 2
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    
    // Seção 3
    description: '',
    
    // Seção 4
    location_type: 'tbd',
    location_search: '',
    location_name: '',
    location_address: '',
    location_cep: '',
    location_street: '',
    location_number: '',
    location_complement: '',
    location_neighborhood: '',
    location_city: '',
    location_state: '',
    
    // Seção 5
    ticket_type: 'paid',
    tickets: []
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  // Calcular duração do evento
  const calculateEventDuration = () => {
    if (!formData.start_date || !formData.end_date) return '';
    
    const start = new Date(`${formData.start_date}T${formData.start_time || '00:00'}`);
    const end = new Date(`${formData.end_date}T${formData.end_time || '23:59'}`);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 dia';
    return `${diffDays} dias`;
  };

  // Upload de imagem
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 2MB.');
      return;
    }

    // Validar formato
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('Formato inválido. Use JPEG, PNG ou GIF.');
      return;
    }

    try {
      setUploadProgress(0);
      
      // Preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload para Supabase Storage
      const fileName = `event_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          }
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image: publicUrl }));
      setUploadProgress(100);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da imagem');
    }
  };

  // Comandos do editor de texto
  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (descriptionRef.current) {
      setFormData(prev => ({ 
        ...prev, 
        description: descriptionRef.current?.innerHTML || '' 
      }));
    }
  };

  // Adicionar novo ingresso
  const addTicket = () => {
    const newTicket: TicketData = {
      id: `ticket_${Date.now()}`,
      title: '',
      quantity: 100,
      price: 0,
      has_half_price: false,
      sale_period_type: 'date',
      sale_start_date: '',
      sale_start_time: '',
      sale_end_date: '',
      sale_end_time: '',
      availability: 'public',
      min_quantity: 1,
      max_quantity: 5,
      description: ''
    };
    
    setFormData(prev => ({
      ...prev,
      tickets: [...prev.tickets, newTicket]
    }));
  };

  // Remover ingresso
  const removeTicket = (ticketId: string) => {
    setFormData(prev => ({
      ...prev,
      tickets: prev.tickets.filter(t => t.id !== ticketId)
    }));
  };

  // Atualizar ingresso
  const updateTicket = (ticketId: string, updates: Partial<TicketData>) => {
    setFormData(prev => ({
      ...prev,
      tickets: prev.tickets.map(t => 
        t.id === ticketId ? { ...t, ...updates } : t
      )
    }));
  };

  // Submeter formulário
  const handleSubmit = async () => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      // Validações básicas
      if (!formData.title.trim()) {
        alert('Nome do evento é obrigatório');
        return;
      }

      if (!formData.start_date || !formData.start_time) {
        alert('Data e hora de início são obrigatórias');
        return;
      }

      // Criar evento
      const eventData = {
        title: formData.title.trim(),
        description: formData.description,
        start_date: `${formData.start_date}T${formData.start_time}:00`,
        end_date: formData.end_date ? `${formData.end_date}T${formData.end_time || '23:59'}:00` : null,
        location: formData.location_type === 'tbd' ? 'Local ainda será definido' : 
                 formData.location_type === 'online' ? 'Evento Online' :
                 `${formData.location_name || formData.location_street} ${formData.location_number || ''}, ${formData.location_city || ''} - ${formData.location_state || ''}`.trim(),
        address: formData.location_type === 'physical' ? 
                `${formData.location_street} ${formData.location_number}, ${formData.location_neighborhood}, ${formData.location_city} - ${formData.location_state}, ${formData.location_cep}` : null,
        image: formData.image || '/default-event-image.jpg',
        category: formData.subject || 'evento',
        subcategory: formData.category || null,
        price: formData.tickets.length > 0 ? Math.min(...formData.tickets.map(t => t.price)) : 0,
        organizer_id: user.id,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (eventError) throw eventError;

      // Criar ingressos
      if (formData.tickets.length > 0) {
        const ticketsData = formData.tickets.map(ticket => ({
          event_id: event.id,
          name: ticket.title,
          price: ticket.price,
          quantity: ticket.quantity,
          description: ticket.description || null,
          sale_start: ticket.sale_start_date ? `${ticket.sale_start_date}T${ticket.sale_start_time}:00` : null,
          sale_end: ticket.sale_end_date ? `${ticket.sale_end_date}T${ticket.sale_end_time}:00` : null,
          min_quantity: ticket.min_quantity,
          max_quantity: ticket.max_quantity,
          availability: ticket.availability,
          has_half_price: ticket.has_half_price,
          created_at: new Date().toISOString()
        }));

        const { error: ticketsError } = await supabase
          .from('tickets')
          .insert(ticketsData);

        if (ticketsError) {
          console.error('Erro ao criar ingressos:', ticketsError);
          // Não falhar se ingressos não foram criados
        }
      }

      alert('Evento criado com sucesso! Aguarde aprovação.');
      onEventCreated();
      onClose();

    } catch (error) {
      console.error('Erro ao criar evento:', error);
      alert('Erro ao criar evento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Informações básicas</h3>
        <p className="text-sm text-gray-600 mb-4">Adicione as principais informações do evento.</p>
      </div>

      {/* Nome do evento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome do evento
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Nome do evento"
          maxLength={100}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {100 - formData.title.length} caracteres restantes
        </p>
      </div>

      {/* Upload de imagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem de divulgação (opcional)
        </label>
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {imagePreview ? (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-48 mx-auto rounded-lg"
                style={{ 
                  objectFit: 'cover',
                  imageRendering: 'high-quality',
                  filter: 'contrast(1.02) saturate(1.05)'
                }}
              />
              {uploadProgress < 100 && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-sm">Uploading... {Math.round(uploadProgress)}%</div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Clique ou arraste a imagem aqui</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <p>A dimensão recomendada é de 1600 x 838</p>
          <p>(mesma proporção do formato utilizado nas páginas de evento no Facebook).</p>
          <p>Formato JPEG, GIF ou PNG de no máximo 2MB.</p>
          <p>Imagens com dimensões diferentes serão redimensionadas.</p>
        </div>
      </div>

      {/* Classificação */}
      <div>
        <h4 className="text-md font-medium text-gray-800 mb-4">Classifique seu evento</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assunto
            </label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Selecione o assunto</option>
              <option value="show">Show</option>
              <option value="teatro">Teatro</option>
              <option value="palestra">Palestra</option>
              <option value="workshop">Workshop</option>
              <option value="festa">Festa</option>
              <option value="esporte">Esporte</option>
              <option value="negócios">Negócios</option>
              <option value="educação">Educação</option>
              <option value="tecnologia">Tecnologia</option>
              <option value="arte">Arte</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria (opcional)
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">-- --</option>
              <option value="música">Música</option>
              <option value="comédia">Comédia</option>
              <option value="drama">Drama</option>
              <option value="infantil">Infantil</option>
              <option value="adulto">Adulto</option>
              <option value="família">Família</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Data e horário</h3>
        <p className="text-sm text-gray-600 mb-4">Informe aos participantes quando seu evento vai acontecer.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data e hora de início */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Início *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Início *
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>
        </div>

        {/* Data e hora de término */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Término *
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Término *
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Duração calculada */}
      {formData.start_date && formData.end_date && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Seu evento vai durar:</strong> {calculateEventDuration()}
          </p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">3. Descrição do evento</h3>
        <p className="text-sm text-gray-600 mb-4">
          Conte todos os detalhes do seu evento, como a programação e os diferenciais da sua produção!
        </p>
      </div>

      {/* Toolbar do editor */}
      <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Sublinhado"
        >
          <Underline className="h-4 w-4" />
        </button>
        
        <div className="w-px bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </button>
        
        <div className="w-px bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => executeCommand('justifyLeft')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyCenter')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyRight')}
          className="p-2 hover:bg-gray-200 rounded"
          title="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        
        <div className="w-px bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => {
            const url = prompt('Digite a URL:');
            if (url) executeCommand('createLink', url);
          }}
          className="p-2 hover:bg-gray-200 rounded"
          title="Adicionar link"
        >
          <Link className="h-4 w-4" />
        </button>
        
        <select
          onChange={(e) => executeCommand('fontSize', e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 rounded"
          title="Tamanho da fonte"
        >
          <option value="1">Pequena</option>
          <option value="3" selected>Normal</option>
          <option value="5">Grande</option>
          <option value="7">Muito Grande</option>
        </select>
        
        <input
          type="color"
          onChange={(e) => executeCommand('foreColor', e.target.value)}
          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          title="Cor do texto"
        />
      </div>

      {/* Editor de texto */}
      <div
        ref={descriptionRef}
        contentEditable
        className="min-h-[200px] p-4 border-x border-b border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        onInput={() => {
          if (descriptionRef.current) {
            setFormData(prev => ({ 
              ...prev, 
              description: descriptionRef.current?.innerHTML || '' 
            }));
          }
        }}
        placeholder="Descreva seu evento aqui..."
        style={{ minHeight: '200px' }}
      />
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">4. Onde o seu evento vai acontecer?</h3>
      </div>

      {/* Tipo de local */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="location_type"
              value="tbd"
              checked={formData.location_type === 'tbd'}
              onChange={(e) => setFormData(prev => ({ ...prev, location_type: e.target.value as any }))}
              className="mr-2"
            />
            Local ainda será definido
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="location_type"
              value="physical"
              checked={formData.location_type === 'physical'}
              onChange={(e) => setFormData(prev => ({ ...prev, location_type: e.target.value as any }))}
              className="mr-2"
            />
            Local físico
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="location_type"
              value="online"
              checked={formData.location_type === 'online'}
              onChange={(e) => setFormData(prev => ({ ...prev, location_type: e.target.value as any }))}
              className="mr-2"
            />
            Online
          </label>
        </div>
      </div>

      {/* Campos do local físico */}
      {formData.location_type === 'physical' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Local
            </label>
            <input
              type="text"
              value={formData.location_search}
              onChange={(e) => setFormData(prev => ({ ...prev, location_search: e.target.value }))}
              placeholder="Digite para buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <p className="text-xs text-gray-500 mt-1">Informe o endereço ou o nome do local do evento</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Local
            </label>
            <input
              type="text"
              value={formData.location_name}
              onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {100 - formData.location_name.length} caracteres restantes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CEP
              </label>
              <input
                type="text"
                value={formData.location_cep}
                onChange={(e) => setFormData(prev => ({ ...prev, location_cep: e.target.value }))}
                placeholder="_____-___"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Av./Rua
              </label>
              <input
                type="text"
                value={formData.location_street}
                onChange={(e) => setFormData(prev => ({ ...prev, location_street: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número
              </label>
              <input
                type="text"
                value={formData.location_number}
                onChange={(e) => setFormData(prev => ({ ...prev, location_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complemento
              </label>
              <input
                type="text"
                value={formData.location_complement}
                onChange={(e) => setFormData(prev => ({ ...prev, location_complement: e.target.value }))}
                maxLength={250}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {250 - formData.location_complement.length} caracteres restantes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bairro
              </label>
              <input
                type="text"
                value={formData.location_neighborhood}
                onChange={(e) => setFormData(prev => ({ ...prev, location_neighborhood: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={formData.location_city}
                onChange={(e) => setFormData(prev => ({ ...prev, location_city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.location_state}
                onChange={(e) => setFormData(prev => ({ ...prev, location_state: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Selecione</option>
                <option value="AC">Acre</option>
                <option value="AL">Alagoas</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="BA">Bahia</option>
                <option value="CE">Ceará</option>
                <option value="DF">Distrito Federal</option>
                <option value="ES">Espírito Santo</option>
                <option value="GO">Goiás</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MG">Minas Gerais</option>
                <option value="PA">Pará</option>
                <option value="PB">Paraíba</option>
                <option value="PR">Paraná</option>
                <option value="PE">Pernambuco</option>
                <option value="PI">Piauí</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="RN">Rio Grande do Norte</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="SC">Santa Catarina</option>
                <option value="SP">São Paulo</option>
                <option value="SE">Sergipe</option>
                <option value="TO">Tocantins</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">5. Ingressos</h3>
        <p className="text-sm text-gray-600 mb-4">Que tipo de ingresso você deseja criar?</p>
      </div>

      {/* Tipo de ingresso */}
      <div className="flex gap-4 mb-6">
        <label className="flex items-center">
          <input
            type="radio"
            name="ticket_type"
            value="paid"
            checked={formData.ticket_type === 'paid'}
            onChange={(e) => setFormData(prev => ({ ...prev, ticket_type: e.target.value as any }))}
            className="mr-2"
          />
          Ingressos pagos
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name="ticket_type"
            value="free"
            checked={formData.ticket_type === 'free'}
            onChange={(e) => setFormData(prev => ({ ...prev, ticket_type: e.target.value as any }))}
            className="mr-2"
          />
          Ingressos gratuitos
        </label>
      </div>

      {/* Lista de ingressos */}
      <div className="space-y-6">
        {formData.tickets.map((ticket, index) => (
          <div key={ticket.id} className="border border-gray-200 rounded-lg p-6 relative">
            {formData.tickets.length > 1 && (
              <button
                type="button"
                onClick={() => removeTicket(ticket.id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <h4 className="text-md font-medium text-gray-800 mb-4">
              {formData.ticket_type === 'paid' ? 'Criar ingresso pago' : 'Criar ingresso gratuito'}
            </h4>

            {formData.ticket_type === 'paid' && (
              <p className="text-xs text-gray-500 mb-4">
                A taxa de serviço é repassada ao comprador, sendo exibida junto com o valor do ingresso
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do ingresso
                </label>
                <input
                  type="text"
                  value={ticket.title}
                  onChange={(e) => updateTicket(ticket.id, { title: e.target.value })}
                  placeholder="Ingresso único, Meia-Entrada, VIP, etc."
                  maxLength={45}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {45 - ticket.title.length} caracteres restantes
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={ticket.quantity}
                  onChange={(e) => updateTicket(ticket.id, { quantity: parseInt(e.target.value) || 0 })}
                  placeholder="Ex. 100"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            {formData.ticket_type === 'paid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor a receber
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={ticket.price}
                      onChange={(e) => updateTicket(ticket.id, { price: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do comprador
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                    R$ {(ticket.price * 1.1).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {formData.ticket_type === 'paid' && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={ticket.has_half_price}
                    onChange={(e) => updateTicket(ticket.id, { has_half_price: e.target.checked })}
                    className="mr-2"
                  />
                  Criar meia-entrada para este ingresso
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Saiba mais sobre as políticas de meia-entrada
                </p>
              </div>
            )}

            {/* Período de vendas */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Período das vendas deste ingresso:</h5>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`sale_period_${ticket.id}`}
                    value="date"
                    checked={ticket.sale_period_type === 'date'}
                    onChange={(e) => updateTicket(ticket.id, { sale_period_type: e.target.value as any })}
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
                    onChange={(e) => updateTicket(ticket.id, { sale_period_type: e.target.value as any })}
                    className="mr-2"
                  />
                  Por lote
                </label>
              </div>

              {ticket.sale_period_type === 'date' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Data de Início das Vendas *
                    </label>
                    <input
                      type="date"
                      value={ticket.sale_start_date}
                      onChange={(e) => updateTicket(ticket.id, { sale_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <label className="block text-sm font-medium text-gray-700">
                      Hora de Início *
                    </label>
                    <input
                      type="time"
                      value={ticket.sale_start_time}
                      onChange={(e) => updateTicket(ticket.id, { sale_start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <p className="text-xs text-gray-500">Horário de Brasília</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Data de Término das Vendas *
                    </label>
                    <input
                      type="date"
                      value={ticket.sale_end_date}
                      onChange={(e) => updateTicket(ticket.id, { sale_end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <label className="block text-sm font-medium text-gray-700">
                      Hora de Término *
                    </label>
                    <input
                      type="time"
                      value={ticket.sale_end_time}
                      onChange={(e) => updateTicket(ticket.id, { sale_end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <p className="text-xs text-gray-500">Horário de Brasília</p>
                  </div>
                </div>
              )}
            </div>

            {/* Disponibilidade */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Disponibilidade do Ingresso:</h5>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`availability_${ticket.id}`}
                    value="public"
                    checked={ticket.availability === 'public'}
                    onChange={(e) => updateTicket(ticket.id, { availability: e.target.value as any })}
                    className="mr-2"
                  />
                  Para todo o público
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`availability_${ticket.id}`}
                    value="restricted"
                    checked={ticket.availability === 'restricted'}
                    onChange={(e) => updateTicket(ticket.id, { availability: e.target.value as any })}
                    className="mr-2"
                  />
                  Restrito a convidados
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`availability_${ticket.id}`}
                    value="manual"
                    checked={ticket.availability === 'manual'}
                    onChange={(e) => updateTicket(ticket.id, { availability: e.target.value as any })}
                    className="mr-2"
                  />
                  Para ser adicionado manualmente
                </label>
              </div>
            </div>

            {/* Quantidade por compra */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Quantidade permitida por compra</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mínima
                  </label>
                  <input
                    type="number"
                    value={ticket.min_quantity}
                    onChange={(e) => updateTicket(ticket.id, { min_quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máxima
                  </label>
                  <input
                    type="number"
                    value={ticket.max_quantity}
                    onChange={(e) => updateTicket(ticket.id, { max_quantity: parseInt(e.target.value) || 5 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição do Ingresso (opcional):
              </label>
              <textarea
                value={ticket.description}
                onChange={(e) => updateTicket(ticket.id, { description: e.target.value })}
                placeholder="Informações adicionais ao nome do ingresso. Ex.: Esse ingresso dá direito a um copo"
                maxLength={100}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {100 - ticket.description.length} caracteres restantes
              </p>
            </div>
          </div>
        ))}

        {/* Botão para adicionar ingresso */}
        <button
          type="button"
          onClick={addTicket}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-pink-500 hover:text-pink-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar outro tipo de ingresso
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {currentStep === 1 && 'Informações Básicas'}
            {currentStep === 2 && 'Data e Horário'}
            {currentStep === 3 && 'Descrição do Evento'}
            {currentStep === 4 && 'Local do Evento'}
            {currentStep === 5 && 'Ingressos'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-pink-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Voltar
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>

            {currentStep < 5 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Próximo
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Evento'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventFormModal;