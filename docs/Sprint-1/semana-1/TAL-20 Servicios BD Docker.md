
## Commit ea69dc8
---

• Se configuró el archivo YAML inicial (docker-compose.yml) con lo servicios de las BDs listas para usarse.  
Las bases de datos se crearon con servicios/contenedores independientes, respetando así el desacoplamiento esperado en la arquitectura orientada a microservicios: cada servicio tiene su propio uso de recursos separados. Esto ayuda por ejemplo en que si una BD satura la memoria, no afecta el funcionamiento de las demás. Además, es apropiado para definir correctamente las credenciales para cada servicio.

• Se eligió como versión más reciente y conveniente de Postgres la versión 15, pero luego de una documentación se averigupó que el estándar dicta ya que es hora de pasar a la 16 (17, 18 no son tan estables y la 19 está en beta hasta esta fecha).

• Los puertos siguieron el estándar `5432` (localhost escucha Postgres en el puerto `5432` y los subsiguientes, mientras que los servicios Docker usan el `5432` para escuchar).