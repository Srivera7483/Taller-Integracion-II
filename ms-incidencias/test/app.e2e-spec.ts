import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/configure-http';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MS Incidencias OpenAPI 1.1.0 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let incidenciaId = '';
  const reportanteId = randomUUID();
  const tecnicoId = randomUUID();
  const activoId = randomUUID();

  const bearer = (role: string, id = randomUUID()) =>
    `Bearer ${jwt.sign({ sub: id, rol: role })}`;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  afterEach(async () => {
    if (incidenciaId) {
      await prisma.incidencias.deleteMany({
        where: { id_incidencia: incidenciaId },
      });
      incidenciaId = '';
    }
    await app.close();
  });

  it('expone salud pública y protege recursos con el formato Error', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');

    const response = await request(app.getHttpServer())
      .get('/api/v1/incidencias')
      .expect(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        mensaje: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
        path: '/api/v1/incidencias',
      }),
    );
  });

  it('crea incidencias con el usuario del JWT y lista estados y tipos', async () => {
    const estados = await request(app.getHttpServer())
      .get('/api/v1/estados-incidencia')
      .set('Authorization', bearer('REPORTANTE'))
      .expect(200);
    const reportada = estados.body.find(
      (estado: { nombre_estado: string }) => estado.nombre_estado === 'Reportada',
    );
    expect(reportada).toBeDefined();

    const tipos = await request(app.getHttpServer())
      .get('/api/v1/tipos-evidencia')
      .set('Authorization', bearer('REPORTANTE'))
      .expect(200);
    expect(tipos.body.length).toBeGreaterThan(0);

    const response = await request(app.getHttpServer())
      .post('/api/v1/incidencias')
      .set('Authorization', bearer('REPORTANTE', reportanteId))
      .send({
        id_activo: activoId,
        titulo: 'Proyector no enciende',
        descripcion: 'El proyector no enciende al presionar el botón.',
      })
      .expect(201);

    incidenciaId = response.body.id_incidencia;
    expect(response.body).toEqual(
      expect.objectContaining({
        id_incidencia: expect.any(String),
        id_activo: activoId,
        id_reportante: reportanteId,
        estado: { id_estado: reportada.id_estado, nombre_estado: 'Reportada' },
        fecha_creacion: expect.any(String),
      }),
    );
    expect(response.body).not.toHaveProperty('created_at');

    const byId = await request(app.getHttpServer())
      .get(`/api/v1/incidencias/${incidenciaId}`)
      .set('Authorization', bearer('SUPERVISOR'))
      .expect(200);
    expect(byId.body.id_incidencia).toBe(incidenciaId);

    const list = await request(app.getHttpServer())
      .get(
        `/api/v1/incidencias?id_activo=${activoId}&id_estado=${reportada.id_estado}&limite=5`,
      )
      .set('Authorization', bearer('SUPERVISOR'))
      .expect(200);
    expect(
      list.body.map((item: { id_incidencia: string }) => item.id_incidencia),
    ).toContain(incidenciaId);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/incidencias/${incidenciaId}/historial`)
      .set('Authorization', bearer('SUPERVISOR'))
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toEqual(
      expect.objectContaining({
        id_incidencia: incidenciaId,
        id_usuario_cambio: reportanteId,
        estado: { id_estado: reportada.id_estado, nombre_estado: 'Reportada' },
      }),
    );
  });

  it('registra cambios de estado y aplica permisos por etapa', async () => {
    const reportada = await prisma.estadoIncidencia.findUniqueOrThrow({
      where: { nombre_estado: 'Reportada' },
    });
    const asignada = await prisma.estadoIncidencia.findUniqueOrThrow({
      where: { nombre_estado: 'Asignada' },
    });
    const resuelta = await prisma.estadoIncidencia.findUniqueOrThrow({
      where: { nombre_estado: 'Resuelta' },
    });
    const created = await request(app.getHttpServer())
      .post('/api/v1/incidencias')
      .set('Authorization', bearer('REPORTANTE', reportanteId))
      .send({
        id_activo: activoId,
        titulo: 'Red sin conexión',
        descripcion: 'La red del laboratorio no responde desde esta mañana.',
      })
      .expect(201);
    incidenciaId = created.body.id_incidencia;

    await request(app.getHttpServer())
      .patch(`/api/v1/incidencias/${incidenciaId}/estado`)
      .set('Authorization', bearer('SUPERVISOR'))
      .send({ id_estado: asignada.id_estado })
      .expect(200)
      .expect(({ body }) => expect(body.estado.nombre_estado).toBe('Asignada'));

    await request(app.getHttpServer())
      .patch(`/api/v1/incidencias/${incidenciaId}/estado`)
      .set('Authorization', bearer('SUPERVISOR'))
      .send({ id_estado: resuelta.id_estado })
      .expect(403);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/incidencias/${incidenciaId}/historial`)
      .set('Authorization', bearer('TECNICO'))
      .expect(200);
    expect(
      history.body.map((entry: { estado: { id_estado: number } }) => entry.estado.id_estado),
    ).toEqual([reportada.id_estado, asignada.id_estado]);
  });

  it('asigna órdenes y permite diagnóstico solo al técnico asignado', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/incidencias')
      .set('Authorization', bearer('REPORTANTE', reportanteId))
      .send({
        id_activo: activoId,
        titulo: 'Servidor con ruido',
        descripcion: 'El ventilador del servidor presenta un ruido anormal.',
      })
      .expect(201);
    incidenciaId = created.body.id_incidencia;

    const order = await request(app.getHttpServer())
      .post('/api/v1/ordenes-trabajo')
      .set('Authorization', bearer('SUPERVISOR'))
      .send({ id_incidencia: incidenciaId, id_tecnico: tecnicoId })
      .expect(201);
    expect(order.body).toEqual(
      expect.objectContaining({
        id_orden: expect.any(String),
        id_incidencia: incidenciaId,
        id_tecnico: tecnicoId,
        diagnostico_tecnico: null,
        fecha_creacion: expect.any(String),
      }),
    );
    expect(order.body).not.toHaveProperty('estado');

    const list = await request(app.getHttpServer())
      .get(`/api/v1/ordenes-trabajo?id_tecnico=${tecnicoId}`)
      .set('Authorization', bearer('TECNICO', tecnicoId))
      .expect(200);
    expect(list.body.map((item: { id_orden: string }) => item.id_orden)).toContain(
      order.body.id_orden,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/ordenes-trabajo/${order.body.id_orden}/diagnostico`)
      .set('Authorization', bearer('TECNICO'))
      .send({ diagnostico_tecnico: 'Revisión del ventilador' })
      .expect(403);

    const diagnosed = await request(app.getHttpServer())
      .patch(`/api/v1/ordenes-trabajo/${order.body.id_orden}/diagnostico`)
      .set('Authorization', bearer('TECNICO', tecnicoId))
      .send({ diagnostico_tecnico: 'Revisión del ventilador' })
      .expect(200);
    expect(diagnosed.body.diagnostico_tecnico).toBe('Revisión del ventilador');
  });

  it('adjunta y consulta evidencias y rechaza payloads inválidos', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/incidencias')
      .set('Authorization', bearer('REPORTANTE', reportanteId))
      .send({
        id_activo: activoId,
        titulo: 'Pantalla dañada',
        descripcion: 'La pantalla muestra líneas horizontales al encender.',
      })
      .expect(201);
    incidenciaId = created.body.id_incidencia;
    const tipo = await prisma.tipoEvidencia.findFirstOrThrow();

    const evidence = await request(app.getHttpServer())
      .post(`/api/v1/incidencias/${incidenciaId}/evidencias`)
      .set('Authorization', bearer('REPORTANTE'))
      .send({
        id_tipo_evidencia: tipo.id_tipo_evidencia,
        url_evidencia: 'https://res.cloudinary.com/scgi/image/upload/evidencia.jpg',
      })
      .expect(201);
    expect(evidence.body).toEqual(
      expect.objectContaining({
        id_incidencia: incidenciaId,
        tipo: {
          id_tipo_evidencia: tipo.id_tipo_evidencia,
          nombre_tipo: tipo.nombre_tipo,
        },
        url_evidencia: expect.stringMatching(/^https:\/\//),
        fecha_creacion: expect.any(String),
      }),
    );

    const evidenceList = await request(app.getHttpServer())
      .get(`/api/v1/incidencias/${incidenciaId}/evidencias`)
      .set('Authorization', bearer('SUPERVISOR'))
      .expect(200);
    expect(evidenceList.body).toHaveLength(1);

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/incidencias')
      .set('Authorization', bearer('REPORTANTE'))
      .send({
        id_activo: 'not-a-uuid',
        titulo: '',
        descripcion: '',
        campo_extra: true,
      })
      .expect(400);
    expect(invalid.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        mensaje: expect.any(String),
        message: expect.any(String),
      }),
    );
  });

  it('rechaza una transición de Reportada directamente a Resuelta', async () => {
    const resuelta = await prisma.estadoIncidencia.findUniqueOrThrow({
      where: { nombre_estado: 'Resuelta' },
    });
    const created = await request(app.getHttpServer())
      .post('/api/v1/incidencias')
      .set('Authorization', bearer('REPORTANTE'))
      .send({
        id_activo: activoId,
        titulo: 'Impresora detenida',
        descripcion: 'La impresora no completa trabajos de impresión.',
      })
      .expect(201);
    incidenciaId = created.body.id_incidencia;

    await request(app.getHttpServer())
      .patch(`/api/v1/incidencias/${incidenciaId}/estado`)
      .set('Authorization', bearer('TECNICO'))
      .send({ id_estado: resuelta.id_estado })
      .expect(400);
  });
});