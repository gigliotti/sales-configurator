/**
 * Registro global de captura de la escena 3D.
 *
 * El Viewport3D registra aquí (al montar) una función que renderiza el canvas
 * y devuelve un data URL PNG; cualquier módulo (PDF, guardado de miniaturas,
 * etc.) puede llamar a captureScene() sin acoplarse a react-three-fiber.
 * Si no hay escena montada, captureScene devuelve null.
 */

export type SceneCaptureFn = (opts?: { width?: number; height?: number }) => string | null;

let currentCaptureFn: SceneCaptureFn | null = null;

/** Registra (o desregistra con null) la función de captura de la escena activa. */
export function registerSceneCapture(fn: SceneCaptureFn | null): void {
  currentCaptureFn = fn;
}

/** Captura la escena 3D montada como data URL PNG, o null si no hay escena. */
export function captureScene(opts?: { width?: number; height?: number }): string | null {
  if (!currentCaptureFn) return null;
  try {
    return currentCaptureFn(opts);
  } catch (err) {
    console.error('[sceneCapture] Error capturando la escena 3D:', err);
    return null;
  }
}
