import OpenAI from "openai";
import type {
    ChatCompletionAssistantMessageParam,
    ChatCompletionChunk,
    ChatCompletionMessageParam,
    ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import type {
    StreamChatParams,
    StreamChatResult,
    NormalizedToolCall,
} from "./types";
import { toOpenAITools } from "./tools";

const MAX_TOKENS = 16384;

function client(override?: string | null): OpenAI {
    const apiKey = override?.trim() || process.env.OPENAI_API_KEY || "";
    return new OpenAI({ apiKey });
}

function toNativeMessages(
    messages: StreamChatParams["messages"],
): ChatCompletionMessageParam[] {
    return messages.map((m) => ({ role: m.role, content: m.content }));
}

function parseToolInput(raw: string): Record<string, unknown> {
    if (!raw.trim()) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
}

export async function streamOpenAI(
    params: StreamChatParams,
): Promise<StreamChatResult> {
    const {
        model,
        systemPrompt,
        tools = [],
        callbacks = {},
        runTools,
        apiKeys,
    } = params;
    const maxIter = params.maxIterations ?? 10;
    const openai = client(apiKeys?.openai);
    const openaiTools = toOpenAITools(tools);

    const messages = toNativeMessages(params.messages);
    let fullText = "";

    for (let iter = 0; iter < maxIter; iter++) {
        const stream = await openai.chat.completions.create({
            model,
            stream: true,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            tools: openaiTools.length ? openaiTools : undefined,
            max_completion_tokens: MAX_TOKENS,
        });

        const textParts: string[] = [];
        const toolCallParts = new Map<
            number,
            { id: string; name: string; arguments: string }
        >();

        for await (const chunk of stream) {
            const choice = (chunk as ChatCompletionChunk).choices?.[0];
            if (!choice) continue;
            const delta = choice.delta;

            if (delta.content) {
                textParts.push(delta.content);
                callbacks.onContentDelta?.(delta.content);
            }

            for (const tc of delta.tool_calls ?? []) {
                const index = tc.index ?? 0;
                const existing = toolCallParts.get(index) ?? {
                    id: tc.id ?? `tool-call-${index}`,
                    name: "",
                    arguments: "",
                };
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) {
                    existing.arguments += tc.function.arguments;
                }
                toolCallParts.set(index, existing);
            }
        }

        const iterText = textParts.join("");
        fullText += iterText;

        const toolCalls: NormalizedToolCall[] = Array.from(
            toolCallParts.values(),
        ).map((call) => ({
            id: call.id,
            name: call.name,
            input: parseToolInput(call.arguments),
        }));

        for (const call of toolCalls) {
            callbacks.onToolCallStart?.(call);
        }

        if (!toolCalls.length || !runTools) {
            break;
        }

        const results = await runTools(toolCalls);

        const assistantMessage: ChatCompletionAssistantMessageParam = {
            role: "assistant",
            content: iterText || null,
            tool_calls: Array.from(toolCallParts.values()).map((call) => ({
                id: call.id,
                type: "function",
                function: {
                    name: call.name,
                    arguments: call.arguments || "{}",
                },
            })),
        };
        messages.push(assistantMessage);

        for (const result of results) {
            const toolMessage: ChatCompletionToolMessageParam = {
                role: "tool",
                tool_call_id: result.tool_use_id,
                content: result.content,
            };
            messages.push(toolMessage);
        }
    }

    return { fullText };
}

export async function completeOpenAIText(params: {
    model: string;
    systemPrompt?: string;
    user: string;
    maxTokens?: number;
    apiKeys?: { openai?: string | null };
}): Promise<string> {
    const openai = client(params.apiKeys?.openai);
    const response = await openai.chat.completions.create({
        model: params.model,
        messages: [
            ...(params.systemPrompt
                ? [{ role: "system" as const, content: params.systemPrompt }]
                : []),
            { role: "user", content: params.user },
        ],
        max_completion_tokens: params.maxTokens ?? 512,
    });
    return response.choices[0]?.message?.content ?? "";
}
