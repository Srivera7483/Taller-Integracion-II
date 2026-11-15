const http = require('http');
const io = require('socket.io-client');
const { buildGateway } = require('./api gateway/index.js');

console.log('=== TAL-2: Prueba de Funcionamiento WebSocket ===\n');

// 1. Construir gateway
console.log('1. Construyendo API Gateway...');
const { fastify, io: gatewayIo } = buildGateway({ logger: false });
console.log('   Gateway construido exitosamente\n');

// 2. Iniciar servidores
const port = 3001;

fastify.listen({ port, host: '0.0.0.0' }, async () => {
  console.log(`   API Gateway escuchando en http://localhost:${port}\n`);
  
  // Esperar un momento para que Socket.io inicie
  setTimeout(async () => {
    try {
      // 3. Conectar cliente WebSocket
      console.log('2. Conectando cliente WebSocket...');
      const client = io(`http://localhost:${port}`, {
        query: { userId: 'test-user-123' },
        transports: ['websocket', 'polling']
      });
      
      client.on('connect', () => {
        console.log('   Cliente conectado successfully');
        console.log('   Socket ID:', client.id);
        
        // Unir a sala
        client.join('incidencias');
        console.log('   Unido a sala: incidencias');
        
        // Probar emisión de evento
        console.log('3. Probando emisión de evento...');
        gatewayIo.emitIncidencias('nueva-incidencia', {
          id: 'inc-001',
          titulo: 'Incidencia de prueba',
          descripcion: 'Prueba TAL-2 sincronización en tiempo real'
        });
        
        // Escuchar evento recibido
        client.on('incidencias:nueva-incidencia', (data) => {
          console.log('   Evento recibido en cliente:');
          console.log('   ', data);
          
          // Probar desconexión limpia
          console.log('4. Probando desconexión limpia...');
          client.disconnect();
          
          setTimeout(() => {
            console.log('   Cliente desconectado limpiamente');
            
            // Verificar cleanup de listeners
            console.log('5. Verificando cleanup de listeners...');
            const listeners = client.listenerCount('incidencias:nueva-incidencia');
            console.log('   Listeners remaining:', listeners, '(should be 0 after disconnect)');
            
            // Cerrar gateway
            console.log('6. Cerrando gateway...');
            fastify.close(() => {
              console.log('   Gateway cerrado exitosamente');
              console.log('\n=== TAL-2: Todas las pruebas completadas ===');
              process.exit(0);
            });
          }, 500);
        });
      });
      
      client.on('connect_error', (err) => {
        console.error('Error de conexión:', err.message);
        fastify.close();
        process.exit(1);
      });
      
      client.on('error', (err) => {
        console.error('Error del socket:', err.message);
        fastify.close();
        process.exit(1);
      });
      
    } catch (error) {
      console.error('Error en prueba:', error);
      fastify.close();
      process.exit(1);
    }
  }, 1000);
});

// Timeout de seguridad
setTimeout(() => {
  console.error('Timeout de prueba - problema de inicio');
  fastify.close();
  process.exit(1);
}, 15000);