  
**SISTEMATIZACIÓN DE PROYECTO**   
**Taller de integración IV**

**PRIMERA PARTE**

* **Nombre del proyecto**

| Gestión de Activos UCT |
| :---: |

* **Integrantes Equipo de Trabajo:**

| *Nombre completo* | *Facultad/Unidad* | *Correo electrónico* |
| ----- | ----- | ----- |
| Diego Antonio Hernández Martínez | Facultad de Ingeniería \- Ing. Civil en Informática | diego.hernandez2022@alu.uct.cl |
| Axel Ignacio González Sánchez | Facultad de Ingeniería \- Ing. Civil en Informática | axel.gonzalez2025@alu.uct.cl |
| Simón Ismael Molina Moncada  | Facultad de Ingeniería \- Ing. Civil en Informática | smolina2025@alu.uct.cl |
| Eduardo Amaru Necul Flores | Facultad de Ingeniería \- Ing. Civil en Informática | enecul2025@alu.uct.cl |
| Sebastián Rodrigo Rivera Nahuelhuen | Facultad de Ingeniería \- Ing. Civil en Informática | srivera2025@alu.uct.cl |
| Benjamín Sebastián Soto Pardo | Facultad de Ingeniería \- Ing. Civil en Informática | bsoto2025@alu.uct.cl |

**SEGUNDA PARTE: PRESENTACIÓN DEL PROYECTO**

**BREVE DESCRIPCIÓN**

El proyecto *Gestión de Activos UCT* tiene como objetivo el desarrollo de una plataforma tecnológica que permita monitorear y gestionar el estado de diversos elementos tecnológicos que componen la infraestructura de la universidad. El alcance de dichos componentes son todos aquellos aparatos o dispositivos cuya función proporciona un servicio clave para el desarrollo de clases, uso de espacios, u otras actividades que involucran la interacción con la infraestructura de la universidad (computadores, proyectores, impresoras, dispositivos intermedios de red, dispositivos IoT, etc.).

El modo actual en que se gestiona el mantenimiento y fallas de dispositivos en la universidad carece de un sistema digital que evite la evanescencia de la información que se transmite entre los administrativos de la universidad y que permita una visualización clara, práctica, analítica y global de esta información a lo largo de la infraestructura de la universidad. Si bien, se ha tomado conocimiento de que algunos departamentos hacen uso de formularios internamente como parte de sus protocolos, estos mecanismos no abarcan lo mencionado anteriormente.

El desarrollo de esta plataforma tiene el fin de entregar una solución a la problemática de la falta de un sistema centralizado en la manera en que actualmente se gestionan fallas en la infraestructura de la universidad: la comunicación puramente verbal no deja registro observable para el resto de miembros de la universidad sobre estos problemas, lo que no permite llegar a tener una base de información clara para ver en todo momento y con acceso universal qué problemas hay y su urgencia, hacer seguimiento a diversos aspectos de la infraestructura y tomar decisiones de gestión de alto nivel.

El objetivo de este proyecto, como toda aplicación de software, es favorecer tareas del usuario y satisfacer la mayor cantidad de exigencias posible que este pueda requerir. En ese sentido, por lo tanto, nuestros objetivos son los siguientes: asegurar una aplicación que sea conveniente y práctica para el usuario, para lo cual se basa en el uso de teléfonos y códigos QR para acceder rápida e inteligentemente a la información de un activo cercano al usuario; permitir que dicha aplicación tenga un modo de visualización bien diseñado tanto en móvil como en plataforma de escritorio para favorecer la comodidad del usuario, y que, por tanto, se pueda acceder a la misma información y formato de despliegue en ambas versiones, asegurándonos de cumplir con los componentes de backend necesarios para ello; cumplir con el resguardo de la seguridad de la información para que el sistema sea confiable y ético.

Para embarcarnos en esta tarea, los integrantes de este grupo, el equipo 7 del taller de Integración II, *Asesinos de Tokens*, trabajará de forma conjunta y recibiendo orientaciones del grupo asignado del taller de Integración IV, el cual estará a cargo del desarrollo móvil del proyecto.

Para el desarrollo correcto de esta aplicación, es importante también establecernos el objetivo de asegurar una arquitectura de software escalable tanto a nivel de código como de componentes, considerando y aplicando buenas prácticas de diseño de software y de sistemas que hemos aprendido en cursos anteriores de la carrera.

**ANÁLISIS DE LA SITUACIÓN SIN PROYECTO.**

En la actualidad, la situación del contexto de nuestra problemática se trabaja de manera descentralizada y los equipos encargados de gestionar un componente activo dependen del tipo del que sean estos mismos. Por ejemplo, para la mantención, arreglo y/o reemplazo de computadores de las salas de clases y de computadores portátiles para los estudiantes, existe un área de administración para dichos propósitos para la universidad, pero para el caso de otros dispositivos está el área de soporte, además de que algunos componentes, como los proyectores, tienen una gestión externa, según lo informado.

Esto impide la condensación centralizada de la información de los distintos componentes activos en la universidad en forma global, y, al mismo tiempo, representa una discordancia con el sistema de gestión que planteamos, a nivel lógico y jerárquico.

