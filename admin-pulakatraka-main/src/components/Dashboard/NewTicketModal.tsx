import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: string, message: string, priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente') => void;
}

export default function NewTicketModal({ isOpen, onClose, onSave }: NewTicketModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Urgente'>('Média');

  if (!isOpen) return null;

  const handleSave = () => {
    if (subject.trim() && message.trim()) {
      onSave(subject, message, priority);
      setSubject('');
      setMessage('');
      setPriority('Média');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Abrir Novo Ticket de Suporte</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ex: Problema com pagamento"
            />
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={5}
              placeholder="Descreva o problema em detalhes..."
            />
          </div>
        </div>

        <div className="flex justify-end items-center p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 mr-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!subject.trim() || !message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Abrir Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
} 