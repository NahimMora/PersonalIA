# Deployment

## Desarrollo local

Requisitos: Node 22+, Docker Desktop (solo para la base local).

```bash
git clone <repo>
cd segundo-cerebro
cp .env.example .env        # completar GEMINI_API_KEY, ADMIN_EMAIL, etc.
npm install
docker compose up -d db     # MySQL local
npm run db:migrate          # aplica migraciones
npm run db:seed             # usuario admin + proyectos de ejemplo
npm run dev
```

> **Nota Windows:** si el puerto de MySQL colisiona con otro servicio local
> (nos pasó con un MySQL nativo de Windows), cambiá el mapeo en
> `docker-compose.yml` (por defecto usa `"53306:3306"` en el host justamente
> para evitar el 3306 por defecto) y `DATABASE_URL` en `.env`.

## Producción: Hostinger — plan compartido/Business (objetivo real)

Este es el hosting realmente disponible: un plan **Node.js Web App** de
Hostinger (el mismo tipo que usa `lavozriojana-news-app`), sin Docker ni
acceso root — MySQL vía hPanel, deploy por Git.

1. **Base de datos MySQL.** hPanel → Databases → MySQL Databases → crear
   base, usuario y contraseña. Guardar host, puerto, usuario y nombre de base.

2. **`DATABASE_URL`.** Usar el **socket Unix de MySQL**, no TCP —
   `lavozriojana-news-app` ya se golpeó con esto
   (`README_INCIDENTE_2026-09-13_HOME_VACIA.md` en ese repo): una shell SSH
   interactiva puede conectar por `127.0.0.1:3306`, pero el proceso Node del
   build/runtime de Hostinger a veces no, y la app queda "andando" pero sin
   poder leer la base (peor: si el error queda silenciado en vez de fallar el
   build, es difícil de notar).

   ```env
   DATABASE_URL="mysql://usuario:password@localhost/basededatos?socket=/var/lib/mysql/mysql.sock"
   ```

   El path del socket se confirma por SSH con `mysql_config --socket` si no
   es ese.

3. **Variables de entorno.** Cargar todas las de `.env.example` con valores
   reales en el panel de "Node.js Web App" → Environment Variables, **más**
   `AUTH_TRUST_HOST="true"` (ver `docs/DECISIONS.md` — necesario detrás del
   proxy de Hostinger/Cloudflare, y tiene que ser variable de entorno, no
   código). **Nunca** commitear estos valores.

4. **Build.** El auto-deploy por Git de Hostinger corre
   `npm install && npm run build`, sin campo de build command configurable, y
   **el paso de build no tiene garantizado acceso a las variables de entorno**
   (`DATABASE_URL` incluida) — nos pasó justo eso en el primer intento real de
   deploy. Por eso:
   - `"build": "prisma generate && next build"` — no toca la base (`prisma
     generate` solo lee el schema; `next build` tampoco necesita DB porque
     **toda la app fuerza render dinámico**, `export const dynamic =
     "force-dynamic"` en `app/layout.tsx`).
   - `"start": "prisma migrate deploy && next start"` — pensado para
     correr las migraciones al arrancar. **Importante:** en la práctica
     Hostinger **no ejecuta este script** (ver punto 5) — esto documenta la
     intención para cualquier otro hosting que sí respete `npm start`, pero
     en Hostinger las migraciones hay que aplicarlas a mano (punto 6).

5. **Cómo Hostinger sirve la app en realidad (no vía `npm start`).** Genera su
   propio `server.js` en `~/domains/<dominio>/hbuilds/current/nodejs/` que
   llama a `next/dist/server/lib/start-server` directamente — `package.json`
   → `"start"` nunca se invoca. Ese mismo directorio **no incluye la carpeta
   `prisma/`** ni los binarios de `prisma`/`tsx` (se podan del `node_modules`
   final). Ver el detalle completo, verificado por SSH, en `docs/DECISIONS.md`
   ("Cómo Hostinger realmente ejecuta esta app").

