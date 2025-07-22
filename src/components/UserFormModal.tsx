import React, { useState } from 'react';
import { X } from 'lucide-react';

const UserFormModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: 'Brasil',
    docType: 'CPF',
    docNumber: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple validation
    if (formData.name && formData.email && formData.docNumber) {
      onSubmit(formData);
    } else {
      alert('Por favor, preencha todos os campos obrigatórios.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Preencher Dados do Utilizador</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" required />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">País</label>
            <select name="country" id="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
              {/* Deveria ser uma lista maior, mas para o exemplo: */}
              <option>Brasil</option>
              <option>Portugal</option>
              <option>Estados Unidos</option>
              <option>Outro</option>
            </select>
          </div>
          <div className="flex gap-4">
            <div className="w-1/3">
                <label htmlFor="docType" className="block text-sm font-medium text-gray-700 mb-1">Documento</label>
                <select name="docType" id="docType" value={formData.docType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
                    <option>CPF</option>
                    <option>RG</option>
                    <option>Passaporte</option>
                </select>
            </div>
            <div className="w-2/3">
                <label htmlFor="docNumber" className="block text-sm font-medium text-gray-700 mb-1">Número do Documento</label>
                <input type="text" name="docNumber" id="docNumber" value={formData.docNumber} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" required />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal; 