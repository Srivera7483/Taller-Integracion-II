# TAL-16 - Inicializacion y variables de entorno del API Gateway

## 1. Identificacion de la tarea

- **ID:** TAL-16
- **Nombre:** Inicializacion y variables de entorno del API Gateway
- **Objetivo:** Crear el proyecto base del Gateway y estructurar los archivos de configuracion de entorno.

## Como hacerlo funcionar

Desde PowerShell, ejecutar:

```powershell
Set-Location "api gateway"
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

El Gateway queda disponible en `http://localhost:3000`. La comprobacion basica es:

```powershell
curl.exe -i http://localhost:3000/
```

La respuesta esperada es `HTTP/1.1 200 OK`.

## 2. Criterios de aceptacion y verificacion

### Criterio 1

**Requisito:** El repositorio esta inicializado con su respectivo `.gitignore`.

**Estado:**

- **Cumplido**

**Evidencia:**

- `.gitignore`

**Descripcion:**

Existe `.gitignore` en la raiz del repositorio con exclusiones para dependencias, archivos de entorno y artefactos generados.

### Criterio 2

**Requisito:** Existe un archivo `.env.example` documentando los puertos base necesarios.

**Estado:**

- **Cumplido**

**Evidencia:**

- `api gateway/.env.example`

**Descripcion:**

El archivo define `GATEWAY_PORT`, `MS_ACTIVOS_URL` y `MS_INCIDENCIAS_URL`, incluyendo los destinos locales necesarios para el Gateway.

### Criterio 3

**Requisito:** El servidor base levanta exitosamente en modo desarrollo y responde con un `200 OK` en la ruta raiz (`/`).

**Estado:**

- **Cumplido**

**Evidencia:**

- `api gateway/package.json`, script `dev`.
- `api gateway/index.js`, ruta `GET /`.
- `api gateway/index.test.js`, prueba `GET / responde 200 OK`.
- Resultado ejecutado: `1` prueba aprobada para la ruta raiz.

**Descripcion:**

El script `dev` ejecuta `node index.js`. La prueba funcional mediante `fastify.inject` verifico que `GET /` responde `200` con `{ "status": "OK" }`.

## 3. Archivos relacionados

- **Ruta:** `.gitignore`  
  **Relacion con el criterio:** Inicializacion y exclusiones del repositorio.

- **Ruta:** `api gateway/.env.example`  
  **Relacion con el criterio:** Variables de entorno y destinos locales del Gateway.

- **Ruta:** `api gateway/package.json`  
  **Relacion con el criterio:** Configura la ejecucion en modo desarrollo mediante `npm run dev`.

- **Ruta:** `api gateway/index.js`  
  **Relacion con el criterio:** Inicializa Fastify y registra `GET /`.

- **Ruta:** `api gateway/index.test.js`  
  **Relacion con el criterio:** Verifica la respuesta HTTP `200` de la ruta raiz.

## 4. Resumen de verificacion

| Criterio | Estado |
| --- | --- |
| Criterio 1 | Cumplido |
| Criterio 2 | Cumplido |
| Criterio 3 | Cumplido |
