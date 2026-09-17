# Modelo de datos

Fuente de verdad: `prisma/schema.prisma`. Este documento explica el *porqué*
de las entidades, no repite los campos (leé el schema para eso).

## Jerarquía

```
Workspace → Project → Module (opcional)
```

Nada está hardcodeado: `Workspace`, `Project` y `Module` son filas de tabla,
creadas desde Ajustes → Proyectos o vía `POST /api/projects` /
`POST /api/modules`. El seed (`prisma/seed.ts`) solo inserta ejemplos
(HolaSalta, La Voz Riojana) para tener algo con qué probar — no son valores
especiales en el código.

## Item: la entidad universal

Bugs, ideas, tareas, notas, mejoras, incidentes, backlog, research, decisiones
y recordatorios son todos filas de `Item`, distinguidos por `type`. Se decidió
unificarlos (en vez de una tabla por tipo) porque comparten el mismo ciclo de
vida (`status`, `priority`, timestamps, proyecto/módulo, comentarios futuros)
y las consultas del dashboard/chat necesitan mezclarlos constantemente
("¿qué tengo pendiente en HolaSalta?" no distingue bug de tarea a priori).

`ItemType` es un enum nativo de MySQL (no una tabla `ItemType`) porque el pedido
explícito es "extensible" pero con una lista conocida — agregar un tipo nuevo
es una migración de una línea, no justifica una tabla de catálogo.

## Ids humanos

`Item.publicId` (`HS-BUG-0014`) se genera con `lib/ids.ts` +
`ItemSequence` (contador por proyecto+tipo). Es único a nivel de toda la base,
así que sirve como clave de búsqueda universal (`GET /api/search?q=HS-BUG-0014`)
y para referenciarlo en commits (`fix: ... [HS-BUG-0014]`).

## Fuente (`ItemSource`) — por qué no se fusiona con `Item`

Una captura personal ("el botón no responde") y un bug que Claude Code detectó
en `BUGS.md` **no son el mismo hecho** hasta que alguien lo confirma. Por eso:

- `Capture` (lo que el usuario tipeó/dictó) es una entidad separada de `Item`.
- `Item.source` indica de dónde salió, pero nunca se auto-fusionan dos items
  de fuentes distintas — eso queda para que el usuario (o Claude Code)
  lo decida explícitamente.

## Aliases

`Alias` mapea texto libre ("hola salta", "hs", "holasalta") a un proyecto o
módulo. Es la base de la clasificación determinística (`lib/classify.ts`):
si el texto de una captura contiene un alias conocido, se resuelve sin llamar
a la IA. Configurable desde el seed o insertando filas directamente — no hay
UI dedicada todavía (pendiente real, ver informe final).

## Adjuntos y R2

`Attachment` guarda solo la referencia (`storageKey`, tamaño, tipo) — el
archivo vive en Cloudflare R2. `ephemeral: true` (default) es para audio
temporal que se transcribe y se borra; `false` para adjuntos que el usuario
quiere conservar.

## Auditoría y uso de IA

`AuditEvent` y `AiUsageLog` son tablas de solo inserción (append-only), sin
relaciones complejas — no es event sourcing, es un log para la vista de
auditoría/costos.
