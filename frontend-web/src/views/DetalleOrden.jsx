import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiChevronRight, FiBox, FiClock, FiUser, FiInfo } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import DiagnosticoTecnico from '../components/DiagnosticoTecnico';
import api from '../services/api';

const DetalleOrden = () => {
  const { idOrden } = useParams();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrden = async () => {
      try {
        setLoading(true);
        // Intentar obtener la orden desde el API real (según openapi.yaml)
        const response = await api.get(`/ordenes-trabajo/${idOrden}`);
        setOrden(response.data);
      } catch (err) {
        console.warn('No se pudo obtener la orden desde el API real, usando mock temporal.', err);
        // Si el backend aún no implementa este endpoint, usamos un mock temporal para poder visualizar la interfaz
        setOrden({
          id_orden: idOrden,
          incidencia_id: 'INC-1042',
          incidencia_titulo: 'Fallo en sistema de correos',
          estado: 'Emitida',
          tecnico_id: 'TEC-001',
          tecnico_nombre: 'Carlos Ruiz',
          fecha_emision: new Date().toISOString(),
          instrucciones: 'Revisar la configuración del servidor de correos y los puertos SMTP/IMAP.',
          diagnostico_tecnico: null
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrden();
  }, [idOrden]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando detalles de la orden...</div>;
  }

  if (error || !orden) {
    return <div className="p-8 text-center text-red-500">Error al cargar la orden.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navegación tipo Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">Órdenes</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Detalle de Orden {orden.id_orden}</span>
      </nav>

      {/* Encabezado de la Orden */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orden de Trabajo</h1>
              <span className="font-mono text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">{orden.id_orden}</span>
            </div>
            <p className="text-gray-600 font-medium">{orden.incidencia_titulo}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <StatusBadge status={orden.estado} />
            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <FiClock className="w-3.5 h-3.5" /> Emisión: {new Date(orden.fecha_emision).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Detalles e Instrucciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Técnico Asignado</h4>
              <div className="flex items-center gap-2 text-gray-800 font-medium">
                <FiUser className="w-4 h-4 text-blue-500" />
                {orden.tecnico_nombre}
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Incidencia Asociada</h4>
              <div className="flex items-center gap-2 text-gray-800 font-medium">
                <FiBox className="w-4 h-4 text-orange-500" />
                {orden.incidencia_id}
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="text-xs uppercase tracking-wider text-blue-800 font-bold mb-2 flex items-center gap-1">
              <FiInfo className="w-3.5 h-3.5" /> Instrucciones del Supervisor
            </h4>
            <p className="text-sm text-blue-900">
              {orden.instrucciones || 'Sin instrucciones adicionales.'}
            </p>
          </div>
        </div>
      </div>

      {/* Componente que pide la HU: Componente de texto enriquecido para el diagnóstico */}
      <DiagnosticoTecnico idOrden={orden.id_orden} />
    </div>
  );
};

export default DetalleOrden;
