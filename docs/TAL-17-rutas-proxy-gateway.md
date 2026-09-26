# TAL-17 - Configuracion de rutas proxy basicas

## 1. Identificacion de la tarea

- **ID:** TAL-17
- **Nombre:** Configuracion de rutas proxy basicas
- **Objetivo:** Programar el enrutamiento que redirija el trafico entrante hacia los puertos de MS Activos e Incidencias.

## Como hacerlo funcionar

1. Configurar `api gateway/.env` a partir de `api gateway/.env.example`.
2. Confirmar que `MS_ACTIVOS_URL` y `MS_INCIDENCIAS_URL` apunten a los microservicios activos.
3. Desde `api gateway/`, ejecutar `npm.cmd install` y `npm.cmd run dev`.
4. Probar las rutas:

```powershell
curl.exe -i http://localhost:3000/api/activos
curl.exe -i http://localhost:3000/api/incidencias
```

Si un destino esta apagado, la respuesta esperada es `502 Bad Gateway` y el Gateway puede comprobarse nuevamente con `curl.exe -i http://localhost:3000/`.

## 2. Criterios de aceptacion y verificacion

### Criterio 1

**Requisito:** Cualquier peticion HTTP a `/api/activos` es redirigida al puerto local del MS Activos.

**Estado:**

- **Cumplido**

**Evidencia:**

- `api gateway/index.js`, registro del proxy con `prefix: '/api/activos'`.
- `api gateway/.env.example`, variable `MS_ACTIVOS_URL`.
- `api gateway/index.test.js`, prueba `redirige activos e incidencias a sus microservicios`.
- Resultado ejecutado: respuesta `200` del destino simulado de Activos.

**Descripcion:**

El Gateway reenvia las solicitudes del prefijo `/api/activos` al valor de `MS_ACTIVOS_URL`. La prueba funcional confirmo el reenvio a un servidor HTTP local simulado.

### Criterio 2

**Requisito:** Cualquier peticion HTTP a `/api/incidencias` es redirigida al puerto del MS Incidencias.

**Estado:**

- **Cumplido**

**Evidencia:**

- `api gateway/index.js`, registro del proxy con `prefix: '/api/incidencias'`.
- `api gateway/.env.example`, variable `MS_INCIDENCIAS_URL`.
- `api gateway/index.test.js`, prueba `redirige activos e incidencias a sus microservicios`.
- Resultado ejecutado: respuesta `200` del destino simulado de Incidencias.

**Descripcion:**

El Gateway reenvia las solicitudes del prefijo `/api/incidencias` al valor de `MS_INCIDENCIAS_URL`. La prueba funcional confirmo el reenvio a un servidor HTTP local simulado.

### Criterio 3

**Requisito:** Si el microservicio de destino esta apagado, el Gateway devuelve un error manejado, por ejemplo `502 Bad Gateway`, sin que se caiga el servidor.

**Estado:**

- **Cumplido**

**Evidencia:**

- `api gateway/index.js`, funcion `handleProxyError`.
- `api gateway/index.test.js`, prueba `los proxies devuelven 502 y el Gateway sigue disponible`.
- Resultado ejecutado: ambos proxies respondieron `502` y una solicitud posterior a `/` respondio `200`.

**Descripcion:**

Los errores de conexion se transforman en una respuesta `502` con un cuerpo JSON controlado. La prueba confirmo que el Gateway sigue atendiendo solicitudes despues del error.

## 3. Archivos relacionados

- **Ruta:** `api gateway/index.js`  
  **Relacion con el criterio:** Configura ambos proxies y el manejo de errores de conexion.

- **Ruta:** `api gateway/.env.example`  
  **Relacion con el criterio:** Define `MS_ACTIVOS_URL` y `MS_INCIDENCIAS_URL`.

- **Ruta:** `api gateway/index.test.js`  
  **Relacion con el criterio:** Verifica reenvio exitoso, respuesta `502` y continuidad del Gateway.

## 4. Resumen de verificacion

| Criterio | Estado |
| --- | --- |
| Criterio 1 | Cumplido |
| Criterio 2 | Cumplido |
| Criterio 3 | Cumplido |