El hecho de que no haya una centralización de esta información evita que haya una fuente que proporcione datos para que  un usuario cualquiera (miembro de la universidad) observe y pueda sugerir o alertar del mantenimiento preventivo de un aparato, lo que obliga a que el área técnica encargada se encargue de cumplir con un protocolo de mantención adecuado, pero incluso así, no se puede asegurar el total funcionamiento del componente a lo largo del tiempo sin mantención, lo que deja destinado a que un usuario cualquiera tenga que reportar el fallo una vez del dispositivo muestre problemas evidentes, acción que a su vez puede ser desincentivada por falta de tiempo para acudir con un miembro del personal de la universidad, por desconocimiento del protocolo de reporte, por no saber a dónde acudir, por no haber personal disponible, etc. Además, la información centralizada para un usuario cualquiera permite incluso detectar o descartar problemas del equipo, con lo cual su potencial problema a reportar puede ser arreglado o gestionado por el propio usuario con conocimiento básico o más especializado que el mismo tenga.

El hecho de tampoco contar con esta información de forma registrada y centralizada impide la posibilidad de ver vistas generales o o estadísticas relevantes del comportamiento de la gestión de los componentes activos de la universidad, por ejemplo: frecuencia de mantenimiento de ciertos dispositivos, calidad de los dispositivos, problemas frecuentes de los dispositivos, gastos asociados a los servicios técnicos, conexiones y comunicaciones con servicios técnicos externos (de terceros).

Además de la centralización de la información, la digitalización de la misma que plantea nuestro proyecto permite no solo la comunicación rápida de una incidencia (entiéndase «incidencia» como las siguientes: 1\. Desperfecto total del dispositivo; 2\. Problema o fallo parcial; 3\. Observación de mantenimiento pendiente o sugerencia de uno; 4\. Validación de una solución), sino que también la consideración completa de los trabajos pendientes para el personal a cargo, junto con un nivel de prioridad en caso de acumularse varios trabajos, y ello permite tomar mejores decisiones teniendo toda la información a la vista no solo para el técnico encargado, sino para los supervisores, lo que da la ventaja de tener más de un agente pendiente de los trabajos.

Para implementar la lógica del sistema es necesario, por tanto, modificar el modo en que se realiza la gestión de los componentes de forma global y planteando una unificación de estas áreas de trabajo a los altos niveles de la administración de la universidad, lo cual es más factible de llevar a cabo habiendo recibido retroalimentación durante el desarrollo del proyecto por parte del personal ahora mismo a cargo, además de someter el proyecto a prueba con ciertos departamentos delimitados en primera instancia.

**OBJETIVOS**

**Generales**

El objetivo general del proyecto es crear una plataforma con despliegue web abierta al despliegue móvil para el trabajo conjunto con estudiantes del Taller de Integración IV, que permita la administración centralizada de equipos junto con los bienes tecnológicos que conforman la infraestructura de la universidad, de modo que proporcione la proyección futura del estado y comportamiento de estos componentes.

**Específicos**

1. Diseñar y programar una página web que cumpla con las funcionalidades requeridas para cumplir con la solución propuesta del proyecto, asegurando calidad basada en el manejo de errores, intuitividad y seguridad.  
2. Desarrollar una base de datos con entidades claramente definidas y coherentes con el contexto del sistema e implementarlas correctamente en el diseño de la página web.  
3. Desarrollar una API que permita conectar tanto la aplicación web como la aplicación móvil para centralizar el envío y uso de datos.  
4. Desarrollar un módulo que permita la visualización de estadísticas y reportes en base a los datos de los componentes activos.

**ACTIVIDADES** a realizar para lograr los objetivos planteados.

Las actividades planteadas para el cumplimiento de los objetivos del proyecto abarcan las siguientes áreas productivas:

- Configuración de la Infraestructura: Base de datos, entorno de ejecución y contenedores: El plan es configurar los scripts y archivos necesarios para poner a funcionar contenedores Docker para inicialización de entornos compartidos de desarrollo y servicios de persistencia; asimismo, se modelarán las entidades principales del sistema: Usuarios, Roles, Incidencias, Órdenes de Trabajo y Evidencias.

- Desarrollo de la API Gateway: Las actividades dedicadas a este apartado consistirán en implementar un API Gateway configurando variables de entorno y rutas proxy básicas. Se estudiarán e implementarán políticas de seguridad como CORS, Rate Limiting, trabajo con autenticación JWT, uso de middlewares para validación de claims y verificación de control de acceso RBAC, con los respectivos endpoints necesarios.  
    
- Desarrollo del backend en base a la lógica de negocio: Se implementará la lógica de negocio a nivel de backend: esto es toda la lógica transaccional del sistema (casos de uso). Esto contempla la definición de un enum (desplegables) con estados de ciclo de vida de incidencias, máquina de estados, registro automático de historial de cambios y gestión de órdenes de trabajo. Adicionalmente, se programarán la lógica para recepción de diagnósticos técnicos, la gestión de prioridades de activos/incidencias y los endpoints para validación y escaneo de códigos QR.

