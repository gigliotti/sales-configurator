# Testing — sales-configurator

Guía de la infraestructura de tests del proyecto: cómo ejecutarlos, cómo funciona el mock de Supabase y qué cubre cada nivel de la suite.

> Este documento sustituye a los antiguos `TEST_INFRA.md` y `TEST_READY.md`.

## 1. Cómo ejecutar los tests

Desde la raíz del repositorio:

```bash
# Suite completa (una pasada, como en CI)
npm run test

# Modo watch durante el desarrollo
npm run test:watch

# Vitest directo
npx vitest run
```

El script `test` usa `cross-env VITEST=true vitest run` para funcionar igual en Windows, macOS y Linux. La CI (`.github/workflows/ci.yml`) ejecuta `npm run test` en cada push y PR.

## 2. Framework y configuración

- **Vitest** (`vitest`): runner y aserciones compatibles con Jest, con soporte ESM nativo.
- **cross-env**: variables de entorno multiplataforma en los scripts de npm.
- **Configuración** en `vitest.config.ts`:
  - `environment: 'node'` con `globals: true`.
  - `setupFiles: ['./src/__tests__/setup.ts']` — se ejecuta antes de cada archivo de tests.
  - Alias `@` → `./src`.

### `src/__tests__/setup.ts`

El setup hace dos cosas:

1. Garantiza que `globalThis.crypto.randomUUID` exista en el entorno Node (el store lo usa para generar share tokens e IDs).
2. Registra el mock global del cliente Supabase: `vi.mock('../lib/supabaseClient', () => mockSupabase)`, de modo que **ningún test toca la base de datos real**.

## 3. Estrategia de mocking (`src/lib/__mocks__/supabaseClient.ts`)

La aplicación depende de Supabase para persistencia y autenticación, así que existe un mock de alta fidelidad que simula Postgres y el estado de auth en memoria:

- **Base de datos en memoria**: catálogo realista (p. ej. V-STACK 535, cintas transportadoras, dispensadores de láminas), perfiles de usuario (roles `admin` y `seller`) y lista de proyectos, sembrados al inicio de cada test.
- **Simulador de queries**: emula las cadenas de consulta de Supabase (`from().select().eq().single()`, inserts, updates, deletes) y devuelve **clones profundos** de los registros para que un test no pueda mutar las plantillas globales.
- **Simulación de auth y headers**: rastrea el perfil activo y los headers REST (p. ej. `x-share-token`) igual que el cliente real, lo que permite testear los flujos de compartir por token y de sesión.

## 4. Suites y arquitectura por niveles

Los tests viven en `src/__tests__/`:

| Archivo | Qué cubre |
| --- | --- |
| `e2e.test.ts` | Suite principal del store (93 tests) organizada en los niveles 1–4 de abajo |
| `catalogAdmin.test.ts` | Panel de administración del catálogo (CRUD de componentes) |
| `shareAndSave.test.ts` | Guardado de proyectos y compartición por share token |
| `adversarial.test.ts` | Casos adversariales de seguridad (intentos de bypass de reglas) |
| `replacement.test.ts` | Reemplazo de componentes en líneas existentes |

La suite principal se estructura en 4 niveles de rigor:

- **Nivel 1 — Cobertura de funcionalidades (R1–R8)**: correctitud de cada requisito: autenticación por roles, snapping por proximidad, carga de catálogo, soporte multilínea, cálculos de moneda y lógica de exportación a PDF.
- **Nivel 2 — Bordes y casos límite**: payloads vacíos de base de datos, validación de dimensiones extremas, límites de peso, guardados consecutivos y borrados en cascada.
- **Nivel 3 — Combinaciones entre features**: interfaces entre módulos, p. ej. restricción por rol que impide modificar el catálogo, y lookups de traducciones i18n sobre items de la base de datos.
- **Nivel 4 — Escenarios reales**: flujos completos de usuario (cotización de planta multilínea, vista de solo lectura por enlace compartido/anónimo, resiliencia ante errores de red y timeouts).

## 5. Verificación de estado del store (`storeProxy`)

Para evitar closures obsoletas y referencias a snapshots viejos en las aserciones sobre Zustand, los tests usan **`storeProxy`**: un `Proxy` global que envuelve `useConfiguratorStore.getState()`. Cada acceso a `store.<algo>` obtiene el estado más reciente, de modo que las aserciones verifican la transición real de estado y no una variable cacheada.

## 6. Checklist de salud de la suite

- La suite completa debe pasar en local (`npm run test`) y en CI antes de fusionar cualquier PR.
- Los mensajes de error que aparecen en `stderr` durante la ejecución (p. ej. `Error loading project: Error: Not found`) son **esperados**: corresponden a tests que verifican el manejo de errores y no indican fallos mientras el resumen final marque todos los tests en verde.
- Al añadir funcionalidades al store, añade tests en el nivel que corresponda y, si tocas el esquema de datos del mock, mantén el seed del mock alineado con las migraciones reales de `supabase/migrations/`.
