import { prisma } from "@/lib/db";
import { GeminiProvider } from "@/lib/ai/gemini";
import type {
  AIProvider,
  ChatContextMessage,
  ClassifyCaptureInput,
  ClassifyCaptureResult,
} from "@/lib/ai/provider";

// Approximate public pricing (USD per 1M tokens). Only used to give a rough
// cost signal in the usage dashboard — not for billing. Update as pricing changes.
const PRICING_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
};

let cachedProvider: AIProvider | null = null;

function getProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Agregala a .env para habilitar las funciones de IA."
    );
  }

  cachedProvider = new GeminiProvider(apiKey, process.env.GEMINI_MODEL || "gemini-2.0-flash");
  return cachedProvider;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function estimateCostUsd(model: string, tokensInput?: number, tokensOutput?: number): number | null {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing || tokensInput == null || tokensOutput == null) return null;
  return (tokensInput * pricing.input + tokensOutput * pricing.output) / 1_000_000;
}

async function withUsageLog<T>(
  operation: string,
  run: (provider: AIProvider) => Promise<{ data: T; usage: { tokensInput?: number; tokensOutput?: number; durationMs: number } }>
): Promise<T> {
  const provider = getProvider();
  const result = await run(provider);

  await prisma.aiUsageLog.create({
    data: {
      operation,
      provider: provider.name,
      model: provider.model,
      tokensInput: result.usage.tokensInput,
      tokensOutput: result.usage.tokensOutput,
      costEstimateUsd: estimateCostUsd(provider.model, result.usage.tokensInput, result.usage.tokensOutput),
      durationMs: result.usage.durationMs,
    },
  });

  return result.data;
}

export const ai = {
  classifyCapture(input: ClassifyCaptureInput): Promise<ClassifyCaptureResult> {
    return withUsageLog("classify", (provider) => provider.classifyCapture(input));
  },
  summarize(text: string): Promise<string> {
    return withUsageLog("summarize", (provider) => provider.summarize(text));
  },
  chat(messages: ChatContextMessage[]): Promise<string> {
    return withUsageLog("chat", (provider) => provider.chat(messages));
  },
};
