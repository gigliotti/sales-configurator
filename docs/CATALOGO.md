# Catálogo de componentes — auditoría y trazabilidad

Documenta la relación entre las tres fuentes de verdad del catálogo y el
resultado de la auditoría del **24/07/2026**.

| Fuente | Qué es | Dónde |
|---|---|---|
| **Planilla maestra** | Datos de ingeniería de Verbruggen (16 hojas) | [Google Sheets](https://docs.google.com/spreadsheets/d/1Y7pKh1xHKxsAX3Z_XU79UWbBOVJkao9jKcNL2XEz_vQ/) · copia HTML en `Tablas BD/` |
| **Modelos 3D** | 55 archivos `.glb` (Git LFS) | `public/3d/` |
| **Base de datos** | 81 componentes + specs + compatibilidades | Supabase (`components`, `*_specs`, `*_compatibility`) |

---

## 1. Resultado de la auditoría

### 1.1 Compatibilidad entre módulos: **correcta** ✅

Se verificó fila por fila contra la planilla. Las tres tablas de compatibilidad
coinciden **exactamente** con la fuente:

| Tabla | Filas en BD | Filas en planilla | Estado |
|---|---:|---:|---|
| `infeed_palletizer_compatibility` | 20 | 20 | ✅ coincide |
| `main_frame_palletizer_compatibility` | 3 | 3 | ✅ coincide |
| `infeed_coupling_compatibility` | 28 | 28 | ✅ coincide |

**Infeed ↔ Paletizadora** (hoja *Infeed*, columna «Paletizadora compatible»):

| Infeed | Paletizadoras compatibles |
|---|---|
| `63283`, `77573`, `VE047112` | V-STACK 315, 320 |
| `VE046496` | V-STACK 535 |
| `VE078317` | V-STACK 745 |
| `VE033099` | V-STACK 965 |
| `VE039472` | V-STACK 410 |
| `VE036791` | V-STACK 618, 620 |
| `VE045438`, `VE035595`, `VE037995`, `VE036874` | V-STACK 630, 640 |

**MainFrame ↔ Paletizadora** (hoja *MainFrame*): `VE054362` → V-STACK 620, 630, 640.

> **Nota sobre las variantes «C».** La planilla lista `V-STACK 618C / 620C / 630C / 640C`
> en las listas de compatibilidad, pero esas variantes **no existen** como producto en la
> hoja *Paletizadoras* (solo están las versiones sin «C»). La BD las mapea a la versión
> base correspondiente, que es la interpretación coherente con el catálogo.

### 1.2 Modelos 3D: **7 paletizadoras sin modelo** ❌ → corregido

Hallazgo principal: **7 de las 10 paletizadoras tenían `model_path = NULL`**
aunque su archivo `.glb` sí existía en el repositorio. En el editor 3D se
dibujaban como una caja gris de reemplazo en vez del modelo real.

Corregido en la migración `20260724110000_catalog_model_paths.sql`:

| Componente | Código ERP | Modelo asignado |
|---|---|---|
| V-STACK 315 | `VE069108` | `/3d/Palletizer/v-stack_315.glb` |
| V-STACK 320 | `VE052439` | `/3d/Palletizer/v-stack_320.glb` |
| V-STACK 618 | `VE073550` | `/3d/Palletizer/v-stack_618.glb` |
| V-STACK 620 | `VE060827` | `/3d/Palletizer/v-stack_620.glb` |
| V-STACK 640 | `VE090533` | `/3d/Palletizer/v-stack_640.glb` |
| V-STACK 745 | `VE072508` | `/3d/Palletizer/v-stack_745.glb` ⚠️ 110 MB |
| V-STACK 965 | `VE047011` | `/3d/Palletizer/v-stack_965.glb` |
| VAW-1 (wrapper) | — (sin código) | `/3d/Wrapper/vaw-_1/vaw-_1.glb` |

**Antes:** 46/81 componentes con modelo · 9 `.glb` huérfanos (146 MB sin usar).
**Después:** 54/81 con modelo · **1** huérfano · 0 rutas rotas.

### 1.3 Convención de nombres de los `.glb`

El código ERP va embebido en el nombre del archivo, con tres patrones:

```
RollerConveyor_VE054374.glb   → VE054374   (prefijo de familia + código)
PalletDispenser_7200-5004.glb → 7200.5004  (el punto del código es un guion)
v-stack_535.glb               → V-STACK 535 (paletizadoras: por nombre)
```

Irregularidades detectadas (los archivos funcionan; se documentan para evitar
confusión al agregar componentes):

| Archivo | Código en planilla | Observación |
|---|---|---|
| `PalletDispenser_VE0060979.glb` | `VE060979` | cero de más en el nombre del archivo |
| `Conveyor_VE54815.glb` | — | falta el cero (`VE054815`); no está en la planilla |
| `LightCurtain_VE52199.glb` | — | falta el cero (`VE052199`); no está en la planilla |
| `v-weight_500.glb` | `V-WEIGH 500` | el archivo dice «weight», el producto «WEIGH» |

---

## 2. Cobertura por tipo de componente

| Tipo | En planilla | En BD | Con modelo 3D |
|---|---:|---:|---:|
| palletizer | 10 | 10 | **10** ✅ |
| conveyor | 13 | 16¹ | 13 |
| infeed | 12 | 13¹ | 2 |
| manipulator | 3 | 3 | 0 |
| wrapper | 8² | 9 | 5 |
| turn_unit | 2 | 2 | 2 |
| pallet_dispenser | 6 | 6 | 6 |
| sheet_dispenser | 4 | 4 | 2 |
| end_of_line | 3 | 3 | 3 |
| collar | 3 | 3 | 0 |
| main_frame | 1 | 1 | 0 |
| safety / platform / support_frame | — | 11¹ | 11 |

¹ La BD incluye componentes de la categoría «Otros» (vallado, cortinas de luz,
plataformas, puentes, bastidores) que **no están en la planilla**: son módulos
auxiliares que solo aportan modelo 3D a la escena.
² Sin contar `VAW-NF-NC` / `VAW-NF20` — ver § 3.

Las tablas de specs están completas respecto de la planilla: `palletizer_specs`
(10), `conveyor_specs` (13), `manipulator_specs` (3), `turn_unit_specs` (2),
`pallet_dispenser_specs` (6), `sheet_dispenser_specs` (4), `end_of_line_specs` (3),
`collar_specs` (3), `main_frame_specs` (1), `conveyor_accessories` (7),
`turn_unit_configurations` (5), `main_frame_configurations` (6).

---

## 3. Preguntas abiertas (requieren decisión de negocio)

No se modificó la BD en estos puntos porque la planilla misma es ambigua:

1. **`VAW-NF-NC` (`7500.2202`) y `VAW-NF20` (`7500.2203`)** aparecen en la hoja
   *Wrappers* bajo una nota manuscrita: *«Los complementos van?»*. Están en la
   planilla pero **no en la BD**. ¿Son wrappers vendibles o accesorios de otro
   módulo? Si van, se agregan como componentes de tipo `wrapper`.

2. **`ChainWrapper_VE045490.glb`** (6,3 MB) es el único `.glb` huérfano que
   queda. El código `VE045490` corresponde al wrapper **VTW**, que en la BD ya
   apunta a `/3d/Wrapper/vtw/vtw.glb`. La planilla lista VTW en dos variantes de
   transporte (RODILLO y CADENA) pero la BD tiene un solo componente VTW.
   ¿Conviene desdoblarlo en VTW-RC / VTW-CC, cada uno con su modelo?

3. **`7500.2101` (VAW Wrapper)** está en la BD con modelo 3D pero **no aparece
   en la planilla**. ¿Se mantiene o se da de baja?

---

## 4. Deuda técnica: el modelo de 110 MB

`v-stack_745.glb` pesa **110 MB** — más que todo el resto del catálogo junto
(~150 MB en 54 archivos). Ahora que está asignado, seleccionar la V-STACK 745
en el editor dispara una descarga de 110 MB.

Contexto: el resto de los modelos ya vienen comprimidos con Draco, así que
recomprimir no ayuda (probado: `meshopt` lo agrandaba). En este archivo el peso
lo dominan las **texturas**, no la geometría.

Recomendación antes de exponerlo a vendedores: redimensionar texturas (2048 →
1024) y/o decimar la malla con `@gltf-transform/cli`. Objetivo razonable: < 15 MB.

> **No borrar `v-stack_745.glb`.** Antes de esta auditoría parecía «peso muerto»
> porque ningún componente lo referenciaba — en realidad era un modelo válido al
> que le faltaba la asignación en la BD.

---

## 5. Cómo reproducir la auditoría

Los scripts usados están descritos aquí para poder repetirla cuando cambie la planilla:

1. **Descargar la planilla**: `GET https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx`
2. **Inventariar los `.glb`**: recorrer `public/3d/` y extraer el código del nombre
   con los tres patrones de § 1.3.
3. **Leer la BD**: `GET /rest/v1/components?select=id,code,name,component_type_id,model_path`
   (la lectura del catálogo es pública por diseño).
4. **Cruzar**: modelos huérfanos (en disco sin componente), `model_path` rotos
   (apuntan a un archivo inexistente) y componentes sin modelo pese a tener `.glb`.

Migración relacionada: `supabase/migrations/20260724110000_catalog_model_paths.sql`
(copia documental en `database/migrations/027_catalog_model_paths.sql`).
