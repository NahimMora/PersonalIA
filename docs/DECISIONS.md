# Decisiones técnicas

Registro breve de decisiones no triviales tomadas durante la construcción.
Formato: decisión → alternativas → por qué.

## 2026-09-17 — App forzada a render dinámico; migraciones corren en el arranque, no en el build

**Decisión:** `app/layout.tsx` exporta `export const dynamic = "force-dynamic"`
(cascada a toda la app). `package.json`: `"build"` solo corre `prisma generate
&& next build`; `"start"` corre `prisma migrate deploy && next start`.

**Contexto real:** el primer deploy a Hostinger falló porque `prisma migrate
deploy` (entonces parte del build) no encontraba `DATABASE_URL` — el paso de
build de Hostinger no tiene garantizado acceso a las variables de entorno del
panel de la Node.js Web App (esas se inyectan al proceso que corre `npm
start`, no al que corre el build). Investigando más, `next build` **también**
fallaba sin `DATABASE_URL`, porque intentaba pre-renderizar páginas que leen
Prisma directamente en Server Components (el dashboard, el `TopBar` con la
actividad en curso, etc.) — Next.js las trataba como estáticas por default.

**Alternativas:** conseguir que Hostinger exponga `DATABASE_URL` en build
(depende de configuración de su panel, no confiable); marcar página por
página como dinámica en vez de toda la app.

**Por qué esta:** ninguna página de este sistema debería ser estática nunca —
es un dashboard personal autenticado con datos que cambian todo el tiempo, no
hay nada que valga la pena cachear en build. Forzarlo a nivel de layout raíz
es una sola línea y elimina la clase entera de problema (cualquier página
nueva que use Prisma queda cubierta automáticamente). Mover `migrate deploy`
al arranque es seguro porque es idempotente (no hace nada si no hay
migraciones pendientes) y así solo necesita `DATABASE_URL` en el momento en
que Hostinger garantiza que está disponible.

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
incrementado atómicamente dentro de la misma transacción que crea el `Item`
usando `INSERT ... ON DUPLICATE KEY UPDATE lastValue = LAST_INSERT_ID(...)`
(`lib/ids.ts`) — la primitiva de MySQL para "upsert y devolver el valor nuevo"
en una sola sentencia.

**Alternativas:** contador global por proyecto (sin separar por tipo); UUID
corto random; `prisma.itemSequence.upsert()` (el helper de alto nivel de Prisma).

**Por qué:** el pedido explícito es `HS-BUG-0014`, `HS-IDEA-0021` — cada tipo
con su propia numeración. El `upsert()` de Prisma sobre MySQL **no** es una
sola sentencia atómica (hace SELECT y después INSERT/UPDATE), así que bajo
concurrencia real dos requests pueden ver "no existe la fila" al mismo tiempo
y uno de los dos vuela con un error de constraint único en vez de esperar de
forma segura — esto se detectó con el test de concurrencia de
`tests/items.integration.test.ts` al migrar de Postgres (donde sí funcionaba,
ver más abajo) a MySQL. El SQL crudo con `ON DUPLICATE KEY UPDATE` sí es
atómico en InnoDB y quedó cubierto por el mismo test.

## 2026-09-17 — Base de datos: MySQL en vez de PostgreSQL

**Decisión:** se migró todo el schema de PostgreSQL a MySQL 8 (Prisma, Docker
Compose, migraciones) después de construir la primera versión sobre Postgres.

**Alternativas:** mantener Postgres y buscar un proveedor gestionado (Neon,
Supabase) solo para esta app; usar SQLite.

**Por qué:** la infraestructura real disponible del usuario es un plan
compartido de Hostinger ("Node.js Web App"), que solo ofrece MySQL — no
Postgres ni la posibilidad de correr Docker — y es el mismo tipo de hosting
que ya usa para `lavozriojana-news-app`. Meter un Postgres gestionado externo
solo para esta app suma una dependencia y un costo que el resto del sistema
no necesita, en contra del principio de "reducir dependencia de servicios
externos". Migrar el schema de vuelta si algún día hay un VPS propio es
mecánico (Prisma no tiene features de Postgres irremplazables acá); lo único
que hubo que ajustar: campos `String` largos necesitan `@db.Text` explícito
(MySQL trunca a VARCHAR(191) por default vía Prisma), el filtro
`mode: "insensitive"` de Prisma no existe en MySQL (no hace falta: la
collation default `utf8mb4_unicode_ci` ya es case-insensitive), y el contador
de ids (ver decisión de arriba) necesitó SQL crudo para seguir siendo atómico.

## 2026-09-17 — Auth: Credentials + JWT sobre tabla `users`

**Decisión:** un solo proveedor (email+password) contra la tabla `users`,
sesión JWT (sin tabla de sesiones).

**Alternativas:** OAuth de terceros (Google), Clerk/Auth0.

**Por qué:** cero dependencias externas para algo que hoy es un solo usuario.
Como los credenciales viven en una tabla real (no hardcodeados), agregar más
usuarios en el futuro es solo insertar filas — no requiere migrar de sistema.
