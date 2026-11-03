# TAL-126: Bloqueo dinámico de IP en API Gateway

## Resumen técnico

El Gateway Fastify aplica `@fastify/rate-limit` al `POST /api/v1/auth/login`, antes de reenviar la petición a MS Auth. Cada IP puede realizar hasta cinco solicitudes en una ventana de 15 minutos; las siguientes reciben HTTP `429 Too Many Requests`. Las demás rutas quedan fuera de esta política.

Archivos modificados:

- `api gateway/index.js`: registra el plugin con el límite específico de la ruta y configura las IP/CIDR de proxies confiables mediante `GATEWAY_TRUST_PROXY`.
- `api gateway/rate-limit-store.js`: almacenamiento en memoria con instantáneas por incremento, para conservar el orden del contador bajo solicitudes concurrentes.
- `api gateway/index.test.js`: prueba el límite secuencial y concurrente, la expiración de la ventana, el aislamiento por IP, proxies confiables y rutas no limitadas.
- `api gateway/package.json` y `api gateway/pnpm-lock.yaml`: agregan `@fastify/rate-limit`.
- `api gateway/README.md`: documenta la configuración de proxy confiable y cómo probar el límite.

## Decisiones de arquitectura

### Límite en memoria

Se eligió almacenamiento local en memoria, adecuado para el Gateway actual, que corre como una sola instancia y no requiere desplegar infraestructura adicional. El store conserva una instantánea por incremento para que solicitudes concurrentes de la misma IP no vean un contador compartido ya modificado mientras esperan al proxy.

La contrapartida es que los contadores viven en el proceso: un reinicio los borra y dos réplicas mantienen contadores independientes. Si el Gateway se escala horizontalmente, una IP podría consumir hasta cinco solicitudes en cada réplica. Para un despliegue con varias instancias se debe configurar un almacenamiento compartido, como Redis, de modo que todos los procesos apliquen el mismo límite.

### Límite por IP

El límite usa la IP en vez de combinar IP y nombre de usuario. Así también se limitan intentos de cuentas inexistentes y variaciones de nombres de usuario, y no se permite evadir el límite simplemente cambiando el campo de login.

Una IP compartida por NAT, una empresa o una red doméstica puede agrupar a varios usuarios legítimos en el mismo contador; con cinco intentos totales, esa red puede alcanzar el límite antes de que todos puedan iniciar sesión. Combinar IP y usuario reduciría ese impacto, pero permitiría distribuir intentos entre nombres de usuario y aumentaría el riesgo de bloquear a una cuenta objetivo. La política solicitada prioriza una regla sencilla por IP; los despliegues sensibles pueden añadir controles complementarios por cuenta, sin sustituir este límite.

### IP del cliente y proxies

Por defecto, Fastify usa la dirección de la conexión TCP y no confía en `X-Forwarded-For`. Si hay un proxy inverso delante del Gateway, `GATEWAY_TRUST_PROXY` debe listar sólo sus IP/CIDR confiables. Confiar indiscriminadamente en cabeceras reenviadas permitiría falsificar la IP y eludir el límite. La configuración y sus ejemplos están en el README del Gateway.

## Guía de pruebas

Con MS Auth y el Gateway activos, el siguiente bucle bash envía seis solicitudes consecutivas desde la misma IP:

```bash
for i in {1..6}; do
  status=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"pass123"}')
  printf 'Intento %s: HTTP %s\n' "$i" "$status"
done
```

Los primeros cinco códigos reflejan el resultado normal del login (`200` con credenciales válidas o `401` con credenciales incorrectas); el sexto debe mostrar `429`. Los intentos fallidos también cuentan. Para repetir la prueba durante la ventana, reinicia el Gateway, ya que el almacenamiento en memoria se reinicia junto con el proceso.
