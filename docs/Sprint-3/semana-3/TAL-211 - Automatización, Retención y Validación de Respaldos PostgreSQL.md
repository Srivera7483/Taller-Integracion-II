## Objetivo en Jira

---

**Objetivo:** Completar el sistema de respaldos implementado en TAL-141, incorporando retención automática, manejo de errores y validación de restauración para las bases de datos `auth_db`, `activos_db` e `incidencias_db`.

**Descripción:** Mejorar el script de respaldo existente, manteniendo la compresión y el cifrado de `auth_db`. Incorporar eliminación automática de respaldos superiores a 30 días, registros de ejecución y pruebas de restauración en bases de datos temporales. Preparar su ejecución diaria a las 02:00 y almacenamiento persistente para el despliegue en Kubero.

**Criterios de Aceptación:**

1. Los respaldos registran correctamente su resultado y los errores de ejecución.
    
2. Los archivos se conservan durante un máximo de 30 días.
    
3. Se verifica la restauración exitosa de las tres bases de datos sin afectar las originales.
    
4. Se documenta la configuración necesaria para automatizar los respaldos en producción.
    

**Dependencias:** TAL-141, bases de datos PostgreSQL operativas en Docker Compose y Kubero para la programación definitiva.

## Notas
---
### Contexto de TAL-141 y TAL-211

La TAL-141 ya había implementado `backup.sh`, que utilizaba `pg_dump` para generar respaldos comprimidos de las tres bases de datos, incluyendo cifrado adicional para `auth_db`.

Sin embargo, faltaban mecanismos de retención, validación de errores y pruebas de restauración. La TAL-211 complementa esta implementación para garantizar que los respaldos puedan recuperarse correctamente ante una eventual pérdida de datos.

### Mejoras incorporadas

- Se automatizó la eliminación de respaldos con más de 30 días.
- Se incorporó manejo de errores y registro de resultados.
- Se implementó la generación segura de archivos temporales para evitar respaldos incompletos.
- Se mantuvo el cifrado de `auth_db` mediante `ENCRYPT_PASS`.
- Se incorporó un procedimiento de restauración utilizando bases de datos temporales.

### Pruebas realizadas
---
**1. Generación de respaldos**

Se ejecutó `./scripts/backup-db.sh` desde Git Bash, con los contenedores PostgreSQL operativos.

Se generaron correctamente:
- `activos_db_2026-11-22_12-44-04.sql.gz` — 4 KB.
- `incidencias_db_2026-11-22_12-44-04.sql.gz` — 8 KB.
- `auth_db_2026-11-22_12-44-04.sql.gz.enc` — 4 KB.
    

El script finalizó sin errores y ejecutó la política de retención de 30 días.

**2. Restauración de respaldos**

Se ejecutó `./scripts/test-restore-db.sh` a las 12:45.

**Resultados:**

- `activos_db`: restauración exitosa.
- `incidencias_db`: restauración exitosa.
- `auth_db`: descifrado y restauración exitosos.
    
Las restauraciones se realizaron en bases de datos temporales, sin modificar las bases originales.

### Configuración pendiente en producción
---
La ejecución diaria a las **02:00** y el almacenamiento persistente aislado se configurarán durante el despliegue en Kubero. Será necesario verificar allí la ejecución programada y la conservación de los respaldos.

## Commit

---
- **scripts/backup-db.sh:** incorpora validación de errores, archivos temporales, logs y retención automática de 30 días.
- **scripts/test-restore-db.sh:** nuevo script para probar la restauración de las tres bases de datos en bases temporales.
- **.env:** configura localmente `ENCRYPT_PASS` para cifrar y descifrar respaldos, sin exponer la contraseña en GitHub.