# Decisiones técnicas

Registro breve de decisiones no triviales tomadas durante la construcción.
Formato: decisión → alternativas → por qué.

## 2026-09-18 — `.env` se carga a mano con código propio, sin paquete `dotenv`

**Decisión:** `lib/load-env.ts` implementa un parser de `.env` mínimo a mano
(sin depender del paquete `dotenv`) e importado como primera línea en
`lib/db.ts`, `lib/auth.ts` y `lib/storage/r2.ts`.

**Contexto real (dos capas de bug, ambas encontradas depurando el primer
deploy real):**
1. El `server.js` que autogenera Hostinger para su "Node.js Web App" llama a
   `next/dist/server/lib/start-server` directamente — nunca pasa por el CLI
   de `next`, que es quien normalmente carga `.env` vía `@next/env`. Ningún
   mecanismo de autocarga de Next.js se ejecuta nunca en este entorno, aunque
   el `.env` esté físicamente al lado de `server.js`.
2. El primer intento de arreglar esto con el paquete `dotenv` tampoco
   funcionó: Hostinger **borra el `package.json` de cada subpaquete dentro de
   `node_modules`** en el directorio que realmente sirve (confirmado por
   SSH). El punto de entrada real de `dotenv` es `lib/main.js`, resuelto vía
   `package.json#main` — sin ese archivo, `require("dotenv")` tira
   `MODULE_NOT_FOUND` aunque la carpeta del paquete exista.

**Alternativas:** mover `dotenv` a `dependencies` (no alcanza, ver punto 2);
convencer a Hostinger de no podar `node_modules` (no hay control sobre eso).

**Por qué esta:** un loader que es código fuente propio (compilado
directamente en el bundle del servidor, nunca un paquete suelto en
`node_modules`) es inmune a cualquier poda de `node_modules` que haga
Hostinger. `dotenv` sigue en `devDependencies` para los scripts que sí corren
en un `npm install` completo y normal (`tests/setup.ts`,
`scripts/register-repos.ts`, migraciones/seed manuales por SSH).

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

## 2026-09-18 — Cómo Hostinger realmente ejecuta esta app (y por qué `npm start` nunca corre)

**Hallazgo** (investigando por qué el admin nunca quedaba creado en producción):
el "Node.js Web App" de Hostinger para Next.js **no ejecuta `npm start`**. Su
pipeline real es:

1. Deploy (por push a `main`, automático): `npm install && npm run build`,
   registrado en `~/domains/<dominio>/hbuilds/logs/<id>/*.log`.
2. Para servir, genera su **propio `server.js`** en
   `~/domains/<dominio>/hbuilds/current/nodejs/server.js`, que llama
   directamente a `next/dist/server/lib/start-server` — nunca pasa por
   `package.json` → `"start"`. Por eso mover `prisma migrate deploy` a
   `"start"` (decisión de abajo, ya obsoleta) nunca se ejecutó en la
   práctica: hubo que correrlo a mano por SSH la primera vez.
3. El directorio servido (`hbuilds/current/nodejs/`, symlink a
   `hbuilds/versions/<build-id>/nodejs/`) **no incluye `prisma/`** ni los
   binarios de `prisma`/`tsx` (parecen podarse de `node_modules` después del
   build) — para correr comandos de Prisma a mano hace falta copiar
   `prisma/` desde `hbuilds/last-source/` y hacer un `npm install` completo
   en un directorio aparte (nunca dentro de `hbuilds/current`).
4. Las variables de entorno del panel se guardan en
   `~/domains/<dominio>/hbuilds/config/.env`, pero **ese archivo no se copia
   solo** al directorio que realmente se sirve — hay que copiarlo a mano a
   `hbuilds/current/nodejs/.env` (Next.js sí lo autocarga desde ahí) después
   de cada deploy nuevo, o esperar a que el próximo deploy lo incluya
   automáticamente (no confirmado que lo haga siempre).
5. Reinicio: tocar `hbuilds/current/nodejs/tmp/restart.txt` (convención
   estilo Passenger). Los procesos (`lsnode:...`) no quedan siempre
   residentes — LiteSpeed los levanta bajo demanda.

**Nodejs/npm no están en el PATH de una sesión SSH no interactiva** — usar
`/opt/alt/alt-nodejs22/root/usr/bin/{node,npm,npx}` directamente.

**Implicancia práctica:** después de cada deploy con cambios de schema o de
variables de entorno, hay que (por ahora, a mano, por SSH):
```bash
cp ~/domains/ops.moraapps.com/hbuilds/config/.env ~/domains/ops.moraapps.com/hbuilds/current/nodejs/.env
chmod 600 ~/domains/ops.moraapps.com/hbuilds/current/nodejs/.env
touch ~/domains/ops.moraapps.com/hbuilds/current/nodejs/tmp/restart.txt
```
y, si hubo migraciones nuevas, correr `prisma migrate deploy` desde un
workspace temporal separado (ver receta completa en `docs/DEPLOYMENT.md`).
**Nunca tocar nada bajo `~/domains/` de otro sitio** — este servidor aloja
varios dominios en la misma cuenta.

