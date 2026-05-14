import { MODELS, type ModelOption } from "../components/assistant/ModelToggle";
import type { ProviderAvailability } from "./mikeApi";

export type ModelProvider = "claude" | "gemini" | "openai";

export function getModelProvider(modelId: string): ModelProvider | null {
    const model = MODELS.find((m) => m.id === modelId);
    if (!model) return null;
    if (model.group === "Anthropic") return "claude";
    if (model.group === "Google") return "gemini";
    return "openai";
}

export function isModelAvailable(
    modelId: string,
    providers: ProviderAvailability | null | undefined,
): boolean {
    const provider = getModelProvider(modelId);
    if (!provider || !providers) return false;
    return !!providers[provider];
}

export function providerLabel(provider: ModelProvider): string {
    if (provider === "claude") return "Anthropic (Claude)";
    if (provider === "gemini") return "Google (Gemini)";
    return "OpenAI (GPT)";
}

export function modelGroupToProvider(
    group: ModelOption["group"],
): ModelProvider {
    if (group === "Anthropic") return "claude";
    if (group === "Google") return "gemini";
    return "openai";
}
