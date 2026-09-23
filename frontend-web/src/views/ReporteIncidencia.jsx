import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiChevronRight, 
  FiHelpCircle, 
  FiShield, 
  FiAlertTriangle, 
  FiPhoneCall 
} from 'react-icons/fi';
import FormularioReporteIncidencia from '../components/FormularioReporteIncidencia';

const ReporteIncidencia = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">
          Inicio
        </Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <Link to="/incidencias" className="hover:text-blue-600 transition-colors">
          Incidencias
        </Link>
        <FiChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">Nueva Incidencia</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Reportar Nueva Incidencia
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Completa el formulario a continuación para notificar al equipo de infraestructura sobre una falla o anomalía operativa.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100 self-start md:self-auto">
          <FiShield className="w-4 h-4" /> Mesa de Ayuda Activa (24/7)
        </div>
      </div>

      {/* Main Grid: Formulario + Panel Lateral Informativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Principal: Formulario */}
        <div className="lg:col-span-2">
          <FormularioReporteIncidencia />
        </div>

        {/* Columna Lateral: Tarjetas de Asistencia y Protocolos */}
        <div className="space-y-6">
          {/* Tarjeta: Recomendaciones para el reporte */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <FiHelpCircle className="text-blue-600 w-4 h-4" />
              Buenas Prácticas para el Reporte
            </h3>
            <ul className="text-xs text-gray-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span>
                  <strong>Identifica con precisión el activo:</strong> Puedes usar el número de serie (SN) o etiqueta de activo fijada en el chasis.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span>
                  <strong>Describe síntomas, no solo conclusiones:</strong> Por ejemplo, menciona luces LED parpadeando, códigos HTTP 500 o caídas súbitas.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span>
                  <strong>Adjunta capturas de pantalla o logs:</strong> Acelera en más de un 60% la resolución en el primer contacto.
                </span>
              </li>
            </ul>
          </div>

          {/* Tarjeta: Criterios de Severidad */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <FiAlertTriangle className="text-amber-500 w-4 h-4" />
              Niveles de Prioridad
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-red-50 text-red-800 border border-red-100">
                <span className="font-bold">Crítica:</span> Interrupción total de servicios centrales o afectación de clientes externos.
              </div>
              <div className="p-2.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-100">
                <span className="font-bold">Alta:</span> Falla importante que degrada el rendimiento de infraestructura clave sin respaldo inmediato.
              </div>
              <div className="p-2.5 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-100">
                <span className="font-bold">Media / Baja:</span> Incidencias menores, problemas en terminales individuales o solicitudes no urgentes.
              </div>
            </div>
          </div>

          {/* Tarjeta: Contacto de Emergencia */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <FiPhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">¿Incidente Catastrófico?</h4>
                <p className="text-xs text-slate-400">Canal directo con el NOC</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Si la falla paraliza completamente el centro de datos o la operación productiva, notifica de inmediato a la extensión de guardia:
            </p>
            <div className="bg-slate-800/80 rounded-lg py-2 px-3 text-center font-mono text-sm font-bold text-blue-400 border border-slate-700">
              Ext. 9911 / noc@infra.local
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteIncidencia;
