import {
  challengeMet,
  CHALLENGES,
  drawChallenges,
  isFrontal,
  mouthRatio,
  type Point,
  yawRatio,
} from './liveness.js';

/**
 * Rostro sintético de 68 puntos: solo importan la mandíbula (0, 16), la punta
 * de la nariz (30) y las comisuras (48, 54). Cara de 100 px de ancho.
 */
function face({ noseX = 50, mouth = 30 } = {}): Point[] {
  const points: Point[] = Array.from({ length: 68 }, () => ({ x: 50, y: 50 }));
  points[0] = { x: 0, y: 50 };
  points[16] = { x: 100, y: 50 };
  points[30] = { x: noseX, y: 55 };
  points[48] = { x: 50 - mouth / 2, y: 80 };
  points[54] = { x: 50 + mouth / 2, y: 80 };
  return points;
}

const neutral = face();

describe('métricas faciales', () => {
  it('yawRatio vale 0.5 de frente y sube al girar a la izquierda', () => {
    expect(yawRatio(neutral)).toBe(0.5);
    expect(yawRatio(face({ noseX: 70 }))).toBe(0.7);
  });

  it('mouthRatio mide la boca relativa a la cara', () => {
    expect(mouthRatio(neutral)).toBeCloseTo(0.3);
  });

  it('isFrontal tolera un giro leve', () => {
    expect(isFrontal(face({ noseX: 58 }))).toBe(true);
    expect(isFrontal(face({ noseX: 65 }))).toBe(false);
  });
});

describe('challengeMet', () => {
  it('reconoce el giro a cada lado y no lo confunde', () => {
    const left = face({ noseX: 66 });
    const right = face({ noseX: 34 });
    expect(challengeMet('TURN_LEFT', left, neutral)).toBe(true);
    expect(challengeMet('TURN_LEFT', right, neutral)).toBe(false);
    expect(challengeMet('TURN_RIGHT', right, neutral)).toBe(true);
    expect(challengeMet('TURN_RIGHT', neutral, neutral)).toBe(false);
  });

  it('exige que la boca se ensanche respecto al fotograma de frente', () => {
    expect(challengeMet('SMILE', face({ mouth: 36 }), neutral)).toBe(true);
    expect(challengeMet('SMILE', face({ mouth: 31 }), neutral)).toBe(false);
  });
});

describe('drawChallenges', () => {
  it('sortea dos gestos distintos del catálogo', () => {
    for (let i = 0; i < 20; i++) {
      const drawn = drawChallenges();
      expect(drawn).toHaveLength(2);
      expect(new Set(drawn).size).toBe(2);
      drawn.forEach((c) => expect(CHALLENGES).toContain(c));
    }
  });

  it('depende del azar (orden y combinación)', () => {
    expect(drawChallenges(() => 0)).not.toEqual(drawChallenges(() => 0.99));
  });
});
