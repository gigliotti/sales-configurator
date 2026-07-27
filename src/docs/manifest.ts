// Manifiesto de documentos disponibles en el visor /docs.
// El contenido se inlinea en el bundle en tiempo de build (import ?raw de
// Vite), así que no hace falta servir los .md como archivos estáticos.
import readme from '../../README.md?raw';
import security from '../../SECURITY.md?raw';
import development from '../../DEVELOPMENT.md?raw';
import testing from '../../docs/TESTING.md?raw';
import catalogo from '../../docs/CATALOGO.md?raw';
import databaseReadme from '../../database/README.md?raw';

export interface DocEntry {
  slug: string;
  /** Clave i18n con fallback en español. */
  titleKey: string;
  titleFallback: string;
  content: string;
}

export const DOCS: DocEntry[] = [
  { slug: 'readme', titleKey: 'docs.nav_readme', titleFallback: 'Visión general', content: readme },
  { slug: 'development', titleKey: 'docs.nav_development', titleFallback: 'Flujo de desarrollo', content: development },
  { slug: 'security', titleKey: 'docs.nav_security', titleFallback: 'Seguridad', content: security },
  { slug: 'testing', titleKey: 'docs.nav_testing', titleFallback: 'Testing', content: testing },
  { slug: 'catalogo', titleKey: 'docs.nav_catalogo', titleFallback: 'Catálogo 3D', content: catalogo },
  { slug: 'database', titleKey: 'docs.nav_database', titleFallback: 'Base de datos', content: databaseReadme },
];

export const DEFAULT_DOC_SLUG = DOCS[0].slug;
