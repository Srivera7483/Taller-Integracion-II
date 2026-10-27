
## Tarea en Jira
---
**Objetivo:** Configurar volúmenes en Docker y scripts automáticos para crear las bases de datos vacías al levantar.

**Criterios de Aceptación:**
- Los datos sobreviven si el contenedor se apaga y vuelve a encender (configuración de volúmenes exitosa).
- Las tres bases de datos existen automáticamente dentro del motor PostgreSQL tras ejecutar el primer docker-compose up.

**Notas / Dependencias:** Requiere "Configuración de servicios de BD en Docker".


## Commit 5134837
---
• Se agregó la explicitación de volúmenes para asegurarse de que se use siempre el mismo directorio de datos y saber dónde están los datos, de lo contrario Docker asignaría volúmenes anónimos, los cuales además son vulnerables a comandos de limpieza como `docker volume prune`.