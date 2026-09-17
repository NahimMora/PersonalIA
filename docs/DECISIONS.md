# Decisiones técnicas

Registro breve de decisiones no triviales tomadas durante la construcción.
Formato: decisión → alternativas → por qué.

## 2026-09-17 — Actividades: una sesión activa a la vez

**Decisión:** solo puede existir una `ActivitySession` sin `endedAt` en todo
momento. Iniciar una nueva actividad cierra automáticamente la anterior
(`lib/services/activities.ts`).

**Alternativas:** permitir sesiones paralelas por proyecto/módulo.

**Por qué:** el sistema es para una sola persona; en la práctica no se "programa"
y se está "en una reunión" de forma medible simultáneamente. Una sola sesión
activa es más simple de mostrar en la UI (un solo indicador) y evita que
sesiones olvidadas sigan corriendo indefinidamente en paralelo.

## 2026-09-17 — Proyecto "Inbox" como fallback de capturas

**Decisión:** toda captura rápida que no matchea ningún alias configurado cae
en un proyecto especial `INBOX` en vez de fallar o quedar sin proyecto.

**Alternativas:** permitir `projectId` nulo en `Item`; bloquear la captura pidiendo elegir proyecto.

**Por qué:** el requerimiento explícito es "la captura tiene que requerir la
menor cantidad de pasos posible". Bloquear para pedir proyecto rompe eso.
Dejar `projectId` nulo complica todas las queries y vistas por proyecto. Un
proyecto real llamado Inbox es simple y reclasificable después.

## 2026-09-17 — Sync de GitHub: solo documentos, extracción conservadora

**Decisión:** el sync solo lee `README.md`, `CLAUDE.md`, `AGENTS.md`,
`CONTRIBUTING.md` y `docs/**/*.md`, nunca el código. La extracción de items
pendientes desde `BUGS.md`/`BACKLOG.md`/`INCIDENTS.md`/`ROADMAP.md` solo
reconoce checklists (`- [ ] texto`) dentro de una sección
"Pendientes"/"Pending" — nunca prosa libre.

**Alternativas:** usar IA para interpretar cualquier formato de documentación.

**Por qué:** procesar repos completos con IA en cada sync viola el principio
de costo bajo ("no procesar repos completos en cada consulta"). Un parser
determinístico y conservador es gratis, predecible, y documentado
(`docs/GITHUB_INTEGRATION.md`) para que el usuario sepa qué convención seguir.

## 2026-09-17 — Ids humanos vía contador por (proyecto, tipo)

**Decisión:** `ItemSequence` guarda un contador por `(projectId, itemType)`,
incrementado con `upsert` dentro de la misma transacción que crea el `Item`.

**Alternativas:** contador global por proyecto (sin separar por tipo); UUID corto random.

**Por qué:** el pedido explícito es `HS-BUG-0014`, `HS-IDEA-0021` — cada tipo
con su propia numeración. El `upsert` toma el row lock de Postgres, así que es
seguro ante creaciones concurrentes (cubierto por test de integración).

## 2026-09-17 — Auth: Credentials + JWT sobre tabla `users`

**Decisión:** un solo proveedor (email+password) contra la tabla `users`,
sesión JWT (sin tabla de sesiones).

**Alternativas:** OAuth de terceros (Google), Clerk/Auth0.

**Por qué:** cero dependencias externas para algo que hoy es un solo usuario.
Como los credenciales viven en una tabla real (no hardcodeados), agregar más
usuarios en el futuro es solo insertar filas — no requiere migrar de sistema.
