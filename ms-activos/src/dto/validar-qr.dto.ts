export class ValidarQrDto {
  codigoQr!: string;

  static validar(codigo: string | undefined | null): { valido: boolean; error?: string; codigoLimpio?: string } {
    if (!codigo || typeof codigo !== 'string') {
      return { valido: false, error: 'El código QR es obligatorio y debe ser una cadena de texto.' };
    }

    const codigoLimpio = codigo.trim();

    if (codigoLimpio.length < 3) {
      return { valido: false, error: 'El código QR es demasiado corto (mínimo 3 caracteres).' };
    }

    if (codigoLimpio.length > 100) {
      return { valido: false, error: 'El código QR excede la longitud máxima permitida (100 caracteres).' };
    }

    const patronSeguro = /^[a-zA-Z0-9_-]+$/;
    if (!patronSeguro.test(codigoLimpio)) {
      return {
        valido: false,
        error: 'El código QR contiene caracteres no permitidos. Solo se aceptan letras, números y guiones.',
      };
    }

    return { valido: true, codigoLimpio };
  }
}
