import React, { useState } from 'react';
import { RiFileExcel2Line, RiFileExcel2Fill } from 'react-icons/ri';
import { FiDownload, FiCheck, FiChevronDown } from 'react-icons/fi';
import { exportarReporteIncidencias } from '../services/incidenciasService';
import { useToast } from '../context/ToastContext';

/**
 * TAL-132: Componente para exportar el reporte de incidencias a Excel (.xlsx) y CSV.
 * Cumple con los criterios de aceptación:
 * 1. Estado de carga ("Cargando...") y deshabilitado para evitar spam de clics.
 * 2. Descarga forzada en navegador vía window.URL.createObjectURL y elemento <a>.
 * 3. Nombre dinámico con extensión .xlsx (o .csv según selección).
 * 
 * @param {Object} props
 * @param {'button'|'floating'|'compact'} [props.variant='button'] - Variante visual
 * @param {Object} [props.filtros] - Filtros opcionales a aplicar (id_activo, id_estado, fecha_inicio, fecha_fin)
 * @param {string} [props.className] - Clases CSS adicionales
 */
const BotonExportarExcel = ({
  variant = 'button',
  filtros = {},
  className = '',
}) => {
  const { showToast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [descargaExitosa, setDescargaExitosa] = useState(false);

  const ejecutarDescarga = async (formato = 'xlsx') => {
    if (cargando) return;

    setCargando(true);
    setMenuAbierto(false);

    try {
      const resultado = await exportarReporteIncidencias({
        formato,
        ...filtros,
      });

      setDescargaExitosa(true);
      showToast(
        `Reporte exportado con éxito (${formato.toUpperCase()}): ${resultado.filename}`,
        'success'
      );

      setTimeout(() => {
        setDescargaExitosa(false);
      }, 3000);
    } catch (error) {
      console.error('Error al exportar incidencias:', error);
      showToast(
        'No se pudo generar el reporte. Verifica la conexión con el servidor.',
        'error'
      );
    } finally {
      setCargando(false);
    }
  };

  // VARIANTE FLOTANTE (FAB - Floating Action Button)
  if (variant === 'floating') {
    return (
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 ${className}`}>
        {/* Menú desplegable flotante de formato */}
        {menuAbierto && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 min-w-[200px] mb-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Formato de descarga
            </div>
            <button
              type="button"
              onClick={() => ejecutarDescarga('xlsx')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <RiFileExcel2Line className="w-4 h-4 text-emerald-600" />
                Microsoft Excel (.xlsx)
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Recomendado
              </span>
            </button>
            <button
              type="button"
              onClick={() => ejecutarDescarga('csv')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <FiDownload className="w-3.5 h-3.5 text-gray-500" />
              Texto CSV (.csv UTF-8)
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-emerald-600/30 hover:bg-emerald-700 transition-all duration-200">
          <button
            type="button"
            id="btn-exportar-excel-floating"
            onClick={() => ejecutarDescarga('xlsx')}
            disabled={cargando}
            title="Exportar catálogo de incidencias a Excel (.xlsx)"
            className="flex items-center gap-2.5 px-5 py-3.5 font-semibold text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Cargando...</span>
              </>
            ) : descargaExitosa ? (
              <>
                <FiCheck className="w-4 h-4 text-white" />
                <span>¡Descargado!</span>
              </>
            ) : (
              <>
                <RiFileExcel2Fill className="w-5 h-5 text-emerald-200" />
                <span>Exportar a Excel</span>
              </>
            )}
          </button>

          {/* Botón selector de formatos */}
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            disabled={cargando}
            title="Opciones de formato"
            className="px-2.5 py-3.5 border-l border-emerald-500/60 hover:bg-emerald-800/40 rounded-r-full transition-colors cursor-pointer"
          >
            <FiChevronDown className={`w-4 h-4 transition-transform ${menuAbierto ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // VARIANTE COMPACTA (para tablas o barras pequeñas)
  if (variant === 'compact') {
    return (
      <button
        type="button"
        id="btn-exportar-excel-compact"
        onClick={() => ejecutarDescarga('xlsx')}
        disabled={cargando}
        title="Exportar a Excel (.xlsx)"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${className}`}
      >
        {cargando ? (
          <>
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent" />
            <span>Cargando...</span>
          </>
        ) : (
          <>
            <RiFileExcel2Line className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </>
        )}
      </button>
    );
  }

  // VARIANTE ESTÁNDAR PARA TOOLBAR / CABECERAS
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 transition-all">
        <button
          type="button"
          id="btn-exportar-excel"
          onClick={() => ejecutarDescarga('xlsx')}
          disabled={cargando}
          title="Descargar reporte histórico en formato Excel (.xlsx)"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-white font-medium text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {cargando ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Cargando...</span>
            </>
          ) : descargaExitosa ? (
            <>
              <FiCheck className="w-4 h-4 text-emerald-200" />
              <span>¡Reporte Generado!</span>
            </>
          ) : (
            <>
              <RiFileExcel2Line className="w-4 h-4 text-emerald-100" />
              <span>Exportar a Excel</span>
            </>
          )}
        </button>

        <button
          type="button"
          id="btn-opciones-exportar"
          onClick={() => setMenuAbierto(!menuAbierto)}
          disabled={cargando}
          title="Seleccionar formato de exportación"
          className="px-2 border-l border-emerald-500 text-white hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px]"
        >
          <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${menuAbierto ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Menú de Formatos */}
      {menuAbierto && (
        <div
          className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseLeave={() => setMenuAbierto(false)}
        >
          <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Formatos Disponibles
          </div>
          <button
            type="button"
            onClick={() => ejecutarDescarga('xlsx')}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-800 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <RiFileExcel2Line className="w-4 h-4 text-emerald-600" />
              Microsoft Excel (.xlsx)
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
              Estándar
            </span>
          </button>
          <button
            type="button"
            onClick={() => ejecutarDescarga('csv')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <FiDownload className="w-3.5 h-3.5 text-gray-500" />
            Separado por comas (.csv)
          </button>
        </div>
      )}
    </div>
  );
};

export default BotonExportarExcel;
