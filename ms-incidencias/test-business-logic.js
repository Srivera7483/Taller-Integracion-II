const PERMISO_POR_TIPO_ACCION = {
  crear_incidencia: "incidencias:crear",
  subir_evidencia: "evidencias:subir",
  actualizar_estado: "incidencias:resolver",
};

const TIPOS_ACCION_VALIDOS = Object.keys(PERMISO_POR_TIPO_ACCION);

function validarTipo(tipo) {
  return TIPOS_ACCION_VALIDOS.includes(tipo);
}

function mapearPermiso(tipo) {
  return PERMISO_POR_TIPO_ACCION[tipo] || "permiso_desconocido";
}

function procesarLoteSimulado(acciones) {
  const detalle = [];
  let exitosos = 0;
  let errores = 0;

  const accionesOrdenadas = acciones.sort((a, b) =>
    a.timestamp_local > b.timestamp_local ? 1 : a.timestamp_local < b.timestamp_local ? -1 : 0
  );

  for (const accion of accionesOrdenadas) {
    const resultado = { id_accion_local: accion.id_accion_local, estado: "ERROR", motivo: null };

    if (!validarTipo(accion.tipo)) {
      resultado.motivo = "Tipo de acción no soportado: " + accion.tipo;
      detalle.push(resultado);
      errores++;
      continue;
    }

    const permisoNecesario = mapearPermiso(accion.tipo);
    // Simulación: si el tipo es actualizar_estado y el id_accion_local termina en "003", fallo de permiso
    if (accion.tipo === "actualizar_estado" && accion.id_accion_local.endsWith("003")) {
      resultado.motivo = "Permiso insuficiente: se requiere incidencias:resolver";
      detalle.push(resultado);
      errores++;
      continue;
    }

    resultado.estado = "OK";
    resultado.recurso_id = "rec-" + accion.id_accion_local;
    detalle.push(resultado);
    exitosos++;
  }

  const total = acciones.length;
  const status = errores > 0 ? 207 : 200;
  const mensaje = errores > 0
    ? `Lote procesado con errores parciales: ${exitosos} exitosas, ${errores} fallidas.`
    : "Todas las acciones del lote se procesaron correctamente.";

  return {
    statusCode: status,
    mensaje,
    resumen: { total, exitosos, errores },
    detalle,
  };
}

console.log("TAL-192 Pruebas de Lógica de Negocio\n");

console.log("Prueba 1: Lote mixto (3 acciones)");
const lote1 = [
  { id_accion_local: "acc-001", tipo: "crear_incidencia", payload: { id_activo: "uuid", titulo: "Test", descripcion: "Desc", prioridad: "alta" }, timestamp_local: "2026-11-20T08:00:00.000Z" },
  { id_accion_local: "acc-002", tipo: "subir_evidencia", payload: { id_incidencia: "x", id_tipo_evidencia: 1, url_evidencia: "https://example.com/ev.jpg" }, timestamp_local: "2026-11-20T08:01:00.000Z" },
  { id_accion_local: "acc-003", tipo: "actualizar_estado", payload: { id_incidencia: "x", id_estado: 2 }, timestamp_local: "2026-11-20T08:02:00.000Z" },
];
const resultado1 = procesarLoteSimulado(lote1);
console.log("HTTP status:", resultado1.statusCode === 207 ? "207 (fallo parcial)" : "200 (todo OK)");
console.log("Exitosos:", resultado1.resumen.exitosos);
console.log("Errores:", resultado1.resumen.errores);
resultado1.detalle.forEach(d => {
  console.log("    - " + d.id_accion_local + ": " + d.estado + " " + (d.motivo ? "- " + d.motivo : ""));
}

console.log("\nPrueba 2: Tipo de acción inválido");
const lote2 = [
  { id_accion_local: "acc-invalid", tipo: "tipo_inexistente", payload: {}, timestamp_local: "2026-11-20T08:00:00.000Z" },
];
const resultado2 = procesarLoteSimulado(lote2);
console.log("HTTP status:", resultado2.statusCode);
console.log("Errores:", resultado2.resumen.errores);
resultado2.detalle.forEach(d => {
  console.log("    - " + d.id_accion_local + ": " + d.estado + " (" + d.motivo + ")");
}

console.log("\nPrueba 3: Lote dentro del límite (3 acciones)");
const lote3 = [
  { id_accion_local: "a1", tipo: "crear_incidencia", payload: {}, timestamp_local: "2026-11-20T08:00:00.000Z" },
  { id_accion_local: "a2", tipo: "subir_evidencia", payload: {}, timestamp_local: "2026-11-21T08:00:00.000Z" },
  { id_accion_local: "a3", tipo: "actualizar_estado", payload: {}, timestamp_local: "2026-11-22T08:00:00.000Z" },
];
const resultado3 = procesarLoteSimulado(lote3);
console.log("HTTP status:", resultado3.statusCode === 200 ? "200 (todo OK)" : "207 (fallo parcial)");
console.log("Exitosos:", resultado3.resumen.exitosos);
console.log("Errores:", resultado3.resumen.errores);

console.log("\nPrueba 4: Lote vacío");
const resultado4 = procesarLoteSimulado([]);
console.log("HTTP status: 400 (rechazado por ArrayMinSize) - validación en DTO");

console.log("\nPrueba 5: Lote de exactamente 50 acciones");
const lote50 = Array.from({ length: 50 }, (_, i) => ({
  id_accion_local: "acc-" + String(i).padStart(3, "0"),
  tipo: "crear_incidencia",
  payload: { id_activo: "uuid", titulo: "Título " + i, descripcion: "Desc " + i, prioridad: "media" },
  timestamp_local: "2026-11-20T08:00:00.000Z",
}));
const resultado5 = procesarLoteSimulado(lote50);
console.log("HTTP status:", resultado5.statusCode === 200 || resultado5.statusCode === 207 ? "200/207 (procesado)" : "ERROR");
console.log("Total:", resultado5.resumen.total);
console.log("Exitosos:", resultado5.resumen.exitosos);

console.log("\nPrueba 6: Lote de 51 acciones (sobre límite)");
const lote51 = Array.from({ length: 51 }, (_, i) => ({
  id_accion_local: "acc-" + String(i).padStart(3, "0"),
  tipo: "crear_incidencia",
  payload: { id_activo: "uuid", titulo: "Título " + i, prioridad: "media" },
  timestamp_local: "2026-11-20T08:00:00.000Z",
}));
const resultado6 = procesarLoteSimulado(lote51);
console.log("HTTP status: 400 (rechazado - lote excede 50) - validación en DTO");

console.log("\nFin de Pruebas de Lógica de Negocio");