6. **Primer deploy (y cualquiera con migraciones nuevas): aplicar a mano por
   SSH.** Nunca ejecutar nada bajo la carpeta de otro dominio en la misma
   cuenta — solo tocar `~/domains/<tu-dominio>/` y un directorio propio fuera
   de `~/domains/`.

   ```bash
   ssh tu-host   # alias de tu ~/.ssh/config
   export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH   # node/npm no están en el PATH por default

   # Workspace aislado, nunca dentro de hbuilds/current:
   mkdir -p ~/tmp_migrate_app
   cp -r ~/domains/<dominio>/hbuilds/last-source/{package.json,package-lock.json,prisma} ~/tmp_migrate_app/
   cd ~/tmp_migrate_app && npm install

   DATABASE_URL="mysql://usuario:pass@localhost/basededatos?socket=/var/lib/mysql/mysql.sock" \
     npx prisma migrate deploy

   DATABASE_URL="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." \
     npx tsx prisma/seed.ts   # solo la primera vez

   cd ~ && rm -rf tmp_migrate_app
   ```

7. **Que la app arranque con las variables de entorno reales.** El panel
   guarda lo que cargaste en el paso 3 en
   `~/domains/<dominio>/hbuilds/config/.env`, pero **ese archivo no llega
   solo** al directorio que Next.js realmente lee (`hbuilds/current/nodejs/`,
   donde Next.js sí autocarga un `.env` si existe ahí). Después de cada
   deploy:

   ```bash
   cp ~/domains/<dominio>/hbuilds/config/.env ~/domains/<dominio>/hbuilds/current/nodejs/.env
   chmod 600 ~/domains/<dominio>/hbuilds/current/nodejs/.env
   touch ~/domains/<dominio>/hbuilds/current/nodejs/tmp/restart.txt   # reinicio estilo Passenger
   ```

   Sin este paso el proceso arranca sin ninguna variable configurada (así
   estuvo corriendo el primer deploy real, silenciosamente, hasta que se
   detectó). Automatizarlo (script post-deploy, o confirmar si un deploy
   futuro sí propaga el archivo solo) queda como pendiente real.

8. **Dominio y HTTPS.** Ya vienen resueltos por el panel de la Node.js Web
   App (HTTPS de Hostinger + Cloudflare por delante) — no hace falta
   Nginx/certbot propio.

9. **Webhooks de GitHub.** Necesitan que `/api/github/webhook` sea alcanzable
   públicamente por HTTPS — ya lo es una vez configurado el dominio.

## Alternativa: VPS propio con Docker (si en algún momento hay uno)

El repo ya trae todo lo necesario para esto (`Dockerfile`, `docker-compose.yml`
con perfil `full`) por si en el futuro se pasa a un VPS Hostinger Cloud u otro
servidor Linux con Docker:

```bash
docker compose --profile full up -d --build
docker compose exec app npx prisma migrate deploy
```

Con Nginx como proxy reverso (puerto 3000 interno) + Let's Encrypt para
HTTPS. Es estrictamente más flexible que el hosting compartido, pero no es
necesario mientras el plan compartido alcance.

## Runtime

- Node.js 22.
- Puerto: el que asigne Hostinger vía `PORT`, o `3000` por defecto.

## Backups

- **Base de datos:** `mysqldump` programado (cron, si el plan lo permite) o
  el export manual desde phpMyAdmin/hPanel, subido a R2 o a otro
  almacenamiento fuera del servidor:

  ```bash
  mysqldump -u usuario -p --socket=/var/lib/mysql/mysql.sock basededatos | gzip > backup-$(date +%F).sql.gz
  ```

- **Object storage (R2):** Cloudflare permite versionado/lifecycle rules
  desde su propio panel; no requiere backup adicional para los adjuntos
  (son recreables o efímeros por diseño — ver `docs/DATA_MODEL.md`).
- **Configuración:** las variables de entorno reales guardadas en un gestor
  de secretos personal (no en el repo, no en texto plano sin cifrar).

No hay (ni hace falta) un sistema de backup empresarial — con un dump
periódico de MySQL alcanza para el volumen de datos de una app personal.
