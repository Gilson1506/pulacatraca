import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Calendar, Clock, MapPin, Ticket, Plus, Minus, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Link, Image, Type, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EventSuccessModal from './EventSuccessModal';

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
  
  // ✅ NOVOS: Seção 6: Informações Adicionais
  important_info: string[];
  attractions: string[];
}

interface TicketData {
  id: string;
  title: string;
  quantity: number;
  price: number;
  price_feminine: number;
  area: string;
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
  // Campos para lotes
  batches: {
    batch_number: number;
    price_masculine: number;
    price_feminine: number;
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
  onSubmit?: (eventData: any) => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onEventCreated, event, onSubmit }) => {
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
    tickets: [
      {
        id: 'ticket_default',
        title: 'Ingresso Geral',
        quantity: 100,
        price: 0,
        price_feminine: 0,
        area: 'Pista',
        has_half_price: false,
        sale_period_type: 'date',
        sale_start_date: '',
        sale_start_time: '',
        sale_end_date: '',
        sale_end_time: '',
        availability: 'public',
        min_quantity: 1,
        max_quantity: 5,
        description: '',
        batches: []
      }
    ],
    
    // ✅ NOVOS: Seção 6: Informações Adicionais
    important_info: [''],
    attractions: ['']
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventData, setCreatedEventData] = useState<any>(null);

  // Pré-preencher quando estiver editando
  useEffect(() => {
    const prefill = async () => {
      if (!event) return;
      try {
        // Imagem
        setImagePreview(event.image || '');

        // Datas
        const startDate = event.date || (event.start_date ? String(event.start_date).slice(0, 10) : '');
        const startTime = event.time || (event.start_date ? String(event.start_date).slice(11, 16) : '');
        const endDate = event.endDate || (event.end_date ? String(event.end_date).slice(0, 10) : '');
        const endTime = event.endTime || (event.end_date ? String(event.end_date).slice(11, 16) : '');

        // Local básico
        const locationText = event.location || '';
        const parts = locationText.split(',');
        const city = (event.location_city || parts[0] || '').trim();
        const state = (event.location_state || parts[1] || '').trim();

        setFormData(prev => ({
          ...prev,
          title: event.name || event.title || '',
          image: event.image || '',
          subject: event.subject || '',
          category: event.category || '',
          start_date: startDate || '',
          start_time: startTime || '',
          end_date: endDate || '',
          end_time: endTime || '',
          description: event.description || '',
          location_type: event.location_type || 'physical',
          location_search: event.location_name || '',
          location_name: event.location_name || '',
          location_address: event.address || '',
          location_city: city,
          location_state: state,
          location_street: event.location_street || '',
          location_number: event.location_number || '',
          location_neighborhood: event.location_neighborhood || '',
          location_cep: event.location_cep || '',
          ticket_type: event.ticket_type || 'paid',
        }));

        // Buscar tipos de ingressos reais (se existir event.id)
        if (event.id) {
          const { data: types } = await supabase
            .from('event_ticket_types')
            .select('*')
            .eq('event_id', event.id)
            .order('price', { ascending: true });
          if (types && types.length) {
            const mapped = types.map((t: any) => ({
              id: t.id,
              title: t.title || t.name || '',
              quantity: t.quantity || t.available_quantity || 0,
              price: t.price_masculine ?? t.price ?? 0,
              price_feminine: t.price_feminine ?? 0,
              area: t.area || 'Pista',
              has_half_price: !!t.has_half_price,
              sale_period_type: (t.sale_period_type as any) || 'date',
              sale_start_date: t.sale_start_date ? String(t.sale_start_date).slice(0,10) : '',
              sale_start_time: t.sale_start_date ? String(t.sale_start_date).slice(11,16) : '',
              sale_end_date: t.sale_end_date ? String(t.sale_end_date).slice(0,10) : '',
              sale_end_time: t.sale_end_date ? String(t.sale_end_date).slice(11,16) : '',
              availability: (t.availability as any) || 'public',
              min_quantity: t.min_quantity || 1,
              max_quantity: t.max_quantity || 5,
              description: t.description || '',
              batches: [],
            }));
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
      const { data: bucketData, error: bucketError } = await supabase.storage
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
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(percent);
            console.log(`📊 Upload progress: ${percent.toFixed(1)}%`);
          }
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
      
    } catch (error) {
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
        description: descriptionRef.current?.innerHTML || '' 
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
          if (ticket.quantity <= 0) {
            alert(`Quantidade do ingresso ${i + 1} deve ser maior que zero`);
            return false;
          }
          if (formData.ticket_type === 'paid' && ticket.price < 0) {
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
      setCurrentStep(Math.min(5, currentStep + 1));
    }
  };

  // Adicionar novo ingresso
  const addTicket = () => {
    const newTicket: TicketData = {
      id: `ticket_${Date.now()}`,
      title: '',
      quantity: 100,
      price: 0,
      price_feminine: 0,
      area: 'Pista',
      has_half_price: false,
      sale_period_type: 'date',
      sale_start_date: '',
      sale_start_time: '',
      sale_end_date: '',
      sale_end_time: '',
      availability: 'public',
      min_quantity: 1,
      max_quantity: 5,
      description: '',
      batches: [
        {
          batch_number: 1,
          price_masculine: 0,
          price_feminine: 0,
          sale_start_date: '',
          sale_start_time: '',
          sale_end_date: '',
          sale_end_time: ''
        },
        {
          batch_number: 2,
          price_masculine: 0,
          price_feminine: 0,
          sale_start_date: '',
          sale_start_time: '',
          sale_end_date: '',
          sale_end_time: ''
        },
        {
          batch_number: 3,
          price_masculine: 0,
          price_feminine: 0,
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
    if (!user) return;

    try {
      setIsSubmitting(true);
      console.log('🎫 EventFormModal - handleSubmit iniciado');
      console.log('🎫 EventFormModal - formData completo:', formData);

      // Se o pai fornece onSubmit, delegar criação/edição ao pai
      if (onSubmit) {
        const minimalPrice = formData.tickets.length > 0 ? Math.min(...formData.tickets.map(t => t.price || 0)) : 0;
        const totalQty = formData.tickets.reduce((acc, t) => acc + (t.quantity || 0), 0);

        const payload = {
          id: event?.id,
          name: formData.title.trim(),
          date: formData.start_date,
          time: formData.start_time,
          endDate: formData.end_date,
          endTime: formData.end_time,
          location: formData.location_name || formData.location_address || formData.location_city || '',
          description: formData.description,
          status: event?.status || 'pending',
          category: formData.category || event?.category || '',
          price: minimalPrice,
          totalTickets: totalQty,
          image: formData.image,
          ticketTypes: formData.tickets.map(t => ({
            name: t.title,
            description: t.description,
            area: t.area,
            price: t.price,
            price_feminine: t.price_feminine,
            quantity: t.quantity,
            min_quantity: t.min_quantity,
            max_quantity: t.max_quantity,
            has_half_price: t.has_half_price,
            sale_period_type: t.sale_period_type,
            sale_start_date: t.sale_start_date,
            sale_start_time: t.sale_start_time,
            sale_end_date: t.sale_end_date,
            sale_end_time: t.sale_end_time,
            availability: t.availability,
          }))
        };

        await onSubmit(payload);
        setIsSubmitting(false);
        onClose();
        return;
      }

      // Validações básicas
      if (!formData.title.trim()) {
        alert('Nome do evento é obrigatório');
        return;
      }

      if (!formData.start_date || !formData.start_time) {
        alert('Data e hora de início são obrigatórias');
        return;
      }

      // Calcular dados dos ingressos
      const totalTicketsCount = formData.tickets.reduce((acc, t) => acc + (t.quantity || 0), 0);
      const minPrice = formData.tickets.length > 0 ? Math.min(...formData.tickets.map(t => t.price || 0)) : 0;
      
      // Calcular datas de venda (primeira data de início e última de fim)
      const salesDates = formData.tickets
        .filter(t => t.sale_start_date && t.sale_start_time)
        .map(t => new Date(`${t.sale_start_date}T${t.sale_start_time}:00`))
        .sort((a, b) => a.getTime() - b.getTime());
      
      const salesEndDates = formData.tickets
        .filter(t => t.sale_end_date && t.sale_end_time)
        .map(t => new Date(`${t.sale_end_date}T${t.sale_end_time}:00`))
        .sort((a, b) => b.getTime() - a.getTime());

      // Gerar endereço completo
      const fullAddress = formData.location_type === 'physical' ? 
        [
          formData.location_street,
          formData.location_number,
          formData.location_complement,
          formData.location_neighborhood,
          formData.location_city,
          formData.location_state,
          formData.location_cep
        ].filter(Boolean).join(', ') : null;

      // Extrair metadados da imagem se disponível
      const imageMetadata = formData.image ? {
        url: formData.image,
        uploaded_at: new Date().toISOString(),
        source: 'user_upload'
      } : {};

      // Criar evento
      const eventData = {
        // ✅ Campos obrigatórios básicos
        title: formData.title.trim(),
        description: formData.description || '',
        start_date: `${formData.start_date}T${formData.start_time}:00`,
        end_date: formData.end_date ? 
          `${formData.end_date}T${formData.end_time || '23:59'}:00` : 
          `${formData.start_date}T23:59:00`, // ✅ CORRIGIDO: sempre definir end_date
        
        // ✅ Campos de assunto e categoria corrigidos
        subject: formData.subject || null,
        subcategory: formData.category || null,
        category: formData.category || formData.subject || 'evento', // ✅ CORRIGIDO: priorizar category
        
        // ✅ Campos de localização
        location: formData.location_type === 'tbd' ? 'Local ainda será definido' : 
                 formData.location_type === 'online' ? 'Evento Online' :
                 `${formData.location_name || formData.location_street} ${formData.location_number || ''}, ${formData.location_city || ''} - ${formData.location_state || ''}`.trim(),
        location_type: formData.location_type,
        location_search: formData.location_search || null,
        location_name: formData.location_name || null,
        location_cep: formData.location_cep || null,
        location_street: formData.location_street || null,
        location_number: formData.location_number || null,
        location_complement: formData.location_complement || null,
        location_neighborhood: formData.location_neighborhood || null,
        location_city: formData.location_city || null,
        location_state: formData.location_state || null,
        address: fullAddress, // ✅ NOVO: endereço completo
        
        // ✅ Campos de ingresso e imagem
        ticket_type: formData.ticket_type,
        image: formData.image || null,
        price: minPrice,
        
        // ✅ NOVOS: Campos de controle de ingressos
        available_tickets: totalTicketsCount,
        total_tickets: totalTicketsCount,
        sold_tickets: 0,
        max_tickets_per_user: Math.max(...formData.tickets.map(t => t.max_quantity || 5), 5),
        min_tickets_per_user: Math.min(...formData.tickets.map(t => t.min_quantity || 1), 1),
        
        // ✅ NOVOS: Campos de venda
        ticket_sales_start: salesDates.length > 0 ? salesDates[0].toISOString() : null,
        ticket_sales_end: salesEndDates.length > 0 ? salesEndDates[0].toISOString() : null,
        
        // ✅ NOVOS: Campos de metadados da imagem
        banner_metadata: imageMetadata,
        banner_alt_text: `Banner do evento ${formData.title.trim()}`,
        image_size: 0, // Será atualizado se tivermos o tamanho
        image_format: formData.image ? formData.image.split('.').pop()?.toLowerCase() : null,
        
        // ✅ NOVOS: Campos adicionais
        tags: formData.subject ? [formData.subject, formData.category].filter(Boolean) : [],
        important_info: formData.important_info.filter(info => info.trim() !== ''),
        attractions: formData.attractions.filter(attraction => attraction.trim() !== ''),
        classification: null, // Pode ser adicionado no formulário
        
        // ✅ Campos de controle
        organizer_id: user.id,
        created_by: user.id,
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
      console.log('🎫 EventFormModal - Tickets no formData:', formData.tickets);
      
      if (formData.tickets.length > 0) {
        const ticketsData = formData.tickets.map(ticket => ({
          event_id: event.id,
          title: ticket.title,
          name: ticket.title,
          price: ticket.price,
          price_masculine: ticket.price,
          price_feminine: ticket.price_feminine || ticket.price * 0.9,
          area: ticket.area || 'Pista',
          quantity: ticket.quantity,
          available_quantity: ticket.quantity,
          description: ticket.description || null,
          sale_start_date: ticket.sale_start_date ? `${ticket.sale_start_date}T${ticket.sale_start_time}:00` : null,
          sale_end_date: ticket.sale_end_date ? `${ticket.sale_end_date}T${ticket.sale_end_time}:00` : null,
          sale_period_type: ticket.sale_period_type || 'date',
          min_quantity: ticket.min_quantity || 1,
          max_quantity: ticket.max_quantity || 5,
          availability: ticket.availability || 'public',
          has_half_price: ticket.has_half_price || false,
          ticket_type: 'paid',
          status: 'active'
        }));

        console.log('🎫 EventFormModal - Dados dos tickets para inserir:', ticketsData);
        
        const { data: insertedTickets, error: ticketsError } = await supabase
          .from('event_ticket_types')
          .insert(ticketsData)
          .select();

        if (ticketsError) {
          console.error('❌ EventFormModal - Erro ao criar ingressos:', ticketsError);
          // Não falhar se ingressos não foram criados
        } else {
          console.log('✅ EventFormModal - Ingressos criados com sucesso:', insertedTickets);
        }
      }

      // Preparar dados para o modal de sucesso
      const successData = {
        title: eventData.title,
        start_date: eventData.start_date,
        start_time: formData.start_time,
        ticket_type: eventData.ticket_type,
        tickets_count: formData.tickets.length,
        location_type: eventData.location_type,
        location: eventData.location,
        location_name: eventData.location_name,
        location_city: eventData.location_city,
        location_state: eventData.location_state
      };
      
      setCreatedEventData(successData);
      setShowSuccessModal(true);
      
      // Reset form
      setFormData({
        title: '',
        image: '',
        subject: '',
        category: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        description: '',
        location_type: 'tbd',
        location_search: '',
        location_name: '',
        location_cep: '',
        location_street: '',
        location_number: '',
        location_complement: '',
        location_neighborhood: '',
        location_city: '',
        location_state: '',
        ticket_type: 'paid',
        tickets: []
      });
      setCurrentStep(1);
      setImagePreview('');

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
      </div>

      {/* Informações Importantes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Informações Importantes (opcional)
          </label>
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                important_info: [...prev.important_info, '']
              }));
            }}
            className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {formData.important_info.map((info, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={info}
                onChange={(e) => {
                  const newInfo = [...formData.important_info];
                  newInfo[index] = e.target.value;
                  setFormData(prev => ({ ...prev, important_info: newInfo }));
                }}
                placeholder="Ex: Documento obrigatório, Chegue com antecedência..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {formData.important_info.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newInfo = formData.important_info.filter((_, i) => i !== index);
                    setFormData(prev => ({ ...prev, important_info: newInfo }));
                  }}
                  className="px-3 py-2 text-red-500 hover:text-red-600"
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Atrações */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Atrações e Artistas (opcional)
          </label>
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                attractions: [...prev.attractions, '']
              }));
            }}
            className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {formData.attractions.map((attraction, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={attraction}
                onChange={(e) => {
                  const newAttractions = [...formData.attractions];
                  newAttractions[index] = e.target.value;
                  setFormData(prev => ({ ...prev, attractions: newAttractions }));
                }}
                placeholder="Ex: DJ John, Banda XYZ, Show de Luzes..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {formData.attractions.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newAttractions = formData.attractions.filter((_, i) => i !== index);
                    setFormData(prev => ({ ...prev, attractions: newAttractions }));
                  }}
                  className="px-3 py-2 text-red-500 hover:text-red-600"
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
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
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Ingressos</h3>
        <p className="text-sm text-gray-600 mb-4">Escolha o tipo de ingresso que deseja criar</p>
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

            {formData.ticket_type === 'paid' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  A taxa de serviço é repassada ao comprador, sendo exibida junto com o valor do ingresso
                </p>
              </div>
            )}

            {/* Título do Ingresso */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Título do Ingresso
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

            {/* Área do Ingresso */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Área do Ingresso
              </label>
              <select
                value={ticket.area}
                onChange={(e) => updateTicket(ticket.id, { area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="Pista">Pista</option>
                <option value="Área VIP">Área VIP</option>
                <option value="Camarote">Camarote</option>
                <option value="Backstage">Backstage</option>
                <option value="Área Premium">Área Premium</option>
                <option value="Front Stage">Front Stage</option>
                <option value="Open Bar">Open Bar</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Exemplo: Pista, Camarote, Área VIP, Backstage
              </p>
            </div>

            {formData.ticket_type === 'paid' && (
              <>
                {/* Preços por Gênero */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    Preços por Gênero
                  </label>
                  
                  {ticket.sale_period_type === 'batch' ? (
                    /* Tabela de Lotes */
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-300 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Tipo de Ingresso</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Preço Masculino (R$)</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Preço Feminino (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ticket.batches.map((batch, batchIndex) => (
                            <tr key={batch.batch_number} className={batchIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-3 py-2">
                                <span className="font-medium">Lote {batch.batch_number}</span>
                                {batch.batch_number === 3 && <span className="text-xs text-gray-500"> (opcional)</span>}
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={batch.price_masculine}
                                  onChange={(e) => {
                                    const newBatches = [...ticket.batches];
                                    newBatches[batchIndex].price_masculine = parseFloat(e.target.value) || 0;
                                    updateTicket(ticket.id, { batches: newBatches });
                                  }}
                                  step="0.01"
                                  min="0"
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="number"
                                  value={batch.price_feminine}
                                  onChange={(e) => {
                                    const newBatches = [...ticket.batches];
                                    newBatches[batchIndex].price_feminine = parseFloat(e.target.value) || 0;
                                    updateTicket(ticket.id, { batches: newBatches });
                                  }}
                                  step="0.01"
                                  min="0"
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Preços simples por data */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preço Masculino (R$)
                        </label>
                        <input
                          type="number"
                          value={ticket.price}
                          onChange={(e) => updateTicket(ticket.id, { price: parseFloat(e.target.value) || 0 })}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preço Feminino (R$)
                        </label>
                        <input
                          type="number"
                          value={ticket.price_feminine}
                          onChange={(e) => updateTicket(ticket.id, { price_feminine: parseFloat(e.target.value) || 0 })}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
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

                  {ticket.sale_period_type === 'batch' && (
                    <div className="space-y-4">
                      <h6 className="text-sm font-medium text-gray-700">Datas dos Lotes</h6>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Lote</th>
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Início das Vendas</th>
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">Fim das Vendas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ticket.batches.map((batch, batchIndex) => (
                              <tr key={batch.batch_number} className={batchIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border border-gray-300 px-3 py-2 font-medium">{batch.batch_number}</td>
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
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                    <input
                                      type="time"
                                      value={batch.sale_start_time}
                                      onChange={(e) => {
                                        const newBatches = [...ticket.batches];
                                        newBatches[batchIndex].sale_start_time = e.target.value;
                                        updateTicket(ticket.id, { batches: newBatches });
                                      }}
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                  </div>
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="date"
                                      value={batch.sale_end_date}
                                      onChange={(e) => {
                                        const newBatches = [...ticket.batches];
                                        newBatches[batchIndex].sale_end_date = e.target.value;
                                        updateTicket(ticket.id, { batches: newBatches });
                                      }}
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                    <input
                                      type="time"
                                      value={batch.sale_end_time}
                                      onChange={(e) => {
                                        const newBatches = [...ticket.batches];
                                        newBatches[batchIndex].sale_end_time = e.target.value;
                                        updateTicket(ticket.id, { batches: newBatches });
                                      }}
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                    value={ticket.quantity}
                    onChange={(e) => updateTicket(ticket.id, { quantity: parseInt(e.target.value) || 0 })}
                    min="1"
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
                      onChange={(e) => updateTicket(ticket.id, { has_half_price: e.target.checked })}
                      className="mr-2"
                    />
                    Criar meia-entrada?
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    <a href="#" className="text-blue-600 hover:underline">Saiba mais sobre as políticas de meia-entrada</a>
                  </p>
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
                    value={ticket.min_quantity}
                    onChange={(e) => updateTicket(ticket.id, { min_quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máxima:
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
              {[1, 2, 3, 4, 5].map((step) => (
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
                style={{ width: `${(currentStep / 5) * 100}%` }}
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

            </>
          ) : (
            <>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}

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
                {currentStep < 5 ? (
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

      {/* Modal de Sucesso - mantido para fluxo de criação com onEventCreated */}
      {showSuccessModal && createdEventData && (
        <EventSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedEventData(null);
            if (typeof onEventCreated === 'function') {
              onEventCreated();
            }
            if (typeof onClose === 'function') {
              onClose();
            }
          }}
          eventData={createdEventData}
        />
      )}
    </div>
  );
};

export default EventFormModal;