import {
  FileMimeValidationPipe,
  detectarMimePorMagicNumbers,
  extraerExtension,
  validarExtensionEvidencia,
} from './file-mime.pipe';
import {
  UnsupportedMediaTypeException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';

describe('FileMimeValidationPipe - TAL-127: Middleware de Validación MIME de Evidencias', () => {
  let pipe: FileMimeValidationPipe;

  beforeEach(() => {
    pipe = new FileMimeValidationPipe();
  });

  // Buffers con Magic Numbers auténticos
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const webpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // 'RIFF'
    0x24, 0x00, 0x00, 0x00, // file size
    0x57, 0x45, 0x42, 0x50, // 'WEBP'
    0x56, 0x50, 0x38, 0x20, // 'VP8 '
  ]);

  // Buffers de archivos prohibidos
  const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]); // '%PDF-1.5'
  const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // 'MZ' (DOS/PE)
  const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>');
  const xmlSvgBuffer = Buffer.from('<?xml version="1.0"?><svg viewBox="0 0 10 10"></svg>');
  const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]); // 'PK..'

  describe('Criterio de Aceptación 1: Rechazo de archivos prohibidos (PDF, EXE, SVG) con HTTP 415 / 400', () => {
    it('rechaza archivos PDF con HTTP 415 (Unsupported Media Type)', () => {
      const mockPdfFile = {
        originalname: 'documento_auditoria.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer,
        size: pdfBuffer.length,
      };

      expect(() => pipe.transform(mockPdfFile)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockPdfFile)).toThrow(/Extensión de archivo '\.pdf' no permitida/);
    });

    it('rechaza archivos ejecutables EXE con HTTP 415 (Unsupported Media Type)', () => {
      const mockExeFile = {
        originalname: 'instalador_parche.exe',
        mimetype: 'application/x-msdownload',
        buffer: exeBuffer,
        size: exeBuffer.length,
      };

      expect(() => pipe.transform(mockExeFile)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockExeFile)).toThrow(/Extensión de archivo '\.exe' no permitida/);
    });

    it('rechaza archivos vectoriales SVG con HTTP 415 (Unsupported Media Type) por riesgo de XSS', () => {
      const mockSvgFile = {
        originalname: 'diagrama_red.svg',
        mimetype: 'image/svg+xml',
        buffer: svgBuffer,
        size: svgBuffer.length,
      };

      expect(() => pipe.transform(mockSvgFile)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockSvgFile)).toThrow(/Extensión de archivo '\.svg' no permitida/);
    });

    it('detecta y rechaza ejecutables EXE camuflados con extensión .jpg (Spoofing de extensión)', () => {
      const mockCamouflagedExe = {
        originalname: 'foto_evidencia.jpg',
        mimetype: 'image/jpeg',
        buffer: exeBuffer, // Cabecera binaria real 'MZ'
        size: exeBuffer.length,
      };

      expect(() => pipe.transform(mockCamouflagedExe)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockCamouflagedExe)).toThrow(/Magic Numbers/);
      expect(() => pipe.transform(mockCamouflagedExe)).toThrow(/application\/x-msdownload/);
    });

    it('detecta y rechaza PDFs camuflados con extensión .png (Spoofing de extensión)', () => {
      const mockCamouflagedPdf = {
        originalname: 'pantallazo.png',
        mimetype: 'image/png',
        buffer: pdfBuffer, // Cabecera binaria real '%PDF'
        size: pdfBuffer.length,
      };

      expect(() => pipe.transform(mockCamouflagedPdf)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockCamouflagedPdf)).toThrow(/Magic Numbers/);
      expect(() => pipe.transform(mockCamouflagedPdf)).toThrow(/application\/pdf/);
    });

    it('detecta y rechaza archivos SVG camuflados con extensión .webp', () => {
      const mockCamouflagedSvg = {
        originalname: 'imagen.webp',
        mimetype: 'image/webp',
        buffer: xmlSvgBuffer, // Contenido XML / SVG
        size: xmlSvgBuffer.length,
      };

      expect(() => pipe.transform(mockCamouflagedSvg)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockCamouflagedSvg)).toThrow(/Magic Numbers/);
      expect(() => pipe.transform(mockCamouflagedSvg)).toThrow(/image\/svg\+xml/);
    });

    it('detecta y rechaza archivos ZIP camuflados con extensión .jpeg', () => {
      const mockZip = {
        originalname: 'evidencia.jpeg',
        mimetype: 'image/jpeg',
        buffer: zipBuffer,
        size: zipBuffer.length,
      };

      expect(() => pipe.transform(mockZip)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockZip)).toThrow(/application\/zip/);
    });

    it('rechaza archivos corruptos o vacíos que no poseen firmas de imagen válidas', () => {
      const mockCorrupt = {
        originalname: 'corrupto.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]),
        size: 4,
      };

      expect(() => pipe.transform(mockCorrupt)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(mockCorrupt)).toThrow(/Magic Numbers/);
    });

    it('permite configurar errorStatusCode a HTTP 400 (Bad Request) según opciones', () => {
      const pipeBadRequest = new FileMimeValidationPipe({
        errorStatusCode: HttpStatus.BAD_REQUEST,
      });

      const mockPdfFile = {
        originalname: 'documento.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer,
      };

      expect(() => pipeBadRequest.transform(mockPdfFile)).toThrow(BadRequestException);
    });
  });

  describe('Criterio de Aceptación: Aceptación estricta de JPEG, PNG y WebP válidos', () => {
    it('acepta una imagen JPEG válida con extensión .jpg', () => {
      const file = {
        originalname: 'foto_servidor.jpg',
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
        size: jpegBuffer.length,
      };

      const resultado = pipe.transform(file);
      expect(resultado).toBe(file);
    });

    it('acepta una imagen JPEG válida con extensión .jpeg', () => {
      const file = {
        originalname: 'foto_cableado.jpeg',
        mimetype: 'image/jpeg',
        buffer: jpegBuffer,
        size: jpegBuffer.length,
      };

      const resultado = pipe.transform(file);
      expect(resultado).toBe(file);
    });

    it('acepta una imagen PNG válida con extensión .png', () => {
      const file = {
        originalname: 'captura_pantalla.png',
        mimetype: 'image/png',
        buffer: pngBuffer,
        size: pngBuffer.length,
      };

      const resultado = pipe.transform(file);
      expect(resultado).toBe(file);
    });

    it('acepta una imagen WebP válida con extensión .webp', () => {
      const file = {
        originalname: 'evidencia_comprimida.webp',
        mimetype: 'image/webp',
        buffer: webpBuffer,
        size: webpBuffer.length,
      };

      const resultado = pipe.transform(file);
      expect(resultado).toBe(file);
    });

    it('rechaza archivo cuando la extensión no coincide con el Magic Number real', () => {
      const file = {
        originalname: 'grafico.png',
        mimetype: 'image/png',
        buffer: jpegBuffer, // Es un JPEG pero dice ser .png
        size: jpegBuffer.length,
      };

      expect(() => pipe.transform(file)).toThrow(UnsupportedMediaTypeException);
      expect(() => pipe.transform(file)).toThrow(/extensión \.png pero su contenido binario no corresponde a PNG/);
    });
  });

  describe('Manejo de archivos ausentes o nulos', () => {
    it('lanza BadRequestException (400) si no se envía archivo y required es true', () => {
      expect(() => pipe.transform(null)).toThrow(BadRequestException);
      expect(() => pipe.transform(undefined)).toThrow(/El archivo de evidencia es requerido/);
    });

    it('permite valores nulos si required=false', () => {
      const pipeOpcional = new FileMimeValidationPipe({ required: false });
      expect(pipeOpcional.transform(null)).toBeNull();
      expect(pipeOpcional.transform(undefined)).toBeUndefined();
    });
  });

  describe('Funciones auxiliares reutilizables', () => {
    it('extraerExtension obtiene correctamente extensiones limpias y en minúsculas', () => {
      expect(extraerExtension('foto.JPG')).toBe('jpg');
      expect(extraerExtension('archivo.tar.gz')).toBe('gz');
      expect(extraerExtension('imagen.webp?v=123#anchor')).toBe('webp');
      expect(extraerExtension('sin_extension')).toBe('');
      expect(extraerExtension(undefined)).toBe('');
    });

    it('detectarMimePorMagicNumbers detecta los formatos principales por sus bytes iniciales', () => {
      expect(detectarMimePorMagicNumbers(jpegBuffer)).toBe('image/jpeg');
      expect(detectarMimePorMagicNumbers(pngBuffer)).toBe('image/png');
      expect(detectarMimePorMagicNumbers(webpBuffer)).toBe('image/webp');
      expect(detectarMimePorMagicNumbers(pdfBuffer)).toBe('application/pdf');
      expect(detectarMimePorMagicNumbers(exeBuffer)).toBe('application/x-msdownload');
      expect(detectarMimePorMagicNumbers(svgBuffer)).toBe('image/svg+xml');
      expect(detectarMimePorMagicNumbers(zipBuffer)).toBe('application/zip');
      expect(detectarMimePorMagicNumbers(Buffer.from([0x01, 0x02]))).toBeNull();
      expect(detectarMimePorMagicNumbers(null)).toBeNull();
    });

    it('validarExtensionEvidencia valida correctamente URLs o nombres de archivos', () => {
      expect(validarExtensionEvidencia('https://cloudinary.com/foto.jpg')).toBe(true);
      expect(validarExtensionEvidencia('captura.png')).toBe(true);
      expect(validarExtensionEvidencia('evidencia.webp')).toBe(true);

      expect(() => validarExtensionEvidencia('virus.exe')).toThrow(UnsupportedMediaTypeException);
      expect(() => validarExtensionEvidencia('https://servidor.com/informe.pdf')).toThrow(UnsupportedMediaTypeException);
      expect(() => validarExtensionEvidencia('grafico.svg')).toThrow(UnsupportedMediaTypeException);
    });
  });
});

