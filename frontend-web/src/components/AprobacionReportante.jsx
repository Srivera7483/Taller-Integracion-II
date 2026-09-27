import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { FiCheck, FiX, FiSend } from 'react-icons/fi';

const AprobacionReportante = ({ incidenciaId, onAprobacionCompletada }) => {
  const { showToast } = useToast();
  
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAprobar = async () => {
    setIsSubmitting(true);
    try {
      // Estado 4 = Cerrada (Aprobada) -> Suposición del ID, ajustar según BD
      await api.patch(`/incidencias/${incidenciaId}/estado`, { id_estado: 4 });
      showToast('Solución aprobada. La incidencia ha sido cerrada.', 'success');
      if (onAprobacionCompletada) onAprobacionCompletada('Aprobada');
    } catch (error) {
      console.error('Error al aprobar', error);
      showToast('Error al aprobar la solución.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      showToast('El motivo de rechazo es obligatorio.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Estado 2 = En Progreso/Reabierta, enviando motivo como campo extra (ajustar backend si es necesario)
      await api.patch(`/incidencias/${incidenciaId}/estado`, { 
        id_estado: 2, 
        motivo_rechazo: motivoRechazo.trim() 
      });
      showToast('Solución rechazada. La incidencia volverá a revisión.', 'info');
      setMostrarRechazo(false);
      setMotivoRechazo('');
      if (onAprobacionCompletada) onAprobacionCompletada('Rechazada');
    } catch (error) {
      console.error('Error al rechazar', error);
      showToast('Error al enviar el rechazo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Validar Solución</h3>
      <p className="text-gray-600 text-sm mb-5">
        El equipo técnico ha marcado esta incidencia como resuelta. Por favor revisa la solución y confirma si tu problema ha sido solucionado.
      </p>

      {!mostrarRechazo ? (
        <div className="flex gap-4">
          <button
            onClick={handleAprobar}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiCheck className="w-5 h-5" />
            Aprobar Solución
          </button>
          <button
            onClick={() => setMostrarRechazo(true)}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
            Rechazar
          </button>
        </div>
      ) : (
        <div className="animate-fadeIn">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo del rechazo (obligatorio)
          </label>
          <textarea
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            disabled={isSubmitting}
            placeholder="Explica por qué la solución no resolvió tu problema..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-y"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setMostrarRechazo(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleRechazar}
              disabled={isSubmitting || !motivoRechazo.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <FiSend className="w-4 h-4" />
              Enviar Rechazo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AprobacionReportante;
