
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

interface RegistrarEntradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const RegistrarEntradaModal: React.FC<RegistrarEntradaModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    cashAmount: 0,
    responsible1: '',
    responsible2: '',
    responsible3: '',
    transfer: 0,
    missionaryOffering: 0,
    missionaryResponsible: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      cashAmount: 0,
      responsible1: '',
      responsible2: '',
      responsible3: '',
      transfer: 0,
      missionaryOffering: 0,
      missionaryResponsible: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Registrar Entrada</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor em Dinheiro (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.cashAmount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, cashAmount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável 1
            </label>
            <input
              type="text"
              value={formData.responsible1}
              onChange={(e) => setFormData(prev => ({ ...prev, responsible1: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none"
              placeholder="Nome do responsável"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável 2
            </label>
            <input
              type="text"
              value={formData.responsible2}
              onChange={(e) => setFormData(prev => ({ ...prev, responsible2: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none"
              placeholder="Nome do responsável"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável 3
            </label>
            <input
              type="text"
              value={formData.responsible3}
              onChange={(e) => setFormData(prev => ({ ...prev, responsible3: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none"
              placeholder="Nome do responsável"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transferência (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.transfer || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, transfer: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Oferta Missionária (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.missionaryOffering || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, missionaryOffering: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável Missionária
            </label>
            <input
              type="text"
              value={formData.missionaryResponsible}
              onChange={(e) => setFormData(prev => ({ ...prev, missionaryResponsible: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A237E] focus:border-transparent outline-none"
              placeholder="Nome do responsável"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center px-4 py-2 bg-[#1A237E] text-white rounded-lg hover:bg-[#0D47A1] transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrarEntradaModal;
