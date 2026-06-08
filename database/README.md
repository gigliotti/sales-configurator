# Database — Configurador 3D de Paletizado Verbruggen

Esta aplicación es un **Configurador 3D de Sistemas de Paletizado** diseñado específicamente para Verbruggen.

### ¿Para qué sirve esta aplicación?
En términos sencillos, la aplicación permite diseñar y cotizar de forma visual e interactiva (en 3D) líneas de paletizado completas (la maquinaria y cintas transportadoras que organizan sacos, cajas o productos en palets de forma automática para su distribución).

Con esta herramienta se puede:
* **Diseñar visualmente:** Armar y conectar diferentes componentes (paletizadores, cintas transportadoras, envolvedoras de film, dispensadores de palets vacíos, etc.) en un espacio interactivo 3D.
* **Cotizar proyectos:** Calcular el costo estimado del sistema de manera automática a medida que se agregan o quitan componentes.
* **Gestionar versiones:** Crear y guardar múltiples propuestas o alternativas de diseño para cada cliente.
* **Administrar el catálogo:** Mantener actualizado el catálogo de maquinaria, precios, archivos 3D y especificaciones técnicas de los componentes.
* **Compartir y colaborar:** Permitir que los vendedores diseñen propuestas y las compartan con los clientes para su visualización y aprobación.

---

## Stack
- **Supabase** (PostgreSQL 15+)
- **Supabase Auth** (email/password, magic link)
- **Row Level Security** (RLS) para control de acceso por roles

## Estructura

```
database/
├── migrations/          # Archivos SQL ejecutados en orden
│   ├── 001_lookup_tables.sql        # Tablas enum (transport, product, location, etc.)
│   ├── 002_base_components.sql      # Tabla base de componentes (arquitectura híbrida)
│   ├── 003_component_specs.sql      # Tablas de extensión por tipo de componente
│   ├── 004_configurations.sql       # Accesorios y configuraciones opcionales
│   ├── 005_3d_and_connections.sql   # Puntos de conexión 3D
│   ├── 006_users_and_projects.sql   # Usuarios, proyectos, líneas, versiones
│   ├── 007_i18n.sql                 # Traducciones multi-idioma
│   └── 008_rls_policies.sql         # Row Level Security policies
├── seed/                # Datos iniciales
│   └── 001_catalog_data.sql         # Catálogo completo de componentes Verbruggen
└── README.md
```

## Cómo ejecutar

### Opción 1: Supabase Dashboard
1. Ir a **SQL Editor** en el dashboard de Supabase
2. Ejecutar cada archivo de `migrations/` en orden (001, 002, ..., 008)
3. Ejecutar `seed/001_catalog_data.sql` para cargar el catálogo

### Opción 2: Supabase CLI
```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar (si no existe)
supabase init

# Ejecutar migraciones
supabase db push
```

### Opción 3: psql directo
```bash
psql $DATABASE_URL -f database/migrations/001_lookup_tables.sql
psql $DATABASE_URL -f database/migrations/002_base_components.sql
# ... etc
psql $DATABASE_URL -f database/seed/001_catalog_data.sql
```

## Arquitectura Híbrida

El esquema usa un patrón de **herencia por tabla**:

```
components (tabla base)
├── palletizer_specs
├── conveyor_specs
├── wrapper_specs
├── manipulator_specs
├── turn_unit_specs
├── pallet_dispenser_specs
├── sheet_dispenser_specs
├── end_of_line_specs
├── collar_specs
└── main_frame_specs
```

Cada componente tiene un registro en `components` con campos comunes (code, name, price, model_3d) y un registro en su tabla de specs con campos específicos del tipo.

## Roles

| Rol | Catálogo | Proyectos | Traducciones |
|-----|----------|-----------|-------------|
| admin | CRUD | CRUD (todos) | CRUD |
| seller | Lectura | CRUD (propios) | Lectura |
| client | Lectura | Lectura (compartidos) | Lectura |

## Compatibilidad con sistema existente

El campo `model_id` en `components` mantiene compatibilidad con la tabla `module_configs` del sistema MariaDB existente. Los snap points se migran a `connection_points`.
