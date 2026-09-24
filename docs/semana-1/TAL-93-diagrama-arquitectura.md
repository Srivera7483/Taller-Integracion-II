# Diagrama de Arquitectura de Software (Refactorizado)

A continuación, se presenta el código **Mermaid** aplicando la retroalimentación: se han incorporado explícitamente los puertos, los servicios de infraestructura, los lenguajes (TypeScript, JavaScript), los frameworks exactos y las herramientas de despliegue.

Puedes visualizar este diagrama nativamente en GitHub o pegando el código en [Mermaid Live Editor](https://mermaid.live).

```mermaid
flowchart TD
    %% Estilos de Capas Originales
    classDef presentation fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#155724;
    classDef gateway fill:#fff3cd,stroke:#ffc107,stroke-width:2px,color:#856404;
    classDef microservice fill:#cce5ff,stroke:#007bff,stroke-width:2px,color:#004085;
    classDef database fill:#f8d7da,stroke:#dc3545,stroke-width:2px,color:#721c24;
    classDef cloud fill:#e2e3e5,stroke:#383d41,stroke-width:2px,color:#383d41;

    %% --- Capa de Presentación ---
    subgraph CapaPresentacion [Capa de Presentación]
        direction LR
        Web["📱 Aplicación Web<br/>(React.js + Vite + Tailwind)<br/>Puerto: 5173"]:::presentation
        Movil["📱 Aplicación Móvil<br/>(React Native + Expo)"]:::presentation
    end

    %% --- Capa Gateway ---
    subgraph CapaGateway [Capa de Enrutamiento y Seguridad]
        Gateway{"🛡️ API Gateway<br/>(Node.js + Express + TypeScript)<br/>Puerto: 8080"}:::gateway
    end

    %% --- Capa de Lógica de Negocio ---
    subgraph CapaBackend [Capa de Lógica de Negocio / Microservicios]
        direction LR
        MS_Auth["🔐 MS Autenticación<br/>(NestJS + Express + JWT)<br/>Puerto: 3001"]:::microservice
        MS_Incidencias["🛠️ MS Incidencias<br/>(NestJS + Express)<br/>Puerto: 3002"]:::microservice
        MS_Activos["📦 MS Activos<br/>(NestJS + Express)<br/>Puerto: 3003"]:::microservice
        MS_Notificaciones["📧 MS Notificaciones<br/>(Node.js + Nodemailer)<br/>Puerto: 3004"]:::microservice
        MS_Archivos["📁 MS Archivos<br/>(NestJS + Express)<br/>Puerto: 3005"]:::microservice
        
        Broker(("✉️ Message Broker<br/>(RabbitMQ)<br/>Puerto: 5672")):::cloud
    end

    %% --- Capa de Datos ---
    subgraph CapaDatos [Capa de Persistencia Física]
        direction LR
        DB_Auth[("🗄️ auth_db<br/>(PostgreSQL + Prisma)<br/>Puerto Docker: 5435")]:::database
        DB_Activos[("🗄️ activos_db<br/>(PostgreSQL + Prisma)<br/>Puerto Docker: 5433")]:::database
        DB_Incidencias[("🗄️ incidencias_db<br/>(PostgreSQL + Prisma)<br/>Puerto Docker: 5434")]:::database
    end

    %% --- Servicios Externos SaaS ---
    subgraph SaaS [Servicios Externos SaaS]
        S3[("☁️ Cloudinary<br/>(Almacenamiento S3)")]:::cloud
    end

    %% Relaciones / Flujo de Datos
    Web -->|HTTP/REST| Gateway
    Movil -->|HTTP/REST| Gateway

    %% Enrutamiento Gateway a Microservicios
    Gateway -->|Proxy /auth| MS_Auth
    Gateway -->|Proxy /activos| MS_Activos
    Gateway -->|Proxy /incidencias| MS_Incidencias
    Gateway -->|Proxy /archivos| MS_Archivos

    %% Comunicación entre Microservicios y Base de Datos
    MS_Auth -->|Lee/Escribe| DB_Auth
    MS_Activos -->|Lee/Escribe| DB_Activos
    MS_Incidencias -->|Lee/Escribe| DB_Incidencias

    %% Consultas Inter-servicios y Eventos
    MS_Incidencias -.->|Pide Info Usuario (REST)| MS_Auth
    MS_Incidencias -.->|Pide Info Activo (REST)| MS_Activos
    MS_Incidencias ==>|Publica Evento Asíncrono| Broker
    Broker ==>|Consume Evento| MS_Notificaciones

    %% Conexiones externas
    MS_Archivos -->|Sube Evidencias (API)| S3
```
