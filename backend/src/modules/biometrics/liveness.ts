/**
 * Prueba de vida activa (reto-respuesta): el servidor sortea gestos y valida,
 * sobre los 68 puntos faciales de cada fotograma, que la persona los hizo.
 * Funciones puras para poder probarlas con puntos sintéticos.
 */

export const CHALLENGES = ['TURN_LEFT', 'TURN_RIGHT', 'SMILE'] as const;
export type Challenge = (typeof CHALLENGES)[number];

export interface Point {
  x: number;
  y: number;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Giro horizontal: posición de la punta de la nariz (30) entre los extremos de
 * la mandíbula (0 y 16). 0.5 es de frente. Los fotogramas llegan tal como los
 * ve la cámara (sin espejo), así que cuando la persona gira hacia SU izquierda
 * la nariz se desplaza hacia la derecha de la imagen y el valor sube.
 */
export const yawRatio = (p: Point[]) => (p[30].x - p[0].x) / (p[16].x - p[0].x);

/** Ancho de la boca (48–54) relativo al ancho de la cara (0–16); sube al sonreír. */
export const mouthRatio = (p: Point[]) =>
  dist(p[48], p[54]) / dist(p[0], p[16]);

/** Qué tan "de frente" está el rostro, para el fotograma de referencia. */
export const FRONTAL_TOLERANCE = 0.1;
/** Desplazamiento mínimo del giro respecto al centro para darlo por hecho. */
export const TURN_THRESHOLD = 0.12;
/** La boca debe ensancharse al menos un 10 % respecto al fotograma de frente. */
export const SMILE_GROWTH = 1.1;

export const isFrontal = (p: Point[]) =>
  Math.abs(yawRatio(p) - 0.5) <= FRONTAL_TOLERANCE;

/** ¿El fotograma `frame` muestra el gesto pedido, comparado con el de frente? */
export function challengeMet(
  challenge: Challenge,
  frame: Point[],
  neutral: Point[],
): boolean {
  switch (challenge) {
    case 'TURN_LEFT':
      return yawRatio(frame) >= 0.5 + TURN_THRESHOLD;
    case 'TURN_RIGHT':
      return yawRatio(frame) <= 0.5 - TURN_THRESHOLD;
    case 'SMILE':
      return mouthRatio(frame) >= mouthRatio(neutral) * SMILE_GROWTH;
  }
}

export const CHALLENGE_LABELS: Record<Challenge, string> = {
  TURN_LEFT: 'girar la cabeza a la izquierda',
  TURN_RIGHT: 'girar la cabeza a la derecha',
  SMILE: 'sonreír',
};

/** Dos gestos distintos en orden aleatorio: no se puede grabar la respuesta de antemano. */
export function drawChallenges(random: () => number = Math.random) {
  const pool = [...CHALLENGES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 2);
}
