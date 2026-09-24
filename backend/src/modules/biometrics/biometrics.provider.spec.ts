import { SimulatedBiometricProvider } from './biometrics.provider.js';

describe('SimulatedBiometricProvider', () => {
  const provider = new SimulatedBiometricProvider();
  const capture = {
    frames: [Buffer.from('una selfie'), Buffer.from('un gesto')],
    challenges: ['SMILE' as const],
    reference: Buffer.from('una cédula'),
  };

  it('se identifica por su nombre', () => {
    expect(provider.name).toBe('simulated');
  });

  it('devuelve el mismo resultado para la misma captura', async () => {
    expect(await provider.assess(capture)).toEqual(
      await provider.assess(capture),
    );
  });

  it('incluye el proveedor en la evaluación', async () => {
    expect((await provider.assess(capture)).provider).toBe('simulated');
  });

  it('cambia el resultado si cambia el fotograma de frente', async () => {
    const otra = await provider.assess({
      ...capture,
      frames: [Buffer.from('otra selfie'), capture.frames[1]],
    });
    expect(otra).not.toEqual(await provider.assess(capture));
  });

  it('cambia el resultado si cambia el documento de referencia', async () => {
    const otra = await provider.assess({
      ...capture,
      reference: Buffer.from('otra cédula'),
    });
    expect(otra).not.toEqual(await provider.assess(capture));
  });

  it('mantiene los puntajes en [70, 100) con dos decimales', async () => {
    // Muchas entradas distintas: ninguna debe salirse del rango documentado.
    for (let i = 0; i < 200; i++) {
      const { livenessScore, matchScore } = await provider.assess({
        frames: [Buffer.from(`selfie-${i}`)],
        challenges: [],
        reference: Buffer.from(`cedula-${i}`),
      });
      for (const score of [livenessScore, matchScore]) {
        expect(score).toBeGreaterThanOrEqual(70);
        expect(score).toBeLessThan(100);
        expect(Number(score.toFixed(2))).toBe(score);
      }
    }
  });
});
