import React from 'react';

interface SceneErrorBoundaryProps {
  /** Contenido a renderizar si el hijo falla (p. ej. la caja industrial de fallback). */
  fallback: React.ReactNode;
  /**
   * Identificador del recurso protegido (p. ej. la ruta del GLB). Si cambia,
   * el boundary se resetea y reintenta renderizar los hijos.
   */
  resetKey?: string | null;
  children: React.ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary para modelos 3D dentro del <Canvas>: si un GLB está corrupto,
 * devuelve 404 o falla al renderizar, muestra el mesh de fallback en lugar de
 * tumbar el canvas completo. Loguea el error una sola vez por recurso.
 */
export class SceneErrorBoundary extends React.Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { hasError: false };

  private hasLogged = false;

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    if (!this.hasLogged) {
      const resource = this.props.resetKey ? ` (${this.props.resetKey})` : '';
      console.error(
        `[SceneErrorBoundary] Fallo al cargar/renderizar el modelo 3D${resource}:`,
        error
      );
      this.hasLogged = true;
    }
  }

  componentDidUpdate(prevProps: SceneErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.hasLogged = false;
      this.setState({ hasError: false });
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default SceneErrorBoundary;
