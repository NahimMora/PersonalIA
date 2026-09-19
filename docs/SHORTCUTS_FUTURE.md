# Apple Shortcuts / NFC (futuro)

La API ya está lista para esto (`POST /api/shortcuts`); solo falta armar los
Shortcuts en el iPhone. Este documento explica cómo, para cuando se haga.

## 1. Conseguir un token

Desde el navegador, logueado: Ajustes → Tokens → "Generar" → copiar el valor
(`sc_...`). Se muestra una sola vez.

## 2. Estructura de cada llamada

Todas las acciones pegan al mismo endpoint:

```
POST https://tu-dominio.com/api/shortcuts
Authorization: Bearer sc_xxxxxxxx
Content-Type: application/json
```

con un body distinto según `action`.

## 3. Shortcut "Capturar"

Botón de Acción → Shortcut → pedir texto (o dictado) → `Obtener contenido de URL`:

```json
{ "action": "capture", "content": "{{Texto dictado}}", "mode": "quick" }
```

Para que la IA elija proyecto/tipo/prioridad (sin tener que abrir la web
después a confirmar nada — pensado justo para Shortcuts, donde no hay UI
para revisar una sugerencia antes de guardar):

```json
{ "action": "capture", "content": "{{Texto dictado}}", "mode": "interpret" }
```

La respuesta trae `item` con el resultado ya guardado (mismo shape que en
modo `quick`: `item.publicId`, `item.id`, etc.) más `interpretation` con lo
que sugirió la IA, por si querés mostrarlo. Si la IA no está segura de a qué
proyecto pertenece, cae en Inbox — igual que `quick` — en vez de fallar.

Si el llamador ya sabe a qué proyecto/módulo pertenece (por ejemplo, una
sesión de Claude Code corriendo dentro del repo de ese proyecto — ver
`docs/CROSS_REPO_AGENTS.md`), puede fijarlo explícitamente en vez de dejar
que el alias-matching o la IA lo adivinen — funciona en ambos modos:

```json
{ "action": "capture", "content": "...", "mode": "interpret", "projectCode": "LVR", "moduleSlug": "autopublicador" }
```

## 4. Shortcut "Iniciar actividad"

```json
{ "action": "activity_start", "projectCode": "HS", "label": "Programación" }
```

`projectCode` es el código corto del proyecto (`HS`, `LVR`, ...), visible en
Ajustes → Proyectos. `moduleSlug` es opcional.

## 5. Shortcut "Terminar actividad"

```json
{ "action": "activity_stop" }
```

No necesita parámetros — siempre cierra la actividad en curso (política de
"una sola actividad activa", ver `docs/DECISIONS.md`).

## 6. Registro rápido (Quick Event)

Ejemplo "Agua +250ml":

```json
{ "action": "event", "eventType": "water", "value": 250, "unit": "ml" }
```

## 7. Preguntar (chat)

```json
{ "action": "chat", "message": "¿Qué tengo pendiente en HolaSalta?", "projectCode": "HS" }
```

La respuesta trae `{ conversationId, reply }`. Cada llamada sin
`conversationId` previo arranca una conversación nueva (Shortcuts no necesita
mantener estado entre llamadas para este caso de uso).

## 8. Listar pendientes de un proyecto/módulo

Pensado para que una sesión de Claude Code (u otro cliente no interactivo)
consulte qué hay anotado antes de ponerse a trabajar:

```json
{ "action": "list_items", "projectCode": "HS", "moduleSlug": "ops", "status": "PENDING" }
```

`status` es `"PENDING"` (default — trae PENDING + IN_PROGRESS), `"IN_PROGRESS"`
o `"ALL"` (incluye resueltos/descartados). `moduleSlug` es opcional — sin él,
trae todo el proyecto. La respuesta es `{ items: [...] }`, cada item con su
`publicId`, `title`, `type`, `priority`, `status`, etc.

## 9. Marcar un item resuelto

```json
{ "action": "resolve_item", "publicId": "HS-BUG-0014" }
```

Busca por `publicId` (no hace falta conocer el id interno), pone
`status: RESOLVED` y devuelve el item actualizado. No hay acción para
descartar todavía — si hace falta, se agrega igual que esta.

## 10. NFC

Un tag NFC en el escritorio puede disparar directamente el Shortcut "Iniciar
actividad" con `projectCode`/`label` fijos (Ajustes del iPhone → Accesibilidad
→ Touch → Etiquetas NFC, o desde la app Shortcuts al escanear el tag). No
requiere nada adicional del lado del servidor — es el mismo endpoint.

## Seguridad

- Un token por dispositivo/uso es más fácil de revocar sin afectar a otros
  (Ajustes → Tokens → Revocar).
- El token va en el header `Authorization`, nunca en la URL.