## 2026-09-18 — Middleware usa `getToken()`, no el wrapper `auth(...)`

**Decisión:** `proxy.ts` verifica la sesión con `getToken()` de
`next-auth/jwt` en vez de envolver el middleware con `auth(...)` (la HOF que
exporta `lib/auth.ts`). Además normaliza el header `x-forwarded-proto` antes
de dejar pasar la request.

**Causa real, encontrada recién después de arreglar la carga de `.env`** (una
vez que `AUTH_URL`/`AUTH_TRUST_HOST` finalmente llegaban de verdad al
proceso, apareció este bug *distinto*, tapado hasta entonces): Hostinger
sirve la app detrás de Cloudflare + su propio proxy, y esa cadena manda
`x-forwarded-proto` como lista separada por comas (`"https, http"` — cada hop
agrega su valor en vez de reemplazarlo). `next-auth@5.0.0-beta.32` arma una
URL interna directamente con ese header sin sanitizarlo
(`new URL(protocolo + "//" + host)`), y `"https, http:"` no es un protocolo
válido → `TypeError: Invalid URL`, en cada request, reproducido también en
local mandando ese mismo header a mano. Pasa tanto en el wrapper `auth(...)`
del middleware como en el handler real de `/api/auth/*`.

**Alternativas:** parchear el header solo para el wrapper `auth(...)`
(no alcanza: el handler de `/api/auth/*` en sí también rompe); esperar una
versión no-beta de `next-auth` que lo arregle.

**Por qué esta:** `getToken()` solo desencripta la cookie de sesión — no
construye ninguna URL, así que nunca toca el código roto. La decisión de
`secureCookie` (para que el nombre de cookie que busca `getToken` coincida
con el que puso NextAuth al loguear) se deriva del esquema de `AUTH_URL`, no
del header — ese header es justamente el que no es confiable acá.

**Vuelta adicional:** el rewrite de headers de `proxy.ts`
(`NextResponse.next({ request: { headers } })`) no le llegaba de forma
confiable a los handlers reales de `/api/auth/*` en el `server.js` custom de
Hostinger (funcionaba en local con `next start` normal, no en producción) —
así que `app/api/auth/[...nextauth]/route.ts` **también** sanitiza
`x-forwarded-proto` directamente sobre el `NextRequest` que recibe, antes de
delegarlo a los handlers de NextAuth.

**Arreglo definitivo:** ni siquiera eso alcanzó — el mismo crash seguía
apareciendo desde otro punto interno de `next-auth`, señal de que en algún
lado lee los headers vía el contexto ambiental de Next.js (`headers()` /
AsyncLocalStorage) en vez de únicamente el objeto `Request` que reciben los
handlers. La solución que finalmente funcionó de punta a punta: parchear
`Headers.prototype.get` una sola vez al cargar `lib/load-env.ts` (se importa
desde `lib/db.ts`/`lib/auth.ts`/`lib/storage/r2.ts`, así que corre antes de
la primera request) para que cualquier lectura de `x-forwarded-proto` con
coma devuelva solo el primer valor — sin importar quién la lea ni cómo haya
obtenido el objeto `Headers`. Las dos capas anteriores (proxy.ts y el route
handler) quedan igual, son baratas e inofensivas como defensa adicional.

## 2026-09-18 — `trustHost` de Auth.js: variable de entorno, no config en código

**Decisión:** `AUTH_TRUST_HOST="true"` como variable de entorno; **no**
`trustHost: true` en el objeto de config de `NextAuth()` (`lib/auth.ts`).

**Contexto real:** sin nada de esto, producción tiraba
`[auth][error] UntrustedHost` en cada request (Hostinger sirve detrás de
Cloudflare + su propio proxy). Solo con la env var, funcionó perfecto
(login real probado en `ops.moraapps.com`). Al agregar además
`trustHost: true` explícito en el código y redeployar, **toda** la app
(incluido `/login`, que no requiere sesión) empezó a tirar `500` con
`TypeError: Invalid URL` en cada request — no se pudo aislar la causa exacta
dentro de `next-auth@5.0.0-beta.32` (beta), pero revertir el cambio de código
y dejar solo la env var restauró el funcionamiento normal de inmediato.

**Por qué:** la auto-detección de `trustHost` vía `AUTH_URL`/`AUTH_TRUST_HOST`
(`@auth/core`'s `setEnvDefaults`) ya cubre exactamente este caso de uso y está
probada funcionando en producción real; forzarlo en código no aporta nada
extra acá y en esta versión concreta rompe algo. Si se actualiza `next-auth`
en el futuro, vale la pena reintentar `trustHost: true` en código para ver si
el bug ya no reproduce — pero probarlo primero en un deploy de bajo riesgo.

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
