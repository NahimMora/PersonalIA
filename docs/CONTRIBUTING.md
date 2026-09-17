# Contribuir (incluye reglas para Claude Code)

Este es un proyecto personal — estas reglas son sobre todo para mantener
coherencia cuando se retoma el trabajo (vos o un agente) meses después.

## Antes de tocar código

```bash
git status
git branch
git log --oneline -10
```

Leer `CLAUDE.md` completo si existe (sí existe, es este mismo árbol de docs).

## Estilo

- TypeScript estricto (`tsc --noEmit` sin errores antes de dar por terminado un cambio).
- `npm run lint` sin errores.
- Sin comentarios que expliquen "qué" hace el código (los nombres ya lo dicen) — solo "por qué", cuando no es obvio.
- Server Components por defecto; `"use client"` solo cuando hace falta interactividad.

## Antes de dar algo por terminado

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

## Documentación — cuándo actualizar qué

- **Bug real que queda pendiente** (no uno trivial resuelto en el momento) →
  crear un `Item` tipo `BUG` en el proyecto correspondiente (vía captura o
  `POST /api/items`), no un archivo Markdown suelto.
- **Decisión de arquitectura relevante** → una entrada nueva en `docs/DECISIONS.md` (formato: decisión → alternativas → por qué).
- **Cambio de arquitectura** (nueva entidad, nuevo flujo) → actualizar `docs/ARCHITECTURE.md` y/o `docs/DATA_MODEL.md`.
- **Detalle trivial arreglado al toque** → nada, no generar burocracia.
- **Trabajo sobre un Item con id conocido** (`HS-BUG-0014`, etc.) → referenciarlo en el mensaje de commit: `fix: ... [HS-BUG-0014]`.

## Migraciones

- `npm run db:migrate` en desarrollo (genera + aplica).
- `npm run db:deploy` en producción (solo aplica, no genera).
- Nunca editar una migración ya aplicada en producción — crear una nueva.
