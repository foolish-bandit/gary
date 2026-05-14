import { createServerSupabase } from "./supabase";
import {
    isKnownModel,
    resolveModel,
    DEFAULT_TITLE_MODEL,
    DEFAULT_TABULAR_MODEL,
    OPENAI_LOW_MODELS,
    type UserApiKeys,
} from "./llm";

export type UserModelSettings = {
    title_model: string;
    tabular_model: string;
    api_keys: UserApiKeys;
};

export type ManagedProviderAvailability = {
    openai: boolean;
    gemini: boolean;
    claude: boolean;
};

export function getManagedProviderAvailability(): ManagedProviderAvailability {
    return {
        openai: !!process.env.OPENAI_API_KEY?.trim(),
        gemini: !!process.env.GEMINI_API_KEY?.trim(),
        claude: !!process.env.ANTHROPIC_API_KEY?.trim(),
    };
}

// Title generation is a lightweight task — always routed to the cheapest model
// of whichever provider the user has keys for: Gemini Flash Lite if Gemini is
// available, otherwise Claude Haiku. With no user keys set, defaults to Gemini
// (the dev-mode env fallback).
function resolveTitleModel(): string {
    const providers = getManagedProviderAvailability();
    if (providers.openai) return OPENAI_LOW_MODELS[0];
    if (providers.gemini) return DEFAULT_TITLE_MODEL;
    if (providers.claude) return "claude-haiku-4-5";
    return DEFAULT_TITLE_MODEL;
}

export async function getUserModelSettings(
    userId: string,
    db?: ReturnType<typeof createServerSupabase>,
): Promise<UserModelSettings> {
    const client = db ?? createServerSupabase();
    const { data } = await client
        .from("user_profiles")
        .select("tabular_model")
        .eq("user_id", userId)
        .single();

    const api_keys: UserApiKeys = {};

    return {
        title_model: resolveTitleModel(),
        tabular_model: resolveModel(data?.tabular_model, DEFAULT_TABULAR_MODEL),
        api_keys,
    };
}

export async function getUserApiKeys(
    _userId: string,
    db?: ReturnType<typeof createServerSupabase>,
): Promise<UserApiKeys> {
    void db;
    return {};
}

export { isKnownModel };
