# Mis apps

Portal de aplicaciones personales alojado en GitHub Pages.

## Aplicaciones activas
- **Mis cuentas:** `/mis-cuentas/`
- **Mis horarios:** `/horarios/`

## Backend
Las aplicaciones activas utilizan **Neon Auth** para iniciar sesión y **Neon Data API** para consultar y modificar PostgreSQL.

La configuración pública del portal está en `config.js`; MisCuentas utiliza `mis-cuentas/neon-config.js`. No introducir claves secretas en archivos publicados.

## Migración
La rama `migracion-neon-mis-cuentas` contiene la migración a Neon. Mantener la rama `main` y el proyecto antiguo sin cambios hasta completar las pruebas funcionales de inicio de sesión, lectura y escritura en ambas aplicaciones.

Los archivos y scripts con nombres `supabase` son respaldos/artefactos de la etapa anterior; no son la configuración usada por las aplicaciones activas.
