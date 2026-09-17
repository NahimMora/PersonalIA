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

  constructor(apiKey: string, model = "gemini-3.6-flash") {
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

Tipos válidos: ${Object.values(ItemType).join(", ")}
Prioridades válidas: ${Object.values(ItemPriority).join(", ")}

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
