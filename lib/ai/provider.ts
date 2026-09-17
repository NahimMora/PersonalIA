import type { ItemPriority, ItemType } from "@prisma/client";

export interface ClassifyCaptureInput {
  text: string;
  projects: { id: string; name: string; code: string }[];
  modules: { id: string; projectId: string; name: string }[];
}

export interface ClassifyCaptureResult {
  projectId: string | null;
  moduleId: string | null;
  type: ItemType;
  priority: ItemPriority;
  title: string;
  confidence: number; // 0..1
}

export interface ChatContextMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIUsage {
  tokensInput?: number;
  tokensOutput?: number;
  durationMs: number;
}

export interface AIResult<T> {
  data: T;
  usage: AIUsage;
}

/**
 * Provider-agnostic AI surface. Every concrete provider (Gemini today,
 * anything else tomorrow) implements this so the rest of the app never
 * imports a vendor SDK directly. See docs/AI.md.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;

  classifyCapture(input: ClassifyCaptureInput): Promise<AIResult<ClassifyCaptureResult>>;

  summarize(text: string): Promise<AIResult<string>>;

  chat(messages: ChatContextMessage[]): Promise<AIResult<string>>;
}
