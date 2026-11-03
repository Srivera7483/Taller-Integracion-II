
## Tarea de Jira
---
**Objetivo:** Asegurar los datos de la plataforma ante un desastre inminente.

**Descripción:** Crear un script de shell (backup.sh) que ejecute el comando pg_dump dentro del contenedor de PostgreSQL. Este script debe exportar la estructura y los datos de incidencias_db y activos_db a un archivo .sql comprimido (gz), etiquetado con la fecha de hoy. Se debe configurar un Cron Job (nativo de Linux) en la máquina host que ejecute este script diariamente.

- **Criterios de Aceptación:**
    1. El script es capaz de realizar el volcado de datos sin afectar el rendimiento de la DB.
    2. Archivos resultantes se guardan en el directorio del host (fuera del contenedor).
    
- **Dependencias:** BD operativas en Docker Compose.

### Notas
---
- En el contexto del proyecto, el flujo ideal sería que el archivo *.sql* de respaldo se guarde temporalmente en el Docker, el script lo tome y lo suba al bucket de AWS S3, y después de borre del Docker.

## Commit
---
- Se programó el script Bash para hacer el respaldo de las BD de los Docker con el comando `pg_dump`.
	- Se configuró la compresión al vuelo usando pipes (`| gzip`) para no saturar el almacenamiento temporal del contenedor.

- Se pondrá el comando de agregación de permisos al archivo y se registrará en el administrador de Tareas una vezz **subamos el proyecto a Kubero**.

