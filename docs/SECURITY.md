# Seguridad

## Autenticación web

Auth.js (NextAuth v5), proveedor Credentials, sesión JWT. Contraseñas
hasheadas con bcrypt (`bcryptjs`, cost 12). Todas las páginas y rutas API
están protegidas por `proxy.ts` salvo `/login`, `/api/auth/*` y
`/api/shortcuts` (que tienen su propia auth, ver abajo). Sin sesión válida:
redirect a `/login` (páginas) o `401` (API).

## Tokens para Apple Shortcuts / NFC

- Se generan con `crypto.randomBytes(32)` (`lib/shortcuts-auth.ts`), prefijo `sc_`.
- Se guarda solo el **hash SHA-256** en `api_tokens.tokenHash` — el valor en
  texto plano se muestra una única vez, en el momento de crearlo.
- Revocables individualmente (`revokedAt`), sin necesidad de rotar todos los tokens.
- Se validan por header `Authorization: Bearer <token>`, nunca por query string (evita que queden en logs de acceso).

## Secretos

- Nunca se commitean. `.env` está en `.gitignore`; `.env.example` documenta
  todas las variables sin valores reales.
- Tokens de GitHub: se referencian por nombre de variable de entorno
  (`Repository.tokenEnvVar`), nunca por valor, en la base de datos.
- Secreto de webhook de GitHub: mismo patrón (`webhookSecretEnvVar`).
- Credenciales de R2: solo en variables de entorno.

## Operaciones destructivas

Todo botón que borra o revoca algo pasa por `components/ui/ConfirmButton.tsx`
(un solo componente reusable): el primer click "arma" la acción, hay que
tocarlo de nuevo dentro de 4 segundos para confirmarla. Se usa para: revocar
tokens (implementado). Extenderlo a "archivar proyecto" / "borrar
repositorio" queda como trabajo futuro (ver informe final) pero el patrón ya
existe y es trivial de reutilizar.

## GitHub

- Tokens fine-grained, **read-only** (Contents + Metadata), jamás
  `repo` completo ni permisos de escritura.
- Los repos privados nunca se hacen públicos ni se modifican desde esta app —
  solo se leen archivos de documentación.
- El webhook se autentica por firma HMAC-SHA256 (`lib/github/webhook.ts`),
  comparada con `timingSafeEqual` para evitar timing attacks.

## Base de datos

- Prisma parametriza todas las queries (sin SQL crudo en el código de la app) → sin inyección SQL.
- Migraciones versionadas (`prisma/migrations/`), nunca `db push` en producción.

## Qué falta / próximos pasos de seguridad

- Rate limiting en `/api/shortcuts` y `/api/auth` (hoy no hay; para un uso
  personal de bajo volumen el riesgo es acotado, pero es la primera mejora a
  sumar si el sistema se expone públicamente sin VPN/IP allowlist).
- 2FA para el login web (no implementado; evaluar si el dashboard queda
  expuesto a internet sin restricción de IP).
