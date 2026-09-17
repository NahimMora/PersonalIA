# API

Todas las rutas viven bajo `app/api/**/route.ts`. Dos familias de autenticación:

- **Web** (`/api/*` salvo `/api/auth` y `/api/shortcuts`): requiere sesión de
  Auth.js (cookie). Sin sesión → `401`. Ver `proxy.ts`.
- **Shortcuts** (`/api/shortcuts`): requiere `Authorization: Bearer <token>`
  con un token generado desde Ajustes → Tokens. Ver `docs/SHORTCUTS_FUTURE.md`.

Respuestas de error: `{ "error": "mensaje" }` con status HTTP apropiado
(`400`/`401`/`404`/`422`/`500`). Ver `lib/api-helpers.ts`.

## Proyectos y módulos

- `GET /api/projects` — lista proyectos no archivados con conteo de pendientes.
- `POST /api/projects` — `{ workspaceId, name, code, description? }`.
- `GET /api/projects/:id` — detalle: proyecto, módulos, pendientes/ideas/incidentes/backlog/resueltos/descartados.
- `POST /api/modules` — `{ projectId, name }`.

## Items

- `GET /api/items?projectId=&moduleId=&status=&type=&priority=&q=` — lista filtrada.
- `POST /api/items` — creación manual `{ projectId, moduleId?, type, title, description?, priority? }`.
- `PATCH /api/items/:id` — `{ title?, description?, priority?, status?, moduleId? }`. Cambiar `status` a `RESOLVED`/`DISCARDED` setea `resolvedAt`/`discardedAt`; volver a `PENDING`/`IN_PROGRESS` los limpia.

## Captura

- `POST /api/captures` — captura rápida, sin IA. `{ text, source? }` → crea `Capture` + `Item` en un paso (clasificación determinística, cae en Inbox si no matchea nada).
- `POST /api/captures/interpret` — captura revisada, paso 1: `{ text }` → crea `Capture` (PENDING_REVIEW) + pide sugerencia a la IA (`AIInterpretation`). Si `GEMINI_API_KEY` no está configurada, responde `{ aiAvailable: false }`.
- `POST /api/captures/:id/reinterpret` — vuelve a pedirle a la IA una sugerencia para la misma captura.
- `POST /api/captures/:id/confirm` — `{ projectId, moduleId?, type, priority, title, description? }` → crea el `Item` final y marca la captura como `CONFIRMED`.
- `POST /api/captures/:id/discard` — marca la captura como `DISCARDED`, no crea Item.

## Actividades

- `POST /api/activities/start` — `{ projectId, moduleId?, label? }`. Cierra cualquier actividad en curso antes de abrir la nueva (ver `docs/DECISIONS.md`).
- `POST /api/activities/stop` — `{ activityId? }` (por defecto, la actividad en curso).
- `GET /api/activities/current` — actividad activa o `{ activity: null }`.

## Quick events

- `POST /api/events` — `{ eventType, value?, unit?, projectId?, metadata? }`.

## Búsqueda

- `GET /api/search?q=` — busca por `publicId` exacto (case-insensitive) y por texto en título/descripción de items, y por nombre/código de proyecto.

## Chat

- `POST /api/chat` — `{ message, projectId?, conversationId? }`. El contexto pasado a la IA se arma con SQL determinístico (pendientes + resueltos recientes del proyecto, o global si no se especifica) — nunca se manda la base completa ni repos completos. Ver `docs/AI.md`.

## GitHub

- `GET/POST /api/repositories` — listar/crear repos configurados. El token nunca se manda en el body: se guarda el *nombre* de la env var (`tokenEnvVar`).
- `POST /api/repositories/:id/sync` — sync manual (bajo demanda).
- `POST /api/github/webhook` — receptor de webhooks de GitHub (push). Autenticado por firma HMAC (`X-Hub-Signature-256`) contra `webhookSecretEnvVar`, no por sesión — está excluido del middleware de auth.

## IA / costos

- `GET /api/ai/usage` — últimas 200 llamadas a IA con tokens y costo estimado.

## Tokens personales (Shortcuts/NFC)

- `GET/POST /api/tokens` — listar/crear tokens del usuario autenticado. El valor en texto plano solo se devuelve una vez, en la respuesta del `POST`.
- `DELETE /api/tokens/:id` — revoca (no borra) un token.

## Shortcuts (un solo endpoint, ver docs/SHORTCUTS_FUTURE.md)

- `POST /api/shortcuts` — body con `action`: `capture` | `activity_start` | `activity_stop` | `event` | `chat`. Reutiliza exactamente los mismos `lib/services/*` que las rutas web.
