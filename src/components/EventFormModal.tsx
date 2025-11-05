import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Toast from './Toast';
import { withTimeout } from '../utils/api';

interface EventFormData {
  // Seção 1: Informações básicas
  title: string;
  image: string;
  subject: string;
  category: string;
  classification: string;
  important_info: string[];
  attractions: string[];
  
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
  service_fee_type: 'buyer' | 'seller';
  tickets: TicketData[];
  
  // Seção 6: Contato
  contact_phone: string;
  contact_hours: string[];
}

interface TicketData {
  id: string;
  title: string;
  quantity: number;
  price_type: 'unissex' | 'gender_separate';
  price: number | null;
  price_feminine: number | null;
  has_half_price: boolean;
  half_price_title: string;
  half_price_quantity: number;
  half_price_price: number | null;
  half_price_price_feminine: number | null;
  sale_period_type: 'date' | 'batch';
  sale_start_date: string;
  sale_start_time: string;
  sale_end_date: string;
  sale_end_time: string;
  availability: 'public' | 'restricted' | 'manual';
  min_quantity: number;
  max_quantity: number;
  description: string;
  // Campos para lotes
  batches: {
    batch_number: number;
    quantity: number;
    price_type: 'unissex' | 'gender_separate';
    price: number;
    price_feminine: number | null;
    sale_start_date: string;
    sale_start_time: string;
    sale_end_date: string;
    sale_end_time: string;
  }[];
}

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
  event?: any;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onEventCreated, event }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  // Função utilitária para formatar qualquer par de data/hora
  const formatTimestamp = (
    date: string | undefined, 
    time: string | undefined
  ): string | null => {
    // Validação rigorosa
    if (!date || !time || 
        date.trim() === '' || time.trim() === '' ||
        date === 'undefined' || time === 'undefined') {
      return null;
    }
    
    try {
      // Construir timestamp ISO 8601
      const timestamp = `${date.trim()}T${time.trim()}:00`;
      
      // Validar se é uma data válida
      const dateObj = new Date(timestamp);
      if (isNaN(dateObj.getTime())) {
        console.warn('⚠️ Data inválida:', timestamp);
        return null;
      }
      
      return timestamp;
    } catch (error: any) {
      console.error('❌ Erro ao formatar timestamp:', error);
      return null;
    }
  };

  // Função para validar pares de data/hora
  const validateDateTimePair = (
    date: string | undefined, 
    time: string | undefined,
    fieldName: string
  ): string | null => {
    if (date && !time) {
      throw new Error(`${fieldName}: Se a data for preenchida, a hora também deve ser preenchida`);
    }
    
    if (!date && time) {
      throw new Error(`${fieldName}: Se a hora for preenchida, a data também deve ser preenchida`);
    }
    
    if (date && time) {
      return formatTimestamp(date, time);
    }
    
    return null;
  };

  const [formData, setFormData] = useState<EventFormData>({
    // Seção 1
    title: '',
    image: '',
    subject: '',
    category: '',
    classification: '',
    important_info: [],
    attractions: [],
    
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
    service_fee_type: 'buyer',
    tickets: [
      {
        id: 'ticket_default',
        title: 'Ingresso Geral',
        quantity: 0,
        price_type: 'unissex',
        price: null,
        price_feminine: null,
        has_half_price: false,
        half_price_title: '',
        half_price_quantity: 0,
        half_price_price: null,
        half_price_price_feminine: null,
        sale_period_type: 'date',
        sale_start_date: '',
        sale_start_time: '',
        sale_end_date: '',
        sale_end_time: '',
        availability: 'public',
        min_quantity: 0,
        max_quantity: 0,
        description: '',
        batches: []
      }
    ],
    
    // Seção 6: Contato
    contact_phone: '(11) 99999-9999',
    contact_hours: [
      'Segunda a Sexta: 9h às 18h',
      'Sábados: 9h às 14h'
    ]
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const prefill = async () => {
      if (!event) return;
      try {
        // Imagem
        setImagePreview(event?.image || '');

        // Datas
        const startDate = event?.date || (event?.start_date ? String(event.start_date).slice(0, 10) : '');
        const startTime = event?.time || (event?.start_date ? String(event.start_date).slice(11, 16) : '');
        const endDate = event?.endDate || (event?.end_date ? String(event.end_date).slice(0, 10) : '');
        const endTime = event?.endTime || (event?.end_date ? String(event.end_date).slice(11, 16) : '');

        // Local básico
        const locationText = event?.location || '';
        const parts = locationText.split(',');
        const city = (event?.location_city || parts[0] || '').trim();
        const state = (event?.location_state || parts[1] || '').trim();

        setFormData(prev => ({
          ...prev,
          title: event?.name || event?.title || '',
          image: event?.image || '',
          subject: event?.subject || '',
          category: event?.category || '',
          classification: event?.classification || '',
          important_info: event?.important_info || [],
          attractions: event?.attractions || [],
          start_date: startDate || '',
          start_time: startTime || '',
          end_date: endDate || '',
          end_time: endTime || '',
          description: event?.description || '',
          location_type: event?.location_type || 'physical',
          location_search: event?.location_name || '',
          location_name: event?.location_name || '',
          location_address: event?.address || '',
          location_city: city,
          location_state: state,
          location_street: event?.location_street || '',
          location_number: event?.location_number || '',
          location_neighborhood: event?.location_neighborhood || '',
          location_cep: event?.location_cep || '',
          ticket_type: event?.ticket_type || 'paid',
          service_fee_type: event?.service_fee_type || 'buyer',
          contact_phone: event?.contact_info?.phone || '(11) 99999-9999',
          contact_hours: event?.contact_info?.hours || [
            'Segunda a Sexta: 9h às 18h',
            'Sábados: 9h às 14h'
          ]
        }));

        // Buscar tipos de ingressos reais (se existir event.id)
        if (event?.id) {
          const { data: types } = await supabase
            .from('event_ticket_types')
            .select('*')
            .eq('event_id', event?.id)
            .order('price', { ascending: true });
          if (types && types.length) {
            const mapped = types.map((t: any) => ({
              id: t.id,
              title: t.title || t.name || '',
              quantity: t.quantity || t.available_quantity || 0,
              price_type: t.price_type || 'unissex',
              price: t.price_masculine ?? t.price ?? null,
              price_feminine: t.price_feminine ?? null,
              has_half_price: !!t.has_half_price,
              half_price_title: t.half_price_title || '',
              half_price_quantity: t.half_price_quantity || 0,
              half_price_price: t.half_price_price || null,
              half_price_price_feminine: t.half_price_price_feminine || null,
              sale_period_type: (t.sale_period_type as any) || 'date',
              sale_start_date: t.sale_start_date ? String(t.sale_start_date).slice(0,10) : '',
              sale_start_time: t.sale_start_date ? String(t.sale_start_date).slice(11,16) : '',
              sale_end_date: t.sale_end_date ? String(t.sale_end_date).slice(0,10) : '',
              sale_end_time: t.sale_end_date ? String(t.sale_end_date).slice(11,16) : '',
              availability: (t.availability as any) || 'public',
              min_quantity: t.min_quantity || 0,
              max_quantity: t.max_quantity || 0,
              description: t.description || '',
              batches: [],
            }));
            
            // Carregar lotes para cada ingresso
            for (let i = 0; i < mapped.length; i++) {
              const ticket = mapped[i];
              try {
                const { data: batches } = await supabase
                  .from('event_ticket_batches')
                  .select('*')
                  .eq('ticket_type_id', ticket.id)
                  .order('batch_number', { ascending: true });
                
                if (batches && batches.length > 0) {
                  mapped[i].batches = batches.map((batch: any) => ({
                    batch_number: batch.batch_number,
                    quantity: batch.quantity,
                    price_type: batch.price_type,
                    price: batch.price,
                    price_feminine: batch.price_feminine,
                    sale_start_date: batch.sale_start_date ? String(batch.sale_start_date).slice(0,10) : '',
                    sale_start_time: batch.sale_start_time || '',
                    sale_end_date: batch.sale_end_date ? String(batch.sale_end_date).slice(0,10) : '',
                    sale_end_time: batch.sale_end_time || ''
                  }));
                }
              } catch (batchError) {
                console.warn('Erro ao carregar lotes:', batchError);
              }
            }
            
            setFormData(prev => ({ ...prev, tickets: mapped }));
          }
        }
      } catch (e) {
        console.error('Erro ao pré-preencher evento:', e);
      }
    };
    prefill();
  }, [event]);

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

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 5MB.');
      return;
    }

    // Validar formato
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Formato inválido. Use JPEG, PNG, GIF ou WebP.');
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

      // Sanitizar nome do arquivo
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
      
      const fileName = `event_${Date.now()}_${sanitizedFileName}`;
      
      console.log('🔄 Iniciando upload:', fileName);

      // Verificar se o bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('📦 Buckets disponíveis:', buckets);
      
      if (bucketsError) {
        console.error('❌ Erro ao listar buckets:', bucketsError);
      }

      // Tentar criar o bucket se não existir
      const { error: bucketError } = await supabase.storage
        .createBucket('event_banners', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });

      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('❌ Erro ao criar bucket:', bucketError);
      }

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('event_banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true, // Permitir sobrescrever
          // onUploadProgress: (progress) => {
          //   const percent = (progress.loaded / progress.total) * 100;
          //   setUploadProgress(percent);
          //   console.log(`📊 Upload progress: ${percent.toFixed(1)}%`);
          // }
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw error;
      }

      console.log('✅ Upload concluído:', data);

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('event_banners')
        .getPublicUrl(fileName);

      console.log('🔗 URL pública:', publicUrl);

      setFormData(prev => ({ ...prev, image: publicUrl }));
      setUploadProgress(100);
      
      // Reset input file
      if (event.target) {
        event.target.value = '';
      }
      
    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      setUploadProgress(0);
      setImagePreview('');
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao fazer upload da imagem';
      if (error.message) {
        if (error.message.includes('not found')) {
          errorMessage = 'Bucket event_banners não encontrado. Verifique a configuração do Supabase.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Sem permissão para upload. Verifique as políticas RLS.';
        } else if (error.message.includes('size')) {
          errorMessage = 'Arquivo muito grande. Máximo 5MB.';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  // Comandos do editor de texto
  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (descriptionRef.current) {
      setFormData(prev => ({ 
        ...prev, 
        description: descriptionRef.current?.innerText || descriptionRef.current?.textContent || '' 
      }));
    }
  };

  // Validar etapa atual
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.title.trim()) {
          alert('Nome do evento é obrigatório');
          return false;
        }
        if (!formData.subject) {
          alert('Assunto do evento é obrigatório');
          return false;
        }
        if (!formData.classification) {
          alert('Classificação do evento é obrigatória');
          return false;
        }
        return true;
        
      case 2:
        if (!formData.start_date) {
          alert('Data de início é obrigatória');
          return false;
        }
        if (!formData.start_time) {
          alert('Hora de início é obrigatória');
          return false;
        }
        if (!formData.end_date) {
          alert('Data de término é obrigatória');
          return false;
        }
        if (!formData.end_time) {
          alert('Hora de término é obrigatória');
          return false;
        }
        
        // Validar se data de término é após início
        const start = new Date(`${formData.start_date}T${formData.start_time}`);
        const end = new Date(`${formData.end_date}T${formData.end_time}`);
        if (end <= start) {
          alert('Data de término deve ser posterior à data de início');
          return false;
        }
        return true;
        
      case 3:
        // Descrição é opcional, mas vamos sugerir
        if (!formData.description.trim()) {
          const confirm = window.confirm('Descrição está vazia. Deseja continuar mesmo assim?');
          return confirm;
        }
        return true;
        
      case 4:
        if (formData.location_type === 'physical') {
          if (!formData.location_city || !formData.location_state) {
            alert('Para eventos físicos, cidade e estado são obrigatórios');
            return false;
          }
        }
        return true;
        
      case 5:
        if (formData.tickets.length === 0) {
          const confirm = window.confirm('Nenhum ingresso foi criado. Deseja criar um evento sem ingressos?');
          return confirm;
        }
        
        // Validar ingressos
        for (let i = 0; i < formData.tickets.length; i++) {
          const ticket = formData.tickets[i];
          if (!ticket.title.trim()) {
            alert(`Título do ingresso ${i + 1} é obrigatório`);
            return false;
          }
          if (ticket.quantity < 0) {
            alert(`Quantidade do ingresso ${i + 1} não pode ser negativa`);
            return false;
          }
          if (formData.ticket_type === 'paid' && (ticket.price ?? 0) < 0) {
            alert(`Preço do ingresso ${i + 1} não pode ser negativo`);
            return false;
          }
        }
        return true;
        
      default:
        return true;
    }
  };

  // Ir para próxima etapa
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(Math.min(6, currentStep + 1));
    }
  };

  // Adicionar novo ingresso
  const addTicket = () => {
    const newTicket: TicketData = {
      id: `ticket_${Date.now()}`,
      title: '',
      quantity: 0,
      price: null,
      price_feminine: null,
      has_half_price: false,
      sale_period_type: 'date',
      sale_start_date: '',
      sale_start_time: '',
      sale_end_date: '',
      sale_end_time: '',
      availability: 'public',
      min_quantity: 0,
      max_quantity: 0,
      description: '',
      batches: [
        {
          batch_number: 1,
          quantity: 0,
          price_type: 'unissex',
          price: 0,
          price_feminine: null,
          sale_start_date: '',
          sale_start_time: '',
          sale_end_date: '',
          sale_end_time: ''
        },
        {
          batch_number: 2,
          quantity: 0,
          price_type: 'unissex',
          price: 0,
          price_feminine: null,
          sale_start_date: '',
          sale_start_time: '',
          sale_end_date: '',
          sale_end_time: ''
        }
      ]
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
    if (!user) {
      alert('Usuário não autenticado');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('🎫 EventFormModal - handleSubmit iniciado');
      console.log('🎫 EventFormModal - formData completo:', formData);

      // VALIDAÇÕES ROBUSTAS
      const validationErrors: string[] = [];
      
      // 1. Campos obrigatórios básicos
      if (!formData.title?.trim()) {
        validationErrors.push('Nome do evento é obrigatório');
      }
      
      if (!formData.start_date?.trim()) {
        validationErrors.push('Data de início é obrigatória');
      }
      
      if (!formData.start_time?.trim()) {
        validationErrors.push('Hora de início é obrigatória');
      }
      
      if (!formData.location_city?.trim()) {
        validationErrors.push('Cidade é obrigatória');
      }
      
      // 2. Validação de pares de data/hora
      try {
        // Start datetime (obrigatório)
        const startDatetime = validateDateTimePair(
          formData.start_date, 
          formData.start_time, 
          'Data e hora de início'
        );
        
        if (!startDatetime) {
          validationErrors.push('Data e hora de início são obrigatórias');
        }
        
        // End datetime (opcional)
        const endDatetime = validateDateTimePair(
          formData.end_date, 
          formData.end_time, 
          'Data e hora de término'
        );
        
        // 3. Validações de lógica de negócio
        if (endDatetime && startDatetime) {
          const startDate = new Date(startDatetime);
          const endDate = new Date(endDatetime);
          
          if (endDate <= startDate) {
            validationErrors.push('Data de término deve ser posterior à data de início');
          }
        }
        
        // 4. Validações de ingressos
        if (formData.ticket_type === 'paid' && formData.tickets.length === 0) {
          validationErrors.push('Eventos pagos devem ter pelo menos um tipo de ingresso');
        }
        
        if (formData.tickets.length > 0) {
          formData.tickets.forEach((ticket, index) => {
            if (!ticket.title?.trim()) {
              validationErrors.push(`Título do ingresso ${index + 1} é obrigatório`);
            }
            if ((ticket.price ?? 0) < 0) {
              validationErrors.push(`Preço do ingresso ${index + 1} não pode ser negativo`);
            }
            if (ticket.quantity < 0) {
              validationErrors.push(`Quantidade do ingresso ${index + 1} não pode ser negativa`);
            }
            
            // Validações para meia-entrada
            if (ticket.has_half_price) {
              if (!ticket.half_price_title?.trim()) {
                validationErrors.push(`Nome da meia-entrada do ingresso ${index + 1} é obrigatório`);
              }
              if (ticket.half_price_quantity <= 0) {
                validationErrors.push(`Quantidade da meia-entrada do ingresso ${index + 1} deve ser maior que zero`);
              }
              if ((ticket.half_price_price ?? 0) < 0) {
                validationErrors.push(`Preço da meia-entrada do ingresso ${index + 1} não pode ser negativo`);
              }
            }
            
            // Validações para lotes
            if (ticket.sale_period_type === 'batch' && ticket.batches.length > 0) {
              ticket.batches.forEach((batch, batchIndex) => {
                if (batch.quantity <= 0) {
                  validationErrors.push(`Quantidade do lote ${batch.batch_number} do ingresso ${index + 1} deve ser maior que zero`);
                }
                if (batch.price < 0) {
                  validationErrors.push(`Preço do lote ${batch.batch_number} do ingresso ${index + 1} não pode ser negativo`);
                }
                if (ticket.price_type === 'gender_separate' && (batch.price_feminine ?? 0) < 0) {
                  validationErrors.push(`Preço feminino do lote ${batch.batch_number} do ingresso ${index + 1} não pode ser negativo`);
                }
              });
            }
          });
        }
        
        // 5. Se houver erros de validação, parar aqui
        if (validationErrors.length > 0) {
          alert(`Erros de validação:\n${validationErrors.join('\n')}`);
          setIsSubmitting(false);
          return;
        }
        
        // 6. CONSTRUIR PAYLOAD CORRETO
        const payload = {
          // Campos básicos
          title: formData.title.trim(),
          description: formData.description || '',
          image: formData.image || '',
          subject: formData.subject || 'Evento',
          category: formData.category || 'evento',
          classification: formData.classification || 'Livre',
          
          // Datetimes formatados corretamente (usar nomes das colunas existentes)
          start_date: startDatetime,
          end_date: endDatetime,
          
          // Localização
          location: formData.location_name || formData.location_city || 'Local não informado',
          location_type: formData.location_type || 'physical',
          location_name: formData.location_name || '',
          location_city: formData.location_city || '',
          location_state: formData.location_state || '',
          location_street: formData.location_street || '',
          location_number: formData.location_number || '',
          location_complement: formData.location_complement || '',
          location_neighborhood: formData.location_neighborhood || '',
          location_cep: formData.location_cep || '',
          location_search: formData.location_search || '',
          
          // Ingressos
          ticket_type: formData.ticket_type || 'free',
          price: formData.tickets.length > 0 ? Math.min(...formData.tickets.map(t => t.price || 0)) : 0,
          
          // ✅ CAMPOS ADICIONAIS ADICIONADOS
          attractions: formData.attractions?.filter(a => a.trim() !== '') || [],
          important_info: formData.important_info?.filter(info => info.trim() !== '') || [],
          
          // ✅ CAMPOS DE CONTATO ADICIONADOS
          contact_info: {
            phone: formData.contact_phone || '(11) 99999-9999',
            hours: formData.contact_hours || [
              'Segunda a Sexta: 9h às 18h',
              'Sábados: 9h às 14h'
            ]
          },
          
          // Metadados
          organizer_id: user.id,
          status: event?.id ? event.status : 'pending', // Preservar status atual durante edição
          service_fee_type: formData.service_fee_type,
          created_at: event?.id ? event.created_at : new Date().toISOString() // Preservar data de criação durante edição
        };
        
        // 7. LOGS DETALHADOS PARA DEBUG
        console.log('🔍 DEBUG - Payload final:', JSON.stringify(payload, null, 2));
        console.log('🔍 DEBUG - Timestamps formatados:', {
          start_datetime: startDatetime,
          end_datetime: endDatetime
        });
        
        // 8. VERIFICAR AUTENTICAÇÃO (com timeout)
        const { data: { user: currentUser }, error: authError } = await withTimeout(
          supabase.auth.getUser(),
          10000,
          'Verificação de autenticação excedeu o tempo limite'
        );
        
        if (authError || !currentUser) {
          throw new Error('Usuário não autenticado. Faça login novamente.');
        }
        
        // 9. ✅ INSERIR OU ATUALIZAR NO SUPABASE (com timeout)
        let eventData;
        
        if (event?.id) {
          // ✅ MODO EDIÇÃO: Atualizar evento existente
          console.log('📝 Atualizando evento existente:', event.id);
          const { data, error: updateError } = await withTimeout(
            supabase
              .from('events')
              .update(payload)
              .eq('id', event.id)
              .select()
              .single(),
            30000,
            'Falha ao atualizar evento. Tente novamente.'
          );
          
          if (updateError) {
            console.error('❌ Erro ao atualizar evento:', updateError);
            throw new Error(`Erro ao atualizar evento: ${updateError.message}`);
          }
          
          eventData = data;
          console.log('✅ Evento atualizado com sucesso:', eventData);
        } else {
          // ✅ MODO CRIAÇÃO: Inserir novo evento
          console.log('➕ Criando novo evento');
        }
        
        // 9b. INSERIR NO SUPABASE (apenas se não for edição, com timeout)
        if (!event?.id) {
          const { data, error: insertError } = await withTimeout(
            supabase
              .from('events')
              .insert([payload])
              .select()
              .single(),
            30000,
            'Falha ao criar evento. Tente novamente.'
          );
          
          if (insertError) {
            console.error('❌ Erro ao inserir evento:', insertError);
            throw new Error(`Erro ao criar evento: ${insertError.message}`);
          }
          
          eventData = data;
          console.log('✅ Evento criado com sucesso:', eventData);
        }
        
        // 10. CRIAR/ATUALIZAR TIPOS DE INGRESSO
        if (formData.tickets && formData.tickets.length > 0) {
          console.log('🎫 Gerenciando tipos de ingresso...');
          
          // 10.1. Se for edição, deletar ingressos e lotes existentes primeiro
          if (event?.id) {
            console.log('🗑️ Deletando ingressos existentes do evento:', event.id);
            
            // Buscar IDs dos ingressos existentes
            const { data: existingTickets, error: fetchError } = await supabase
              .from('event_ticket_types')
              .select('id')
              .eq('event_id', event.id);
            
            if (fetchError) {
              console.error('❌ Erro ao buscar ingressos existentes:', fetchError);
            } else if (existingTickets && existingTickets.length > 0) {
              const ticketIds = existingTickets.map(t => t.id);
              
              // Deletar lotes primeiro (foreign key)
              console.log('🗑️ Deletando lotes existentes...');
              const { error: batchDeleteError } = await supabase
                .from('event_ticket_batches')
                .delete()
                .in('ticket_type_id', ticketIds);
              
              if (batchDeleteError) {
                console.error('❌ Erro ao deletar lotes:', batchDeleteError);
              } else {
                console.log('✅ Lotes deletados com sucesso');
              }
              
              // Depois deletar os ingressos
              console.log('🗑️ Deletando ingressos...');
              const { error: ticketDeleteError } = await supabase
                .from('event_ticket_types')
                .delete()
                .eq('event_id', event.id);
              
              if (ticketDeleteError) {
                console.error('❌ Erro ao deletar ingressos:', ticketDeleteError);
              } else {
                console.log('✅ Ingressos deletados com sucesso');
              }
            }
          }
          
          // 10.2. Criar os novos ingressos
          console.log('🎫 Criando tipos de ingresso...');
          
          const ticketsData = formData.tickets.map(ticket => ({
            event_id: eventData.id,
            title: ticket.title,
            name: ticket.title,
            description: ticket.description || '',
            price: ticket.price ?? (ticket.batches?.[0]?.price) ?? 0, // ✅ Fallback: lote ou 0
            price_feminine: ticket.price_feminine ?? (ticket.batches?.[0]?.price_feminine) ?? null,
            price_type: ticket.price_type,
            quantity: ticket.quantity,
            available_quantity: ticket.quantity,
            min_quantity: ticket.min_quantity,
            max_quantity: ticket.max_quantity,
            has_half_price: ticket.has_half_price,
            half_price_title: ticket.half_price_title,
            half_price_quantity: ticket.half_price_quantity,
            half_price_price: ticket.half_price_price,
            half_price_price_feminine: ticket.half_price_price_feminine,
            sale_period_type: ticket.sale_period_type,
            sale_start_date: ticket.sale_start_date ? `${ticket.sale_start_date}T${ticket.sale_start_time || '00:00'}:00Z` : null,
            sale_end_date: ticket.sale_end_date ? `${ticket.sale_end_date}T${ticket.sale_end_time || '23:59'}:00Z` : null,
            availability: ticket.availability,
            status: 'active',
            ticket_type: 'paid',
            service_fee_type: formData.service_fee_type
          }));
          
          const { data: insertedTickets, error: ticketsError } = await supabase
            .from('event_ticket_types')
            .insert(ticketsData)
            .select();
          
          if (ticketsError) {
            console.error('❌ Erro ao criar ingressos:', ticketsError);
            // Não falha o evento, apenas avisa
            console.warn('⚠️ Evento criado, mas houve erro ao criar ingressos');
          } else {
            console.log('✅ Ingressos criados com sucesso:', insertedTickets);
            
            // 10.1. CRIAR LOTES PARA CADA INGRESSO (se houver)
            for (let i = 0; i < insertedTickets.length; i++) {
              const insertedTicket = insertedTickets[i];
              const originalTicket = formData.tickets[i];
              
              if (originalTicket.batches && originalTicket.batches.length > 0) {
                console.log(`🎫 Criando lotes para ingresso: ${insertedTicket.title}`);
                
                const batchesData = originalTicket.batches.map(batch => ({
                  ticket_type_id: insertedTicket.id,
                  batch_number: batch.batch_number,
                  quantity: batch.quantity,
                  price_type: batch.price_type,
                  price: batch.price,
                  price_feminine: batch.price_feminine,
                  sale_start_date: batch.sale_start_date ? `${batch.sale_start_date}T${batch.sale_start_time || '00:00'}:00Z` : null,
                  sale_start_time: batch.sale_start_time || null,
                  sale_end_date: batch.sale_end_date ? `${batch.sale_end_date}T${batch.sale_end_time || '23:59'}:00Z` : null,
                  sale_end_time: batch.sale_end_time || null
                }));
                
                const { data: insertedBatches, error: batchesError } = await supabase
                  .from('event_ticket_batches')
                  .insert(batchesData)
                  .select();
                
                if (batchesError) {
                  console.error('❌ Erro ao criar lotes:', batchesError);
                  console.warn(`⚠️ Ingresso ${insertedTicket.title} criado, mas houve erro ao criar lotes`);
                } else {
                  console.log(`✅ Lotes criados com sucesso para ${insertedTicket.title}:`, insertedBatches);
                }
              }
            }
          }
        }
        
        // 11. ✅ SUCESSO (mensagem diferenciada)
        const successMessage = event?.id 
          ? '✅ Evento atualizado com sucesso!' 
          : '✅ Evento criado com sucesso!';
        
        setToast({ message: successMessage, type: 'success' });
        
        // Fechar modal após 2 segundos
        setTimeout(() => {
          onEventCreated?.();
          onClose();
        }, 2000);
        
      } catch (validationError) {
        if (validationError instanceof Error) {
          validationErrors.push(validationError.message);
        } else {
          validationErrors.push('Erro de validação desconhecido');
        }
        
        if (validationErrors.length > 0) {
          alert(`Erros de validação:\n${validationErrors.join('\n')}`);
          setIsSubmitting(false);
          return;
        }
      }
      
    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      
      let errorMessage = 'Erro desconhecido ao criar evento';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      alert(`Erro ao criar evento:\n${errorMessage}`);
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
           <p>Formato JPEG, PNG, GIF ou WebP de no máximo 5MB.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classificação
            </label>
            <select
              value={formData.classification}
              onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Selecione a classificação</option>
              <option value="livre">Livre</option>
              <option value="10">10 anos</option>
              <option value="12">12 anos</option>
              <option value="14">14 anos</option>
              <option value="16">16 anos</option>
              <option value="18">18 anos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Informações Importantes (opcional)
            </label>
            <div className="space-y-2">
              {formData.important_info.map((info, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={info}
                    onChange={(e) => {
                      const newImportantInfo = [...formData.important_info];
                      newImportantInfo[index] = e.target.value;
                      setFormData(prev => ({ ...prev, important_info: newImportantInfo }));
                    }}
                    placeholder="Informação importante sobre o evento"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newImportantInfo = formData.important_info.filter((_, i) => i !== index);
                      setFormData(prev => ({ ...prev, important_info: newImportantInfo }));
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, important_info: [...prev.important_info, ''] }))}
                className="flex items-center space-x-2 px-3 py-2 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Informação Importante</span>
              </button>
            </div>
          </div>
        </div>

        {/* Campo de Atrações */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Atrações (opcional)
          </label>
          <div className="space-y-2">
            {formData.attractions.map((attraction, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={attraction}
                  onChange={(e) => {
                    const newAttractions = [...formData.attractions];
                    newAttractions[index] = e.target.value;
                    setFormData(prev => ({ ...prev, attractions: newAttractions }));
                  }}
                  placeholder="Nome da atração"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newAttractions = formData.attractions.filter((_, i) => i !== index);
                    setFormData(prev => ({ ...prev, attractions: newAttractions }));
                  }}
                  className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, attractions: [...prev.attractions, ''] }))}
              className="flex items-center space-x-2 px-3 py-2 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Atração</span>
            </button>
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
          defaultValue="3"
        >
          <option value="1">Pequena</option>
          <option value="3">Normal</option>
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
        className="min-h-[200px] p-4 border-x border-b border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-pink-500 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
        onInput={() => {
          if (descriptionRef.current) {
            setFormData(prev => ({ 
              ...prev, 
              description: descriptionRef.current?.innerText || descriptionRef.current?.textContent || '' 
            }));
          }
        }}
        data-placeholder="Descreva seu evento aqui..."
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
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Ingressos</h3>
        <p className="text-sm text-gray-600 mb-4">Escolha o tipo de ingresso que deseja criar</p>
      </div>

      {/* Configuração de Taxa de Serviço */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
          Taxa de Serviço *
        </h4>
        

        {/* Quem paga a taxa */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quem Paga a Taxa
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="service_fee_type"
                value="buyer"
                checked={formData.service_fee_type === 'buyer'}
                onChange={(e) => setFormData(prev => ({ ...prev, service_fee_type: e.target.value as any }))}
                className="mr-3"
              />
              <div>
                <span className="font-medium text-gray-800">Cobrar Taxa do Público</span>
                <p className="text-sm text-gray-600">O comprador paga a taxa adicional sobre o preço do ingresso</p>
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="service_fee_type"
                value="seller"
                checked={formData.service_fee_type === 'seller'}
                onChange={(e) => setFormData(prev => ({ ...prev, service_fee_type: e.target.value as any }))}
                className="mr-3"
              />
              <div>
                <span className="font-medium text-gray-800">Descontar Taxa do Organizador</span>
                <p className="text-sm text-gray-600">A taxa é descontada do valor recebido pelo organizador</p>
              </div>
            </label>
          </div>
        </div>
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
        {formData.tickets.map((ticket, _index) => (
          <div key={ticket.id} className="border border-gray-200 rounded-lg p-6 relative bg-gradient-to-r from-pink-50 to-purple-50">
            {formData.tickets.length > 1 && (
              <button
                type="button"
                onClick={() => removeTicket(ticket.id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center gap-2">
              {formData.ticket_type === 'paid' ? 'Criar Ingresso Pago' : 'Criar Ingresso Gratuito'}
            </h4>


            {/* Nome do Ingresso */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Nome do Ingresso *
              </label>
              <input
                type="text"
                value={ticket.title}
                onChange={(e) => updateTicket(ticket.id, { title: e.target.value })}
                placeholder="Ex: VIP - Área Open Bar"
                maxLength={45}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Exemplo: Ingresso Único, Meia-Entrada, VIP, Área Premium etc. ({45 - ticket.title.length} caracteres restantes)
              </p>
            </div>


            {formData.ticket_type === 'paid' && (
              <>
                {/* Configuração de Preços */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Configuração de Preços
                  </label>
                  
                  {/* Opção de Tipo de Preço */}
                  <div className="mb-4">
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`price_type_${ticket.id}`}
                          value="unissex"
                          checked={ticket.price_type === 'unissex'}
                          onChange={(e) => updateTicket(ticket.id, { 
                            price_type: e.target.value as 'unissex',
                            price_feminine: null 
                          })}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium text-gray-800">Preço Único (Unissex)</span>
                          <p className="text-sm text-gray-600">Mesmo preço para todos os gêneros</p>
                        </div>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`price_type_${ticket.id}`}
                          value="gender_separate"
                          checked={ticket.price_type === 'gender_separate'}
                          onChange={(e) => updateTicket(ticket.id, { 
                            price_type: e.target.value as 'gender_separate' 
                          })}
                          className="mr-3"
                        />
                        <div>
                          <span className="font-medium text-gray-800">Preços por Gênero</span>
                          <p className="text-sm text-gray-600">Preços diferentes para masculino e feminino</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {ticket.sale_period_type === 'batch' ? (
                    /* Tabela de Lotes */
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-300 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Lote</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Quantidade</th>
                            {ticket.price_type === 'unissex' ? (
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Preço (R$)</th>
                            ) : (
                              <>
                                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Preço Masculino (R$)</th>
                                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Preço Feminino (R$)</th>
                              </>
                            )}
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Período de Venda</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ticket.batches.map((batch, batchIndex) => (
                            <tr key={batch.batch_number} className={batchIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-3 py-2">
                                <span className="font-medium">{batch.batch_number}º Lote</span>
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={batch.quantity || ''}
                                  onChange={(e) => {
                                    const newBatches = [...ticket.batches];
                                    newBatches[batchIndex].quantity = parseInt(e.target.value) || 0;
                                    updateTicket(ticket.id, { batches: newBatches });
                                  }}
                                  min="1"
                                  placeholder=""
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                              </td>
                              {ticket.price_type === 'unissex' ? (
                                <td className="border border-gray-300 px-3 py-2">
                                  <input
                                    type="number"
                                    value={batch.price || ''}
                                    onChange={(e) => {
                                      const newBatches = [...ticket.batches];
                                      newBatches[batchIndex].price = parseFloat(e.target.value) || 0;
                                      updateTicket(ticket.id, { batches: newBatches });
                                    }}
                                    step="0.01"
                                    min="0"
                                    placeholder="5.000"
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                  />
                                </td>
                              ) : (
                                <>
                                  <td className="border border-gray-300 px-3 py-2">
                                    <input
                                      type="number"
                                      value={batch.price || ''}
                                      onChange={(e) => {
                                        const newBatches = [...ticket.batches];
                                        newBatches[batchIndex].price = parseFloat(e.target.value) || 0;
                                        updateTicket(ticket.id, { batches: newBatches });
                                      }}
                                      step="0.01"
                                      min="0"
                                      placeholder="5.000"
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-3 py-2">
                                    <input
                                      type="number"
                                      value={batch.price_feminine || ''}
                                      onChange={(e) => {
                                        const newBatches = [...ticket.batches];
                                        newBatches[batchIndex].price_feminine = parseFloat(e.target.value) || 0;
                                        updateTicket(ticket.id, { batches: newBatches });
                                      }}
                                      step="0.01"
                                      min="0"
                                      placeholder="4.500"
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                  </td>
                                </>
                              )}
                              <td className="border border-gray-300 px-3 py-2">
                                <div className="flex gap-2">
                                  <input
                                    type="date"
                                    value={batch.sale_start_date}
                                    onChange={(e) => {
                                      const newBatches = [...ticket.batches];
                                      newBatches[batchIndex].sale_start_date = e.target.value;
                                      updateTicket(ticket.id, { batches: newBatches });
                                    }}
                                    className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500 text-sm"
                                  />
                                  <span className="text-gray-500">a</span>
                                  <input
                                    type="date"
                                    value={batch.sale_end_date}
                                    onChange={(e) => {
                                      const newBatches = [...ticket.batches];
                                      newBatches[batchIndex].sale_end_date = e.target.value;
                                      updateTicket(ticket.id, { batches: newBatches });
                                    }}
                                    className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500 text-sm"
                                  />
                                </div>
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                {ticket.batches.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newBatches = ticket.batches.filter((_, index) => index !== batchIndex);
                                      // Renumerar os lotes
                                      const renumberedBatches = newBatches.map((batch, index) => ({
                                        ...batch,
                                        batch_number: index + 1
                                      }));
                                      updateTicket(ticket.id, { batches: renumberedBatches });
                                    }}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Remover
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Preços simples por data */
                    <div className="grid grid-cols-1 gap-4">
                      {ticket.price_type === 'unissex' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preço Único (R$)
                          </label>
                          <input
                            type="number"
                            value={ticket.price || ''}
                            onChange={(e) => updateTicket(ticket.id, { price: parseFloat(e.target.value) || 0 })}
                            step="0.01"
                            min="0"
                            placeholder="Digite o preço"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço Masculino (R$)
                            </label>
                            <input
                              type="number"
                              value={ticket.price || ''}
                              onChange={(e) => updateTicket(ticket.id, { price: parseFloat(e.target.value) || 0 })}
                              step="0.01"
                              min="0"
                              placeholder="Digite o preço"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço Feminino (R$)
                            </label>
                            <input
                              type="number"
                              value={ticket.price_feminine || ''}
                              onChange={(e) => updateTicket(ticket.id, { price_feminine: parseFloat(e.target.value) || 0 })}
                              step="0.01"
                              min="0"
                              placeholder="Digite o preço"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Botão para adicionar lotes */}
                  {ticket.sale_period_type === 'batch' && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const newBatch = {
                            batch_number: ticket.batches.length + 1,
                            quantity: 0,
                            price_type: ticket.price_type,
                            price: 0,
                            price_feminine: ticket.price_type === 'gender_separate' ? 0 : null,
                            sale_start_date: '',
                            sale_start_time: '',
                            sale_end_date: '',
                            sale_end_time: ''
                          };
                          updateTicket(ticket.id, { 
                            batches: [...ticket.batches, newBatch] 
                          });
                        }}
                        className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        + Adicionar Lote
                      </button>
                    </div>
                  )}
                </div>

                {/* Período de vendas */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Período das Vendas
                  </h5>
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
                        <input
                          type="time"
                          value={ticket.sale_start_time}
                          onChange={(e) => updateTicket(ticket.id, { sale_start_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
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
                        <input
                          type="time"
                          value={ticket.sale_end_time}
                          onChange={(e) => updateTicket(ticket.id, { sale_end_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}

            {/* Configurações do Ingresso */}
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                Configurações do Ingresso
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade total disponível:
                  </label>
                  <input
                    type="number"
                    value={ticket.quantity || ''}
                    onChange={(e) => updateTicket(ticket.id, { quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    placeholder=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {formData.ticket_type === 'paid' && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ticket.has_half_price}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        updateTicket(ticket.id, { 
                          has_half_price: isChecked,
                          half_price_title: isChecked ? `${ticket.title} - MEIA` : '',
                          half_price_quantity: isChecked ? Math.floor(ticket.quantity / 2) : 0,
                          half_price_price: isChecked && ticket.price ? ticket.price / 2 : null,
                          half_price_price_feminine: isChecked && ticket.price_feminine ? ticket.price_feminine / 2 : null
                        });
                      }}
                      className="mr-2"
                    />
                    Criar meia-entrada para este ingresso
                  </label>
                  
                  {ticket.has_half_price && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nome da meia-entrada *
                        </label>
                        <input
                          type="text"
                          value={ticket.half_price_title}
                          onChange={(e) => updateTicket(ticket.id, { half_price_title: e.target.value })}
                          placeholder="Ex: VIP - MEIA"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantidade *
                        </label>
                        <input
                          type="number"
                          value={ticket.half_price_quantity}
                          onChange={(e) => updateTicket(ticket.id, { half_price_quantity: parseInt(e.target.value) || 0 })}
                          min="1"
                          placeholder="Ex: 50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ex. define a quantidade
                        </p>
                      </div>
                      
                      {ticket.price_type === 'unissex' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preço *
                          </label>
                          <input
                            type="number"
                            value={ticket.half_price_price || ''}
                            onChange={(e) => updateTicket(ticket.id, { half_price_price: parseFloat(e.target.value) || 0 })}
                            step="0.01"
                            min="0"
                            placeholder="R$ 25.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            R$ 50% do valor do ingresso
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Preço Masculino *
                            </label>
                            <input
                              type="number"
                              value={ticket.half_price_price || ''}
                              onChange={(e) => updateTicket(ticket.id, { half_price_price: parseFloat(e.target.value) || 0 })}
                              step="0.01"
                              min="0"
                              placeholder="R$ 25.00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Preço Feminino *
                            </label>
                            <input
                              type="number"
                              value={ticket.half_price_price_feminine || ''}
                              onChange={(e) => updateTicket(ticket.id, { half_price_price_feminine: parseFloat(e.target.value) || 0 })}
                              step="0.01"
                              min="0"
                              placeholder="R$ 22.50"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs text-gray-500">
                              Total comprador: R$ 50% do valor do ingresso
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Disponibilidade */}
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                Disponibilidade
              </h5>
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

            {/* Limites por Compra */}
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                Limites por Compra
              </h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mínima:
                  </label>
                  <input
                    type="number"
                    value={ticket.min_quantity || ''}
                    onChange={(e) => updateTicket(ticket.id, { min_quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    placeholder=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máxima:
                  </label>
                  <input
                    type="number"
                    value={ticket.max_quantity || ''}
                    onChange={(e) => updateTicket(ticket.id, { max_quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    placeholder=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Descrição do Ingresso (opcional)
              </label>
              <textarea
                value={ticket.description}
                onChange={(e) => updateTicket(ticket.id, { description: e.target.value })}
                placeholder="Esse ingresso dá direito a 2 bebidas + copo personalizado."
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

  const renderStep6 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Informações de Contato</h3>
        <p className="text-sm text-gray-600 mb-4">Defina como os participantes podem entrar em contato</p>
      </div>

      {/* Telefone de contato */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Telefone de Contato
        </label>
        <input
          type="tel"
          value={formData.contact_phone}
          onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
          placeholder="(11) 99999-9999"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Telefone para contato dos participantes
        </p>
      </div>

      {/* Horários de atendimento */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Horários de Atendimento
        </label>
        <div className="space-y-3">
          {formData.contact_hours.map((hour, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={hour}
                onChange={(e) => {
                  const newHours = [...formData.contact_hours];
                  newHours[index] = e.target.value;
                  setFormData(prev => ({ ...prev, contact_hours: newHours }));
                }}
                placeholder="Ex: Segunda a Sexta: 9h às 18h"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {formData.contact_hours.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newHours = formData.contact_hours.filter((_, i) => i !== index);
                    setFormData(prev => ({ ...prev, contact_hours: newHours }));
                  }}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ 
            ...prev, 
            contact_hours: [...prev.contact_hours, ''] 
          }))}
          className="mt-2 text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Adicionar horário
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Ex: Segunda a Sexta: 9h às 18h, Sábados: 9h às 14h
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto my-4 sm:my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800">
            {event ? 'Editar Evento' : (currentStep === 1 && 'Informações Básicas')}
            {(!event && currentStep === 2) && 'Data e Horário'}
            {(!event && currentStep === 3) && 'Descrição do Evento'}
            {(!event && currentStep === 4) && 'Local do Evento'}
            {(!event && currentStep === 5) && 'Ingressos'}
            {(!event && currentStep === 6) && 'Informações de Contato'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Progress bar */}
        {!event && (
          <div className="px-4 sm:px-6 py-2 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
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
                style={{ width: `${(currentStep / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] sm:max-h-[60vh]">
          {/* Em modo edição, mostramos todas as seções em sequência já preenchidas */}
          {event ? (
            <>
              {renderStep1()}
              {renderStep2()}
              {renderStep3()}
              {renderStep4()}
              {renderStep5()}
              {renderStep6()}
            </>
          ) : (
            <>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
              {currentStep === 6 && renderStep6()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          {!event ? (
            <>
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Voltar
              </button>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={onClose}
                  type="button"
                  className="px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                {currentStep < 6 ? (
                  <button
                    onClick={goToNextStep}
                    type="button"
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    type="button"
                    disabled={isSubmitting}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Criando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Criar Evento</span>
                        <span className="sm:hidden">Criar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="ml-auto flex gap-2 sm:gap-3">
              <button
                onClick={onClose}
                type="button"
                className="px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                type="button"
                disabled={isSubmitting}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✨ Toast de Sucesso/Erro */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}
    </div>
  );
};

export default EventFormModal;