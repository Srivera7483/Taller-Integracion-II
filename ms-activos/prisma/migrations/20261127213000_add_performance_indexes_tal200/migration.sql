-- CreateIndex
CREATE INDEX "activos_estado_categoria_idx" ON "activos"("estado", "categoria");

-- CreateIndex
CREATE INDEX "activos_numero_serie_idx" ON "activos"("numero_serie");

-- CreateIndex
CREATE INDEX "mantenimientos_preventivos_id_activo_fecha_programada_idx" ON "mantenimientos_preventivos"("id_activo", "fecha_programada" DESC);
