/**
 * Guía de la prueba de vida en el navegador. Solo sirve para orientar a la
 * persona y elegir el fotograma: la decisión la toma el servidor con sus propios
 * modelos. Los umbrales son algo más exigentes que los del backend
 * (backend/src/modules/biometrics/liveness.ts) para que lo que aquí se acepta
 * también pase allá.
 */

export type Challenge = "TURN_LEFT" | "TURN_RIGHT" | "SMILE";
export type LivenessPurpose = "IDENTITY" | "PASSWORD_RESET" | "APPLICATION";

export interface LivenessSession {
  sessionId: string;
  challenges: Challenge[];
  expiresAt: string;
}

/** Lo que se envía a la API: primero el fotograma de frente, luego uno por gesto. */
export interface LiveCapture {
  livenessSessionId: string;
  frames: string[];
}

interface Point {
  x: number;
  y: number;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** 0.5 = de frente; sube cuando la persona gira hacia SU izquierda (imagen sin espejo). */
export const yawRatio = (p: Point[]) => (p[30].x - p[0].x) / (p[16].x - p[0].x);
export const mouthRatio = (p: Point[]) => dist(p[48], p[54]) / dist(p[0], p[16]);

export const isFrontal = (p: Point[]) => Math.abs(yawRatio(p) - 0.5) <= 0.07;

export function challengeMet(challenge: Challenge, frame: Point[], neutral: Point[]) {
  switch (challenge) {
    case "TURN_LEFT":
      return yawRatio(frame) >= 0.5 + 0.15;
    case "TURN_RIGHT":
      return yawRatio(frame) <= 0.5 - 0.15;
    case "SMILE":
      return mouthRatio(frame) >= mouthRatio(neutral) * 1.14;
  }
}

export const CHALLENGE_COPY: Record<Challenge, { title: string; hint: string }> = {
  TURN_LEFT: { title: "Gira tu cabeza a la izquierda", hint: "Despacio, sin salir del óvalo" },
  TURN_RIGHT: { title: "Gira tu cabeza a la derecha", hint: "Despacio, sin salir del óvalo" },
  SMILE: { title: "Sonríe", hint: "Una sonrisa amplia, mostrando los dientes" },
};
