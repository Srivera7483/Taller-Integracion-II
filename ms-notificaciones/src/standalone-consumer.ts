import * as amqplib from 'amqplib';

/**
 * Consumidor Esclavo Independiente (Standalone Consumer) - TAL-11
 *
 * Lee mensajes de la cola 'incidencias_criticas' en RabbitMQ e imprime la alerta en consola.
 * Configurado con ACK manual (noAck: false) para garantizar cero pérdida de paquetes.
 *
 * Uso:
 *   pnpm --prefix ms-notificaciones run start:consumer
 */
async function iniciarConsumidorEsclavo() {
  const rmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  const queueName = process.env.RABBITMQ_QUEUE_CRITICAS || 'incidencias_criticas';

  console.log('================================================================================');
  console.log('🚀 INICIANDO CONSUMIDOR ESCLAVO DE INCIDENCIAS CRÍTICAS (RABBITMQ)');
  console.log(`🌐 Broker URL:  ${rmqUrl}`);
  console.log(`📥 Cola destino: ${queueName}`);
  console.log('🛡️  Estrategia de entrega: ACKs manuales (At-least-once, Cero pérdida de paquetes)');
  console.log('================================================================================');
  console.log('⏳ Esperando mensajes en la cola... (Presiona Ctrl+C para detener)');

  try {
    const connection = await amqplib.connect(rmqUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });
    await channel.prefetch(1);

    await channel.consume(
      queueName,
      (msg) => {
        if (!msg) return;

        try {
          const rawContent = msg.content.toString();
          let data: any;

          try {
            data = JSON.parse(rawContent);
            // Si viene empaquetado por NestJS Microservices ({ pattern, data })
            if (data && data.pattern && data.data) {
              data = data.data;
            }
          } catch {
            data = { raw: rawContent };
          }

          console.log('\n================================================================================');
          console.log('🚨 [CONSUMIDOR ESCLAVO] NUEVO EVENTO DE INCIDENCIA CRÍTICA DETECTADO');
          console.log('--------------------------------------------------------------------------------');
          console.log(`🆔 ID Incidencia:    ${data.id_incidencia ?? 'N/A'}`);
          console.log(`🏢 ID Activo:        ${data.id_activo ?? 'N/A'}`);
          console.log(`👤 ID Reportante:    ${data.id_reportante ?? 'N/A'}`);
          console.log(`📌 Título:           ${data.titulo ?? 'Sin título'}`);
          console.log(`📝 Descripción:      ${data.descripcion ?? 'Sin descripción'}`);
          console.log(`⚠️  Prioridad:        ${data.prioridad ?? 'Crítica'}`);
          console.log(`📅 Fecha Creación:   ${data.fecha_creacion ?? 'N/A'}`);
          console.log(`📊 Estado:           ${data.estado ?? 'Reportada'}`);
          console.log('--------------------------------------------------------------------------------');
          console.log('✅ Mensaje procesado exitosamente.');
          console.log('🤝 Enviando ACK manual a RabbitMQ (Paquete confirmado)...');
          console.log('================================================================================\n');

          // ACK manual: confirmación de recepción y procesamiento
          channel.ack(msg);
        } catch (procError) {
          console.error('❌ Error al procesar mensaje:', procError);
          // Re-encolar en caso de error transitorio
          channel.nack(msg, false, true);
        }
      },
      { noAck: false }, // Manual ACKs enabled
    );

    // Manejo de señales de terminación
    const cerrar = async () => {
      console.log('\n🛑 Cerrando consumidor esclavo...');
      await channel.close();
      await connection.close();
      process.exit(0);
    };

    process.on('SIGINT', cerrar);
    process.on('SIGTERM', cerrar);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error al conectar consumidor con RabbitMQ: ${errorMsg}`);
    console.error('💡 Asegúrate de que el contenedor de RabbitMQ esté corriendo: docker compose up -d rabbitmq');
    process.exit(1);
  }
}

void iniciarConsumidorEsclavo();

