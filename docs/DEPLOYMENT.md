# Deployment

## Desarrollo local

Requisitos: Node 22+, Docker Desktop.

```bash
git clone <repo>
cd segundo-cerebro
cp .env.example .env        # completar GEMINI_API_KEY, ADMIN_EMAIL, etc.
npm install --legacy-peer-deps
docker compose up -d db     # Postgres local
npm run db:migrate          # aplica migraciones
npm run db:seed             # usuario admin + proyectos de ejemplo
npm run dev
```

> **Nota Windows:** si el puerto de Postgres colisiona con otro servicio local
> (nos pasó con un Postgres nativo de Windows en 5432 *y* 5433), cambiá el
> mapeo en `docker-compose.yml` (`"55432:5432"`) y `DATABASE_URL` en `.env`
> a un puerto libre.

## Producción (Hostinger VPS u otro servidor Linux con Docker)

La infraestructura de referencia es un VPS con Docker + Nginx como proxy
reverso + Let's Encrypt para HTTPS. No requiere Kubernetes ni un PaaS.

1. **Provisionar Postgres.** Opciones, de más a menos simple:
   - `docker compose up -d db` en el mismo servidor (ya incluido en `docker-compose.yml`).
   - Un Postgres gestionado si preferís no operar la base vos mismo.

2. **Variables de entorno.** Copiar `.env.example` a `.env` en el servidor y
   completar con valores reales. **Nunca** commitear este archivo.

3. **Build y arranque de la app:**

   ```bash
   docker compose --profile full up -d --build
   ```

   Esto construye la imagen (`Dockerfile`, multi-stage, `output: "standalone"`
   de Next.js) y levanta `db` + `app` en la misma red.

4. **Migraciones en cada deploy:**

   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

   (`migrate deploy`, no `migrate dev` — no genera migraciones nuevas, solo
   aplica las existentes; es el comando seguro para producción.)

5. **Proxy reverso + HTTPS.** Nginx delante del contenedor `app` (puerto 3000
   interno), con certificado de Let's Encrypt (`certbot --nginx`). Ejemplo
   mínimo de server block:

   ```nginx
   server {
     server_name tu-dominio.com;
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

6. **Webhooks de GitHub.** Necesitan que `/api/github/webhook` sea alcanzable
   públicamente por HTTPS — asegurate de que el proxy reverso no bloquee esa
   ruta y que `GITHUB_WEBHOOK_SECRET` (o el nombre que le hayas puesto) esté
   seteado en el `.env` del servidor.

## Runtime

- Node.js 22 (imagen `node:22-alpine` en el `Dockerfile`).
- Next.js standalone output — no necesita `node_modules` completo en el contenedor final.
- Puerto por defecto: `3000` (`PORT` configurable).

## Backups

- **Base de datos:** `pg_dump` programado (cron) contra el volumen de
  `db_data`, subido a R2 o a otro almacenamiento fuera del servidor. Ejemplo:

  ```bash
  docker compose exec -T db pg_dump -U segundo_cerebro segundo_cerebro | gzip > backup-$(date +%F).sql.gz
  ```

- **Object storage (R2):** Cloudflare permite versionado/lifecycle rules
  desde su propio panel; no requiere backup adicional para los adjuntos
  (son recreables o efímeros por diseño — ver `docs/DATA_MODEL.md`).
- **Configuración:** `.env` del servidor guardado en un gestor de secretos
  personal (no en el repo, no en texto plano en el propio servidor sin cifrar
  si es posible).

No hay (ni hace falta) un sistema de backup empresarial — con un dump diario
de Postgres alcanza para el volumen de datos de una app personal.
