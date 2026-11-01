import { ArgumentMetadata } from '@nestjs/common';
import {
  SanitizeXssPipe,
  sanitizeStringXss,
  escapeHtml,
} from './sanitize-xss.pipe';

describe('SanitizeXssPipe - TAL-140 Sanitización de Entradas (XSS)', () => {
  let pipe: SanitizeXssPipe;

  beforeEach(() => {
    pipe = new SanitizeXssPipe();
  });

  describe('Criterio de Aceptación Principal (TAL-140)', () => {
    it('convierte "Falla <script>alert(1)</script>" en el texto inocuo "Falla alert(1)"', () => {
      const input = {
        titulo: 'Problema en proyector',
        descripcion: 'Falla <script>alert(1)</script>',
      };

      const resultado = pipe.transform(input);

      expect(resultado.descripcion).toBe('Falla alert(1)');
      expect(resultado.titulo).toBe('Problema en proyector');
    });

    it('sanitiza si se envía directamente como string primitivo', () => {
      const resultado = pipe.transform('Falla <script>alert(1)</script>');
      expect(resultado).toBe('Falla alert(1)');
    });
  });

  describe('Mitigación de Variantes y Vectores de Ataque XSS', () => {
    it('elimina scripts con atributos complejos (type, src, async, defer)', () => {
      const input =
        'Reporte <script type="text/javascript" src="https://evil.com/xss.js" async>alert("pwned")</script> final';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Reporte alert("pwned") final');
    });

    it('es insensible a mayúsculas y minúsculas (<SCRIPT>, <sCrIpT>)', () => {
      const input = 'Falla <SCRIPT>alert("MAYUS")</SCRIPT> y <sCrIpT>alert("MiXeD")</ScRiPt>';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Falla alert("MAYUS") y alert("MiXeD")');
    });

    it('desactiva ataques de etiquetas anidadas / recursivas (<scr<script>ipt>)', () => {
      const input = 'Falla <scr<script>ipt>alert(1)</script> en router';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Falla alert(1) en router');
    });

    it('elimina etiquetas de scripts no cerradas o huérfanas', () => {
      const input = 'Falla <script>alert(1)';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Falla alert(1)');
    });

    it('elimina etiquetas ejecutables de iframe, object, embed, style y applet', () => {
      const input =
        'Texto <iframe src="http://malicious.com">iframe_content</iframe> <style>body{display:none}</style> fin';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Texto fin');
    });

    it('elimina etiquetas SVG y MathML con vectores de inyección', () => {
      const input = 'Icono <svg onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg> reporte';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Icono reporte');
    });

    it('elimina atributos de eventos inline maliciosos (onerror, onload, onclick, etc.)', () => {
      const input = 'Evidencia <img src="invalido" onerror="alert(document.cookie)"> dañada';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Evidencia dañada');
    });

    it('elimina pseudoprotocolos javascript: en enlaces o atributos', () => {
      const input = 'Visitar <a href="javascript:alert(1)">enlace seguro</a> para detalles';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Visitar enlace seguro para detalles');
    });
  });

  describe('Preservación de Entradas Legítimas', () => {
    it('conserva texto con caracteres matemáticos legítimos (<, >) sin romper contenido', () => {
      const input = 'Temperatura ambiente < 15 grados y uso de CPU > 90%';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe('Temperatura ambiente < 15 grados y uso de CPU > 90%');
    });

    it('conserva saltos de línea y formateo de párrafos en descripciones', () => {
      const input = '[Categoría: Redes] [Ubicación: Edificio B]\nFalla en switch de piso 2.\nFavor revisar.';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe(input);
    });

    it('mantiene caracteres en español como tildes, diéresis y eñes', () => {
      const input = 'La cámara del área audiovisual está averiada y el cañón proyector se apagó.';
      const resultado = sanitizeStringXss(input);
      expect(resultado).toBe(input);
    });
  });

  describe('Modos Alternativos de Sanitización', () => {
    it('soporta modo "escape" convirtiendo caracteres a entidades HTML seguras', () => {
      const pipeEscape = new SanitizeXssPipe({ mode: 'escape' });
      const resultado = pipeEscape.transform('Falla <script>alert(1)</script>');
      expect(resultado).toBe('Falla &lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('función escapeHtml convierte &, <, >, " y \'', () => {
      const resultado = escapeHtml('Test <tag> & "quotes" \'single\'');
      expect(resultado).toBe('Test &lt;tag&gt; &amp; &quot;quotes&quot; &#x27;single&#x27;');
    });
  });

  describe('Transformación de DTOs y Objetos en NestJS', () => {
    it('sanitiza los campos objetivo por defecto (titulo, descripcion, diagnostico_tecnico)', () => {
      const dto = {
        id_activo: '550e8400-e29b-41d4-a716-446655440000',
        titulo: 'Alerta <script>alert("titulo")</script>',
        descripcion: 'Detalle <script>alert("descripcion")</script>',
        diagnostico_tecnico: 'Diagnóstico <script>alert("diagnostico")</script>',
        numero_intentos: 3,
        activo: true,
      };

      const resultado = pipe.transform(dto);

      expect(resultado.id_activo).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(resultado.titulo).toBe('Alerta alert("titulo")');
      expect(resultado.descripcion).toBe('Detalle alert("descripcion")');
      expect(resultado.diagnostico_tecnico).toBe('Diagnóstico alert("diagnostico")');
      expect(resultado.numero_intentos).toBe(3);
      expect(resultado.activo).toBe(true);
    });

    it('permite filtrar campos específicos mediante la opción fields', () => {
      const customPipe = new SanitizeXssPipe({ fields: ['descripcion'] });
      const dto = {
        titulo: '<script>alert(1)</script>',
        descripcion: '<script>alert(2)</script>',
      };

      const resultado = customPipe.transform(dto);

      expect(resultado.titulo).toBe('<script>alert(1)</script>');
      expect(resultado.descripcion).toBe('alert(2)');
    });

    it('sanitiza de forma recursiva objetos y arreglos anidados', () => {
      const payload = {
        incidencia: {
          descripcion: 'Falla <script>alert(1)</script>',
          comentarios: [
            { texto: 'Comentario <script>alert(2)</script>' },
          ],
        },
      };

      const customPipe = new SanitizeXssPipe({ fields: [] }); // todos los strings
      const resultado = customPipe.transform(payload);

      expect(resultado.incidencia.descripcion).toBe('Falla alert(1)');
      expect(resultado.incidencia.comentarios[0].texto).toBe('Comentario alert(2)');
    });

    it('retorna null y undefined sin alteración', () => {
      expect(pipe.transform(null)).toBeNull();
      expect(pipe.transform(undefined)).toBeUndefined();
    });
  });
});

