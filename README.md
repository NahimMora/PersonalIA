# Segundo Cerebro

Personal AI / Project Knowledge Hub: centraliza proyectos, bugs, ideas,
backlog, incidentes, decisiones técnicas, documentación de repos GitHub y
capturas personales, con una capa de IA opcional para clasificar y conversar
sobre esa información.

Ver `docs/` para arquitectura, modelo de datos, API, integración con GitHub,
IA, seguridad y deployment. Este README es solo el quickstart.

## Stack

Next.js 16 (App Router) · TypeScript · MySQL + Prisma · Auth.js v5 ·
Tailwind CSS 4 · Gemini (vía capa de abstracción propia) · Cloudflare R2 ·
Docker.

## Quickstart

```bash
git clone <repo>
cd segundo-cerebro
cp .env.example .env        # completar valores (ver comentarios en el archivo)
npm install --legacy-peer-deps
docker compose up -d db
npm run db:migrate
npm run db:seed             # crea el usuario admin (ADMIN_EMAIL/ADMIN_PASSWORD del .env) + proyectos de ejemplo
npm run dev
```

Abrí `http://localhost:3000`, logueate con `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

> Si el puerto 3306 ya está en uso en tu máquina (nos pasó en Windows con un
> MySQL nativo corriendo en paralelo — el `docker-compose.yml` ya usa 53306
> en el host para evitarlo), cambiá el puerto mapeado ahí y en `DATABASE_URL`
> si igual colisiona.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run test` | Tests (Vitest — incluye integración contra MySQL local) |
| `npm run db:migrate` | Nueva migración en desarrollo |
| `npm run db:deploy` | Aplicar migraciones en producción |
| `npm run db:seed` | Seed (admin + ejemplos) |
| `npm run db:studio` | Prisma Studio (explorar la base visualmente) |

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — visión general y por qué este stack.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — entidades y su razón de ser.
- [`docs/API.md`](docs/API.md) — todos los endpoints.
- [`docs/GITHUB_INTEGRATION.md`](docs/GITHUB_INTEGRATION.md) — cómo se conecta y sincroniza cada repo.
- [`docs/AI.md`](docs/AI.md) — qué usa IA, qué es determinístico, costos.
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth, tokens, secretos.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — cómo desplegar (Hostinger/Docker) y backups.
- [`docs/SHORTCUTS_FUTURE.md`](docs/SHORTCUTS_FUTURE.md) — cómo conectar Apple Shortcuts / NFC cuando se arme.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — registro de decisiones técnicas.
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — reglas de trabajo (incluye Claude Code).
