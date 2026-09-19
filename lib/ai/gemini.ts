import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { ItemPriority, ItemType } from "@prisma/client";
import type {
  AIProvider,
  AIResult,
  ChatContextMessage,
  ClassifyCaptureInput,
  ClassifyCaptureResult,
} from "@/lib/ai/provider";

const CLASSIFY_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    projectId: { type: SchemaType.STRING, nullable: true },
    moduleId: { type: SchemaType.STRING, nullable: true },
    type: { type: SchemaType.STRING, format: "enum", enum: Object.values(ItemType) },
    priority: { type: SchemaType.STRING, format: "enum", enum: Object.values(ItemPriority) },
    title: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ["type", "priority", "title", "confidence"],
};

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly model: string;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model = "gemini-3.1-flash-lite") {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async classifyCapture(input: ClassifyCaptureInput): Promise<AIResult<ClassifyCaptureResult>> {
    const started = Date.now();
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: "application/json", responseSchema: CLASSIFY_SCHEMA },
    });

    const projectList = input.projects.map((p) => `- ${p.id}: ${p.name} (${p.code})`).join("\n");
    const moduleList = input.modules.map((m) => `- ${m.id} (project ${m.projectId}): ${m.name}`).join("\n");

    const prompt = `Sos un clasificador de capturas personales para un "segundo cerebro".
Dada una nota en texto libre, elegí el proyecto y módulo más probable de las listas dadas
(o null si ninguno aplica), el tipo, la prioridad y un título corto (máx 80 caracteres).

Proyectos disponibles:
${projectList || "(ninguno)"}

Módulos disponibles:
${moduleList || "(ninguno)"}

Tipos válidos, con su significado (elegí el que mejor describe la INTENCIÓN del texto, no solo la primera palabra):
- NOTE: apunte informativo para recordar o consultar después, sin ninguna acción pendiente asociada.
- TASK: algo concreto y ya decidido para hacer — el usuario está pidiendo que se haga, no proponiéndolo.
- BUG: un defecto conocido y puntual en algo que ya existe (algo anda mal, pero no es una caída activa ahora mismo).
- IDEA: una propuesta o posibilidad todavía SIN decidir — "estaría bueno", "podríamos", algo para evaluar más adelante, no un pedido directo de hacer algo ya.
- IMPROVEMENT: un cambio concreto y decidido para mejorar algo que YA funciona (a diferencia de BUG, que es algo roto).
- INCIDENT: un problema activo que está afectando el funcionamiento AHORA MISMO (algo se cayó, dejó de andar) — requiere atención inmediata, a diferencia de BUG.
- BACKLOG: algo decidido para hacer pero explícitamente para más adelante, sin urgencia actual.
- RESEARCH: hay que investigar o averiguar algo antes de poder actuar; todavía no es una tarea de implementación.
- DECISION: una decisión de arquitectura o producto que se tomó (o hay que tomar) y conviene dejar registrada.
- REMINDER: algo puntual para recordar en un momento dado, no necesariamente ligado al desarrollo (ej. renovar un dominio).
Ante la duda entre IDEA y TASK: si el texto propone o sugiere ("sería bueno", "podríamos", "capaz habría que"), es IDEA;
si pide o instruye una acción directa ("agregar", "arreglar", "cambiar"), es TASK.

Prioridades válidas: ${Object.values(ItemPriority).join(", ")}

Para el título: extraé la acción o el tema central en lenguaje natural, como lo diría una persona.
NO repitas el nombre del proyecto ni del módulo en el título — esos ya quedan guardados aparte
(ej. si el texto es "Refaccionar preparadas de Ops en HolaSalta" y elegís el proyecto HolaSalta y
el módulo Ops, el título debe ser "Refaccionar preparadas", no repetir "Ops" ni "HolaSalta").

Texto de la captura:
"""
${input.text}
"""`;

    const response = await model.generateContent(prompt);
    const usage = response.response.usageMetadata;
    const parsed = JSON.parse(response.response.text()) as ClassifyCaptureResult;

    return {
      data: {
        projectId: parsed.projectId ?? null,
        moduleId: parsed.moduleId ?? null,
        type: parsed.type,
        priority: parsed.priority,
        title: parsed.title?.slice(0, 80) ?? input.text.slice(0, 80),
        confidence: parsed.confidence ?? 0.5,
      },
      usage: {
        tokensInput: usage?.promptTokenCount,
        tokensOutput: usage?.candidatesTokenCount,
        durationMs: Date.now() - started,
      },
    };
  }

  async summarize(text: string): Promise<AIResult<string>> {
    const started = Date.now();
    const model = this.client.getGenerativeModel({ model: this.model });
    const response = await model.generateContent(
      `Resumí el siguiente texto en 2-3 oraciones, en español, sin inventar información:\n\n${text}`
    );
    const usage = response.response.usageMetadata;
    return {
      data: response.response.text().trim(),
      usage: {
        tokensInput: usage?.promptTokenCount,
        tokensOutput: usage?.candidatesTokenCount,
        durationMs: Date.now() - started,
      },
    };
  }

  async chat(messages: ChatContextMessage[]): Promise<AIResult<string>> {
    const started = Date.now();
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const conversation = messages.filter((m) => m.role !== "system");

    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemMessage,
    });

    const history = conversation.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));
    const last = conversation[conversation.length - 1];

    const chatSession = model.startChat({ history });
    const response = await chatSession.sendMessage(last?.content ?? "");
    const usage = response.response.usageMetadata;

    return {
      data: response.response.text(),
      usage: {
        tokensInput: usage?.promptTokenCount,
        tokensOutput: usage?.candidatesTokenCount,
        durationMs: Date.now() - started,
      },
    };
  }
}
