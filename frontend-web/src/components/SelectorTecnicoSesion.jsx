import React, { useState, useEffect } from 'react';
import { FiUserCheck, FiChevronDown, FiShield } from 'react-icons/fi';
import { TECNICOS_EXISTENTES, getTecnicoActual, setTecnicoActual } from '../services/incidenciasStorage';

/**
 * Componente que muestra el perfil de técnico actual en sesión
 * y permite conmutar entre técnicos para verificar la regla de ownership:
 * "Si la tarea es de otro técnico, no puede entrar al formulario finalizativo".
 */
const SelectorTecnicoSesion = () => {
  const [tecnico, setTecnico] = useState(() => getTecnicoActual());
  const [desplegado, setDesplegado] = useState(false);

  useEffect(() => {
    const handleCambio = () => {
      setTecnico(getTecnicoActual());
    };
    window.addEventListener('tecnico-cambiado', handleCambio);
    return () => window.removeEventListener('tecnico-cambiado', handleCambio);
  }, []);

  const handleSeleccionarTecnico = (tec) => {
    setTecnicoActual(tec);
    setTecnico(tec);
    setDesplegado(false);
  };

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg p-1 pr-2 shadow-2xs">
        <div className="w-7 h-7 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
          {tecnico?.avatar || 'T'}
        </div>
        <div className="text-left leading-tight hidden sm:block">
          <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">
            Técnico Activo
          </span>
          <span className="text-xs font-semibold text-gray-900 block truncate max-w-[130px]">
            {tecnico?.nombre || 'Carlos Ruiz'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDesplegado(!desplegado)}
          className="text-indigo-600 hover:text-indigo-800 p-1 rounded transition-colors cursor-pointer"
          title="Cambiar perfil técnico para pruebas de permisos"
        >
          <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${desplegado ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {desplegado && (
        <div className="absolute right-0 mt-1 w-64 rounded-xl bg-white shadow-lg border border-gray-200 z-50 p-2 animate-fadeIn">
          <div className="px-2 py-1.5 border-b border-gray-100 mb-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <FiShield className="w-3.5 h-3.5 text-indigo-600" />
              Simular Perfil Técnico
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Prueba cómo cambia el acceso al formulario finalizativo según la asignación:
            </p>
          </div>
          <div className="space-y-1">
            {TECNICOS_EXISTENTES.map((tec) => (
              <button
                key={tec.id}
                type="button"
                onClick={() => handleSeleccionarTecnico(tec)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  tec.nombre === tecnico?.nombre
                    ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[10px]">
                    {tec.avatar}
                  </div>
                  <div>
                    <span className="block">{tec.nombre}</span>
                    <span className="text-[10px] text-gray-400">{tec.especialidad}</span>
                  </div>
                </div>
                {tec.nombre === tecnico?.nombre && (
                  <FiUserCheck className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectorTecnicoSesion;
