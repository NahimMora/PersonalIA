# IA

## Principio

> Si algo puede resolverse confiablemente con código, base de datos, reglas o
> metadata, no se usa IA.

Ver `docs/DECISIONS.md` para casos concretos donde esto se aplicó.

## Dónde se usa IA (y dónde no)

| Función | Determinístico | IA |
|---|---|---|
| Resolver proyecto/módulo desde un alias conocido | ✅ `lib/classify.ts` | — |
| Interpretar una captura ambigua (tipo, prioridad, título) | — | ✅ solo en modo "Revisada" |
| Generar id humano (`HS-BUG-0014`) | ✅ `lib/ids.ts` | — |
| Contexto para el chat (qué items traer) | ✅ SQL (`lib/services/chat.ts`) | — |
| Redactar la respuesta del chat sobre ese contexto | — | ✅ |
| Extraer pendientes de `BUGS.md`/`BACKLOG.md` | ✅ parser de checklists | — |
| Detectar bugs reales en código | — | (manual, vía Claude Code — fuera de esta app) |

La captura **rápida** nunca llama a la IA — es siempre gratis e instantánea.
Solo la captura **revisada** y el **chat** consumen tokens.

## Capa de abstracción (`lib/ai/`)

```ts
interface AIProvider {
  classifyCapture(input): Promise<AIResult<ClassifyCaptureResult>>;
  summarize(text): Promise<AIResult<string>>;
  chat(messages): Promise<AIResult<string>>;
}
```

`lib/ai/gemini.ts` es la única implementación hoy (Gemini Flash, configurable
vía `GEMINI_MODEL`). El resto de la app importa `lib/ai/index.ts` (el objeto
`ai`), nunca `@google/generative-ai` directamente ni `lib/ai/gemini.ts`. Para
agregar otro proveedor: implementar `AIProvider` y cambiar `getProvider()` en
`lib/ai/index.ts` — ningún otro archivo cambia.

## Clasificación de capturas (modo Revisada)

1. Se cargan todos los proyectos/módulos existentes (nombres + ids, no datos completos).
2. Se le pide a Gemini un JSON estructurado (`responseSchema`, no parseo de texto libre) con proyecto/módulo sugerido, tipo, prioridad, título y confianza.
3. El usuario ve la sugerencia y puede: confirmar, modificar cualquier campo, pedir "reinterpretar" (nueva llamada a la IA), o descartar.

## Chat contextual

El contexto nunca es "toda la base" ni "todo el repo". `lib/services/chat.ts`
arma el prompt con:

- Hasta 40 items pendientes/en curso del proyecto (o global si no se especifica), ordenados por prioridad.
- Hasta 10 items resueltos recientemente (para preguntas tipo "¿qué se solucionó?").

Eso se manda como *system prompt* junto con el historial de la conversación.
El modelo tiene instrucción explícita de no inventar información fuera de ese
contexto.

## Costos

Cada llamada a la IA (`lib/ai/index.ts` → `withUsageLog`) registra en
`AiUsageLog`: operación, proveedor, modelo, tokens de entrada/salida, costo
estimado (según tabla de precios aproximada en el mismo archivo — **no es
facturación real**, es una señal de visibilidad) y duración. Visible en
Ajustes → Uso de IA.

## RAG / embeddings

No implementado, a propósito. La combinación de SQL + aliases + `LIKE`
case-insensitive (la collation `utf8mb4_unicode_ci` de MySQL ya lo es por
default) cubre el caso de uso actual ("¿qué tengo pendiente en X?"). Si en el
futuro hace falta buscar semánticamente sobre texto largo (transcripciones de
audio, documentación extensa), evaluar `MeiliSearch`/`Typesense` (full-text
dedicado, liviano) o el soporte de vectores de MySQL 9+ antes de introducir
una vector DB separada — MySQL no tiene un equivalente maduro a `pgvector`.
