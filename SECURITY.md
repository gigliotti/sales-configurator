# Seguridad — sales-configurator

Este documento cubre: el incidente de exposición de secretos, cómo rotar credenciales, cómo purgar el historial de git y el modelo de seguridad de la aplicación.

---

## 1. INCIDENTE: `.env` commiteado con secretos

**Qué pasó**: el archivo `.env` — que contiene `VERCEL_TOKEN`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` — estuvo commiteado en el repositorio de GitHub `gigliotti/sales-configurator` **desde el commit inicial**.

**Estado actual**: el archivo ya se eliminó del índice y `.gitignore` lo excluye, **pero sigue presente en el historial de git**. Cualquiera con acceso al repositorio (o a un clon/fork) puede recuperar los valores con `git log -p -- .env`.

**Acciones requeridas**, en este orden:

1. Rotar el token de Vercel (sección 2) — es el secreto más sensible: permite desplegar y administrar el proyecto.
2. Rotar las claves de Supabase si se desea (sección 3) — la `anon key` es pública por diseño y está protegida por RLS, pero rotarla invalida las copias filtradas.
3. Purgar el `.env` del historial (sección 4).

## 2. Rotar el token de Vercel (obligatorio)

1. Entrar a **https://vercel.com/account/tokens**.
2. Localizar el token filtrado y **borrarlo** (Delete). Desde ese momento el token viejo deja de funcionar.
3. Crear un token nuevo (**Create Token**), con alcance limitado al equipo/proyecto si es posible, y copiarlo (solo se muestra una vez).
4. Actualizar el `.env` local:
   ```
   VERCEL_TOKEN=nuevo-token
   ```
5. Verificar que el deploy sigue funcionando: `npm run deploy`.

## 3. Rotar las claves de Supabase (recomendado)

1. Ir al **Dashboard de Supabase > Settings > API**.
2. En la sección de API keys, usar **rotate anon key** (y rotar también la `service_role` key si existiera la sospecha de que fue expuesta en algún momento; en este repo solo se usa la anon key).
3. Actualizar el `.env` local:
   ```
   VITE_SUPABASE_ANON_KEY=nueva-anon-key
   ```
4. Actualizar las variables de entorno del proyecto en **Vercel > Project > Settings > Environment Variables** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) y redesplegar.

Nota: la `anon key` está pensada para ser embebida en el cliente; la seguridad real la aportan las políticas RLS (sección 5). Rotarla es higiene, no urgencia.

## 4. Purgar `.env` del historial de git

> **Coordinar antes con todos los colaboradores**: la purga reescribe el historial completo. Nadie debe tener trabajo sin pushear, y tras la purga **todos los clones existentes quedan inválidos y deben re-clonarse** (no hacer `pull` sobre un clon viejo: reintroduce el historial contaminado).

Pasos exactos (desde un clon limpio y actualizado):

```bash
# 1. Instalar git-filter-repo
pip install git-filter-repo

# 2. Eliminar .env de TODO el historial
#    (filter-repo elimina el remote 'origin' como medida de seguridad)
git filter-repo --invert-paths --path .env --force

# 3. Volver a añadir el remote
git remote add origin https://github.com/gigliotti/sales-configurator.git

# 4. Forzar el push del historial reescrito a TODAS las ramas y tags
git push --force-with-lease origin --all
git push --force-with-lease origin --tags
```

Advertencias:

- Si el repositorio tiene ramas protegidas, desactivar temporalmente la protección para poder forzar el push.
- Los forks y clones existentes conservan el historial viejo: pedir a cada colaborador que borre su clon y re-clone. Si hay forks en GitHub, contactar al soporte de GitHub para purgar los datos cacheados (las PRs y forks pueden retener los blobs).
- La purga NO sustituye la rotación: aunque el historial quede limpio, los secretos ya se consideran comprometidos. **Rotar siempre primero.**

## 5. Modelo de seguridad de la aplicación

- **Row Level Security (RLS)**: todas las tablas tienen RLS activo. Las políticas (en `supabase/migrations/`) implementan los roles `admin` (CRUD total), `seller` (catálogo en lectura, CRUD de proyectos propios) y `client` (solo lectura de proyectos compartidos). El control de acceso se aplica en el servidor de base de datos, nunca solo en el cliente.
- **Header `x-active-profile-id` eliminado**: versiones anteriores enviaban el perfil activo como header HTTP que las políticas leían con `current_setting('request.headers', ...)`. Ese diseño era suplantable —cualquier cliente podía enviar el ID de otro perfil y las políticas lo aceptaban como identidad—, por lo que se eliminó en favor de resolver la identidad del lado del servidor (funciones `SECURITY DEFINER` y políticas basadas en la sesión), no de un header controlado por el cliente.
- **Share tokens**: los proyectos se comparten mediante `share_token` (generado con `crypto.randomUUID()`), que solo otorga **lectura** vía políticas RLS específicas. Los tokens tienen expiración: un enlace compartido deja de ser válido pasado su plazo, lo que limita la ventana de exposición si el enlace se reenvía o filtra. Revocar un enlace = regenerar/anular el token del proyecto.
- **Secretos**: `.env` está en `.gitignore` (junto con `.env.*` salvo `.env.example`). Nunca commitear valores reales; `.env.example` solo contiene placeholders.

## 6. Recomendación: secretos de deploy fuera de `.env`

`scripts/deploy.js` lee `VERCEL_TOKEN` del `.env` local, lo que concentra un secreto de infraestructura en un archivo que vive junto al código. Recomendado:

- **Deploy automático**: conectar el repositorio a Vercel (integración Git) o ejecutar el deploy desde CI usando **GitHub Actions Secrets** (`VERCEL_TOKEN` como secret del repositorio), de modo que el token nunca exista en máquinas de desarrollo.
- **Variables de la app**: definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Vercel > Settings > Environment Variables** en lugar de depender del `.env` local en el momento del build.
- `scripts/deploy.js` ya acepta `VERCEL_TOKEN` como variable de entorno del proceso, por lo que en CI no hace falta ningún `.env`.

## 7. Reportar vulnerabilidades

Si encuentras una vulnerabilidad (bypass de RLS, fuga de datos entre roles, tokens predecibles, etc.), no abras un issue público: contacta directamente al mantenedor del repositorio.
