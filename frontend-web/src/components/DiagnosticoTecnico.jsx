import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { FiSave, FiAlertCircle } from 'react-icons/fi';

const DiagnosticoTecnico = ({ idOrden }) => {
  const [diagnostico, setDiagnostico] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleGuardar = async () => {
    if (!diagnostico.trim()) {
      showToast('El diagnóstico no puede estar vacío', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      // Endpoint según openapi.yaml: PATCH /ordenes-trabajo/{id_orden}/diagnostico
      const response = await api.patch(`/ordenes-trabajo/${idOrden}/diagnostico`, {
        diagnostico_tecnico: diagnostico.trim(),
      });

      if (response.status === 200 || response.status === 201) {
        showToast('Diagnóstico guardado exitosamente', 'success');
      }
    } catch (error) {
      console.error('Error al guardar el diagnóstico', error);
      // Nota: El AxiosInterceptor global ya disparará un Toast de error si hay fallo 4xx/5xx
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <FiAlertCircle className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900 text-lg">Información de Diagnóstico</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Como Técnico, ingresa aquí los detalles, observaciones y el diagnóstico final de la orden de trabajo.
      </p>
      
      <div className="relative">
        <textarea
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          placeholder="Escribe el diagnóstico detallado aquí..."
          rows={6}
          disabled={isSubmitting}
          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm resize-y"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleGuardar}
          disabled={isSubmitting || !diagnostico.trim()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FiSave className="w-4 h-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar Diagnóstico'}
        </button>
      </div>
    </div>
  );
};

export default DiagnosticoTecnico;
