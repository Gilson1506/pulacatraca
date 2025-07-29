import React from 'react';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
  onSubmit: (eventData: any) => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, event, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6">
        <h2>Modal Teste</h2>
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
};

export default EventFormModal;