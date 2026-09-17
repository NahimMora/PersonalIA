@AGENTS.md

# Segundo Cerebro — guía para Claude Code

Ver `README.md` para quickstart y el índice completo de `docs/`. Este archivo
es solo lo operativo para trabajar en el repo.

## Antes de tocar código

`git status`, `git branch`, `git log --oneline -10`. Leer este archivo
completo (ya lo estás haciendo) y `docs/CONTRIBUTING.md`.

## Validación antes de dar algo por terminado

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
```

`npm run test` incluye tests de integración contra MySQL (necesita
`docker compose up -d db` corriendo).

## Filosofía de documentación (ver docs/CONTRIBUTING.md para el detalle)

- Bug real que queda pendiente → crear un `Item` (no un `.md` suelto).
- Bug que estaba documentado y se resolvió → actualizar su `status` a `RESOLVED` vía `PATCH /api/items/:id`, no dejarlo en la lista de pendientes.
- Decisión de arquitectura relevante → entrada nueva en `docs/DECISIONS.md`.
- Cambio de arquitectura → actualizar `docs/ARCHITECTURE.md` / `docs/DATA_MODEL.md`.
- Detalle trivial arreglado al toque → nada, no generar burocracia.
- Trabajo sobre un Item con id conocido → referenciarlo en el commit: `fix: ... [HS-BUG-0014]`.

## Reglas de seguridad de este repo

- Nunca commitear `.env` ni valores reales de `GEMINI_API_KEY`, `GITHUB_TOKEN`, credenciales de R2, o `AUTH_SECRET`.
- Los tokens de GitHub se referencian por nombre de variable de entorno (`Repository.tokenEnvVar`), nunca por valor, en la base de datos.
- No hacer público ningún repositorio privado conectado.
- Migraciones: `prisma migrate dev` en desarrollo, `prisma migrate deploy` en producción — nunca editar una migración ya aplicada.

## Arquitectura en una línea

Un solo Next.js (App Router) sirve frontend + API. Lógica de negocio en
`lib/services/*`, reusada tanto por rutas web autenticadas como por
`/api/shortcuts`. Detalle completo en `docs/ARCHITECTURE.md`.
