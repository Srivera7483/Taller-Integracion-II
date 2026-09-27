import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiChevronRight, FiBox, FiClock, FiAlertTriangle } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import AprobacionReportante from '../components/AprobacionReportante';

const DetalleIncidencia = () => {
  const { idIncidencia } = useParams();
  const [incidencia, setIncidencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIncidencia = async () => {
      try {
        setLoading(true);
        // GET /incidencias/{id_incidencia}
        const response = await api.get(`/incidencias/${idIncidencia}`);
        setIncidencia(response.data);
      } catch (err) {
        console.warn('Usando mock temporal porque la API falló.', err);
        setIncidencia({
          id: idIncidencia,
          titulo: 'Problemas de conectividad en el piso 3',
          descripcion: 'Los routers no están asignando IPs correctamente.',
          id_activo: 'ROUTER-03',
          prioridad: 'Alta',
          estado: 'Resuelta', // Simulamos que está resuelta para probar la HU
          fecha_creacion: new Date().toISOString(),
          asignado: 'Equipo de Redes'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchIncidencia();
  }, [idIncidencia]);

  // Handler local para reflejar el cambio en UI si se aprueba/rechaza sin recargar la pág
  const handleAprobacionCompletada = (nuevoEstado) => {
    setIncidencia(prev => ({
      ...prev,
      estado: nuevoEstado === 'Aprobada' ? 'Cerrada' : 'En Progreso'
    }));
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando detalles de la incidencia...</div>;
  }

  if (error || !incidencia) {
    return <div className="p-8 text-center text-red-500">Error al cargar la incidencia.</div>;
  }

  const isResuelta = incidencia.estado?.toLowerCase() === 'resuelta';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Inicio</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">Incidencias</Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Incidencia {incidencia.id}</span>
      </nav>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{incidencia.titulo}</h1>
            </div>
            <span className="font-mono text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
              {incidencia.id}
            </span>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <StatusBadge status={incidencia.estado} />
            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <FiClock className="w-3.5 h-3.5" /> Creada: {new Date(incidencia.fecha_creacion).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Activo Afectado</h4>
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <FiBox className="w-4 h-4 text-orange-500" />
              {incidencia.id_activo || 'N/A'}
            </div>
          </div>
          
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Descripción del problema</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
              {incidencia.descripcion}
            </p>
          </div>
        </div>
      </div>

      {/* Renderizado condicional según el estado de la incidencia */}
      {isResuelta && (
        <AprobacionReportante 
          incidenciaId={incidencia.id} 
          onAprobacionCompletada={handleAprobacionCompletada} 
        />
      )}
    </div>
  );
};

export default DetalleIncidencia;