- Desarrollo del frontend de la aplicación web: Se establecerá la arquitectura del cliente web definiendo la estructura de carpetas, el framework base, el enrutador principal y el maquetado del *Layout Maestro*. Se construirán las interfaces visuales clave: pantalla de inicio de sesión, formulario de reporte con validaciones en tiempo real, panel de asignación de órdenes de trabajo, catálogos de usuarios y vistas de aprobación o rechazo para el reportante. A nivel de interacción, se desarrollarán guardias de ruta (*Route Guards*), componentes de retroalimentación (*Toast/Snackbar*), validadores visuales de prioridad e interceptores HTTP para el manejo global de errores y formato estandarizado JSON. x

**RESULTADOS ESPERADOS.**

Se espera que este proyecto permita generar un Sistema Centralizado de Gestión de Infraestructura (CMMS/EAM) completamente funcional en su versión web y preparado en cada uno de sus avances para permitir el desarrollo una integración móvil en paralelo.

Se espera que la web provea una interfaz administrativa e interactiva que permita a los reportantes, supervisores, técnicos y administrados realiza una gestión integral de los activos de acuerdo con sus roles, contando con flujos de autenticación y validaciones en tiempo real.

Este proyecto de CMMS/EAM va a proveer un canal digital accesible que elimina la pérdida de información por vías informales, entregando transparencia a los usuarios sobre el estado de sus reportes y garantizando el correcto funcionamiento de los recursos tecnológicos destinados a la docencia y administración.

**ANÁLISIS DE LA SITUACIÓN CON PROYECTO.**

La implementación del proyecto *Gestión de Activos UCT* transformará radicalmente la administración operativa de los activos tecnológicos e infraestructura de la universidad, superando las limitaciones estructurales identificadas anteriormente. A diferencia del escenario actual, caracterizado por la fragmentación de áreas, la comunicación verbal o por formularios aislados y la evanescencia de los registros, la situación con proyecto establece una plataforma digital única y accesible tanto en formato web como móvil, sustentada en un backend unificado mediante arquitectura de microservicios y APIs RESTful.

Primeramente, el cambio más significativo se manifiesta en la centralización y trazabilidad de la información. Al integrar un sistema de identificación de activos mediante códigos QR y una jerarquía clara de ubicaciones (edificios, pisos y salas), cualquier miembro de la comunidad universitaria podrá interactuar directamente con la plataforma en terreno: un reporte de falla ya no dependerá de encontrar físicamente al personal de soporte o de enviar correos informales que quedan sin seguimiento, sino que bastará con escanear el código QR del dispositivo afectado para abrir una incidencia, adjuntar evidencias fotográficas si se quiere y registrar la alerta en tiempo real. Esta visibilidad compartida y colectiva elimina la pérdida de información descrita y garantiza que cada requerimiento ingrese a un flujo de trabajo auditable dentro del sistema del proyecto.

En segundo lugar, el proyecto introduce una máquina de estados completa para el ciclo de vida de las incidencias. Este flujo estructural modifica directamente la variable de tiempo de respuesta y eficiencia operativa. Los supervisores dispondrán de paneles ejecutivos en la interfaz, con tableros de control para clasificar la gravedad de los problemas, priorizando requerimientos según el impacto del activo en la actividad académica, y asignar órdenes de trabajo al personal técnico correspondiente. A su vez, los técnicos contarán con una herramienta móvil que les permitirá registrar diagnósticos, requerimientos de repuestos y avances en tiempo real desde el lugar de los hechos, pasando de una gestión reactiva e improvisada a una ejecución coordinada.

En tercer lugar, la plataforma impacta decididamente en la capacidad de gestión preventiva y toma de decisiones de alto nivel. Al almacenar el historial unificado de intervenciones, fallas recurrentes, costos de reparación y frecuencias de mantenimiento en una base de datos relacional robusta y potente (mediante el SGBD PostgreSQL), el sistema deja de ser meramente un buzón de tickets y pasa a convertirse en un gran motor analítico. Los administradores y autoridades universitarias podrán visualizar estadísticas e indicadores clave de rendimiento, identificando qué equipamientos presentan mayores tasas de falla, qué marcas o proveedores resultan más defectuosos y en qué espacios se concentra el gasto operativo. Esto puede permitir, por ejemplo, planificar calendarios de mantenimiento preventivo y justificar la renovación o adquisición de infraestructura basándose en datos empíricos y no en supuestos o meras percepciones al ojo.

Por último, en el plano técnico e institucional, la arquitectura desacoplada que se espera construir (API Gateway, microservicios e interfaces simétricas para web y móvil) asegura que la solución sea sostenible, escalable y mantenible a lo largo del tiempo. La transición hacia esta situación con proyecto no solo resolverá la discontinuidad o inestabilidad de los servicios en salas de clases, laboratorios u otros espacios claves de la universidad, sino que fomentará a nivel de comunidad una cultura organizacional orientada a la transparencia, el cuidado participativo de los bienes institucionales y la optimización del gasto.

