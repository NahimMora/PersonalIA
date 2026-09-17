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

Para el modo revisado (que la IA sugiera proyecto/tipo/prioridad):

```json
{ "action": "capture", "content": "{{Texto dictado}}", "mode": "interpret" }
```

En este segundo caso la respuesta trae `interpretation` con la sugerencia;
como Shortcuts no tiene un flujo de confirmación tan rico como la web, la
recomendación inicial es usar `mode: "interpret"` solo para revisar después
desde el celular/web, no para confirmar in-line — eso queda como mejora
futura (ver informe final).

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

## 8. NFC

Un tag NFC en el escritorio puede disparar directamente el Shortcut "Iniciar
actividad" con `projectCode`/`label` fijos (Ajustes del iPhone → Accesibilidad
→ Touch → Etiquetas NFC, o desde la app Shortcuts al escanear el tag). No
requiere nada adicional del lado del servidor — es el mismo endpoint.

## Seguridad

- Un token por dispositivo/uso es más fácil de revocar sin afectar a otros
  (Ajustes → Tokens → Revocar).
- El token va en el header `Authorization`, nunca en la URL.
