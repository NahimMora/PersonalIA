# Arquitectura

## Visión general

Segundo Cerebro es una única aplicación Next.js (App Router) que sirve tanto el
frontend como la API (`app/api/**/route.ts`). No hay backend separado ni
microservicios: para una app personal, un monolito bien estructurado es más
simple de mantener, desplegar y razonar sobre él.

```
iPhone / Web / Shortcuts / NFC
              │
              ▼
   Next.js (App Router) — un solo proceso
   ├── Server Components (páginas)     → leen MySQL vía Prisma directamente
   ├── Route Handlers (app/api/**)      → API JSON (web + Shortcuts)
   ├── lib/services/**                  → lógica de negocio compartida
   ├── lib/ai/**                        → capa de abstracción de IA (Gemini hoy)
   └── lib/github/**                    → integración GitHub (Octokit)
              │
   ┌──────────┼───────────────┐
   │          │               │
 MySQL     GitHub API      Cloudflare R2
(Prisma)  (fine-grained     (attachments,
           PAT por repo)     audio temporal)
```

## Por qué este stack

| Decisión | Alternativas consideradas | Por qué esta |
|---|---|---|
| Next.js App Router (un solo proyecto) | Backend Express/Nest separado + SPA | Menos piezas móviles, menos deploys, Server Components evitan una capa de API para las páginas |
| MySQL + Prisma | PostgreSQL, Supabase, Mongo, SQLite | Relacional encaja con el modelo (proyectos/items/relaciones); Prisma da migraciones tipadas sin acoplarse a un proveedor. Se eligió MySQL en particular (no Postgres, la opción inicial) porque el hosting real disponible es un plan compartido de Hostinger que solo ofrece MySQL — ver `docs/DECISIONS.md` |
| Auth.js (NextAuth v5) con Credentials + JWT | Clerk/Auth0, auth propia | Gratis, sin servicio externo, controla bien el caso "una o pocas personas" y ya está integrado con Next.js |
| Gemini vía capa `AIProvider` propia | Vercel AI Gateway/AI SDK | Menos dependencias externas para un self-host en Hostinger; la interfaz propia (`lib/ai/provider.ts`) igual permite cambiar de proveedor sin tocar el resto de la app |
| Cloudflare R2 | Vercel Blob, S3 | Ya disponible para el usuario, API S3-compatible, sin costo de egress |
| Docker Compose (solo dev local) | Kubernetes, PaaS gestionado | El deploy real es Hostinger compartido ("Node.js Web App", sin Docker — ver `docs/DEPLOYMENT.md`); Docker Compose se usa localmente para levantar MySQL reproducible, y queda documentado como alternativa completa si algún día hay un VPS |

## Módulos de `lib/`

- `lib/db.ts` — cliente Prisma singleton (evita agotar conexiones en dev con hot-reload).
- `lib/ids.ts` — generación de ids humanos (`HS-BUG-0014`) y slugs.
- `lib/classify.ts` — clasificación determinística por alias (sin IA).
- `lib/ai/` — interfaz `AIProvider` + implementación Gemini + wrapper con logging de costo.
- `lib/github/` — cliente Octokit, sync de documentación, parser de docs, verificación de webhooks.
- `lib/storage/r2.ts` — subida/descarga/borrado de objetos en R2 (URLs pre-firmadas).
- `lib/services/` — lógica de negocio reusada tanto por las rutas web autenticadas como por `/api/shortcuts`.
- `lib/shortcuts-auth.ts` — tokens personales (hasheados) para Apple Shortcuts / NFC.

## Decisiones de diseño puntuales

Ver `docs/DECISIONS.md` para el registro de decisiones (política de actividades
simultáneas, Inbox como proyecto de fallback, etc.).
