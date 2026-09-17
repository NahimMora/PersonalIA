# Integración con GitHub

## Autenticación

Cada repositorio configurado (`Repository.tokenEnvVar`) usa un **fine-grained
personal access token** con el mínimo permiso necesario:

- **Contents:** Read-only
- **Metadata:** Read-only

El token **nunca se guarda en la base de datos ni en el repo**. Solo se
guarda el *nombre* de la variable de entorno que lo contiene (por defecto
`GITHUB_TOKEN`). Esto permite:

- Usar un token distinto por organización/repo si hace falta (definí
  `GITHUB_TOKEN_HOLASALTA`, `GITHUB_TOKEN_LVR`, etc. y apuntá cada repo a la
  variable correspondiente al conectarlo desde Ajustes → Repositorios).
- Rotar o revocar sin tocar la base de datos.

Los repos privados siguen siendo privados — esta integración solo lee, nunca
cambia visibilidad ni permisos.

## Qué sincroniza

Solo documentación, nunca código fuente completo (ver `docs/DECISIONS.md`):

- `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`
- todo `docs/**/*.md`

El sync (`lib/github/sync.ts`) usa la Git Trees API para listar el árbol del
branch por defecto y compara el **blob sha** de cada archivo con el guardado
en `repository_documents` — si no cambió, no se vuelve a descargar el
contenido. Esto evita "procesar el repo completo en cada consulta".

## Extracción de items pendientes

Si el repositorio está asociado a un `Project`, el sync intenta extraer items
pendientes de `BUGS.md`, `BACKLOG.md`, `INCIDENTS.md` y `ROADMAP.md` con una
convención deliberadamente simple (`lib/github/docs-parser.ts`):

```markdown
## Pendientes

- [ ] Título del bug o tarea
- [ ] Otro pendiente [HS-BUG-0012]   <- si ya tiene un id conocido, no se duplica
```

- Solo se leen checklists (`- [ ] ...`) dentro de una sección cuyo heading
  contenga "Pendientes"/"Pending"/"Abiertos"/"Open".
- Los checkboxes marcados (`- [x]`) se ignoran — se asume que lo resuelto se
  movió a `CHANGELOG.md` o a una sección de resueltos.
- `DECISIONS.md` es la excepción: todas sus viñetas se consideran (no hay
  distinción pendiente/resuelto para decisiones).
- Si una línea ya referencia un id conocido (`[HS-BUG-0012]`) y ese Item
  existe, no se crea uno nuevo — se asume que ya está trackeado.
- Si no hay id y el título coincide exactamente con un Item ya existente
  (mismo proyecto, mismo tipo, no descartado), tampoco se duplica.

Esto es intencionalmente conservador: **nunca interpreta prosa libre con IA**
para no encarecer ni volver impredecible el sync. Si tu `BUGS.md` no sigue
esta convención, el sync igual guarda el documento completo (queda accesible
en la pestaña "Documentación" del proyecto) pero no crea Items automáticamente.

## Disparadores de sync

1. **Manual:** botón "Sincronizar" en Ajustes → Repositorios (`POST /api/repositories/:id/sync`).
2. **Webhook (recomendado):** configurá en GitHub → Settings → Webhooks:
   - Payload URL: `https://tu-dominio/api/github/webhook`
   - Content type: `application/json`
   - Secret: un valor random, guardado en una env var (ej. `GITHUB_WEBHOOK_SECRET`), y `Repository.webhookSecretEnvVar` apuntando a esa variable.
   - Evento: solo `push`.

   El endpoint verifica la firma HMAC-SHA256 antes de hacer nada (no hay
   auth de sesión en esta ruta — está excluida del middleware a propósito).
   Solo dispara sync si el push fue al branch por defecto configurado.

No hay polling periódico: sin webhook configurado, el sync es 100% manual.
Esto es deliberado para no gastar cuota de API ni CPU sin necesidad.

## Relación Item ↔ commit

`ItemCommitLink` guarda la relación entre un Item y el commit que lo resolvió,
para cuando Claude Code (u otra persona) commitea con el id en el mensaje:

```
fix: prevent duplicate posts [HS-BUG-0142]
```

Hoy esa relación no se crea automáticamente (requeriría escuchar el evento
`push` y parsear mensajes de commit) — ver "Pendientes reales" en el informe
final. El modelo ya está preparado para cuando se implemente.
