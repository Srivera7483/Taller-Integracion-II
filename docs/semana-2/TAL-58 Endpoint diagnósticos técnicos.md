
Haremos algo muy similar a la TAL-47, pero ahora con el MS de Incidencias, que modificará el atributo de descripción de 




**Commit TAL-58**

• Se actualizó el `schema.prisma` por **nuevo contrato OpenAPI v 1.1.0** y por necesidades de la tarea:
	• Se cambiaron los términos en inglés de los atributos de los models, y otros que no correspondían.
	• Se eliminó la columna `estado` de la tabla `Incidencia` y los enums aosciados.
	• Se eliminó la columna `estado` de la tabla `OrdenTrabajo` de acuerdo a lo acordado en el contrato, y los enums asociados.
	• Se incorporó la columna `diagnostico_tecnico` para realizar esta tarea.


- [ ] función de @db.Uuid