# Deployment

## Desarrollo local

Requisitos: Node 22+, Docker Desktop (solo para la base local).

```bash
git clone <repo>
cd segundo-cerebro
cp .env.example .env        # completar GEMINI_API_KEY, ADMIN_EMAIL, etc.
npm install --legacy-peer-deps
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
   reales en el panel de "Node.js Web App" (o en un `.env` en la raíz de la
   app si Hostinger lee el archivo — confirmar cuál de los dos métodos usa tu
   plan). **Nunca** commitear estos valores.

4. **Build.** El auto-deploy por Git de Hostinger corre siempre
   `npm install && npm run build`, sin campo de build command configurable —
   por eso `package.json` → `"build"` ya incluye
   `prisma migrate deploy && prisma generate && next build`. Esto es
   obligatorio: si una migración nueva no se aplica en el build, la app sirve
   con el schema viejo.

5. **Start command:** `npm start` (ya usa `next start -p ${PORT:-3000}`,
   respeta el `PORT` que asigne Hostinger).

6. **Dominio del panel.** Configurar el dominio/subdominio que vayas a usar
   (ej. `personal-ai.tudominio.com`) apuntando a la Node.js Web App desde
   hPanel.

7. **Webhooks de GitHub.** Necesitan que `/api/github/webhook` sea alcanzable
   públicamente por HTTPS — Hostinger ya sirve HTTPS por defecto en el
   dominio configurado, no hace falta Nginx/certbot propio acá.

8. **Reinicio tras cada push.** Si el auto-deploy de Hostinger no reinicia
   solo, hacerlo manualmente desde hPanel (o por SSH si el plan lo permite)
   después de cada deploy con migraciones nuevas.

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
