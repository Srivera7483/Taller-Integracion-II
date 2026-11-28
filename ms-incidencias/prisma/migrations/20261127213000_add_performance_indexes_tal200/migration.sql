-- CreateIndex
CREATE INDEX "HISTORIAL_ESTADOS_id_incidencia_fecha_creacion_id_historial_idx" ON "HISTORIAL_ESTADOS"("id_incidencia", "fecha_creacion" DESC, "id_historial" DESC);

-- CreateIndex
CREATE INDEX "INCIDENCIAS_fecha_creacion_idx" ON "INCIDENCIAS"("fecha_creacion" DESC);

-- CreateIndex
CREATE INDEX "INCIDENCIAS_prioridad_fecha_creacion_idx" ON "INCIDENCIAS"("prioridad", "fecha_creacion" DESC);

-- CreateIndex
CREATE INDEX "INCIDENCIAS_id_activo_fecha_creacion_idx" ON "INCIDENCIAS"("id_activo", "fecha_creacion" DESC);

-- CreateIndex
CREATE INDEX "INCIDENCIAS_id_reportante_fecha_creacion_idx" ON "INCIDENCIAS"("id_reportante", "fecha_creacion" DESC);

-- CreateIndex
CREATE INDEX "ORDENES_TRABAJO_id_incidencia_fecha_creacion_id_orden_idx" ON "ORDENES_TRABAJO"("id_incidencia", "fecha_creacion" DESC, "id_orden" DESC);

-- CreateIndex
CREATE INDEX "ORDENES_TRABAJO_id_tecnico_fecha_cierre_fecha_creacion_idx" ON "ORDENES_TRABAJO"("id_tecnico", "fecha_cierre", "fecha_creacion" DESC);
