"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lightbulb } from "lucide-react";
import { useAssistantChat } from "@/app/hooks/useAssistantChat";
import type { MikeMessage } from "@/app/components/shared/types";

const BACKEND_UNAVAILABLE_MESSAGE =
    "This will be available once GaryOSS is connected to the backend.";

export default function ExplainThisPage() {
    const router = useRouter();
    const { handleNewChat } = useAssistantChat();

    const [text, setText] = useState("");
    const [context, setContext] = useState("");
    const [goal, setGoal] = useState("");
    const [tone, setTone] = useState("");
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleExplain() {
        if (!text.trim() || starting) return;

        setStarting(true);
        setError(null);

        const promptParts = [
            "Explain the legal language below in clear plain English.",
            `Text to explain:\n${text.trim()}`,
            context.trim() ? `Context / document type: ${context.trim()}` : "",
            goal.trim() ? `Goal: ${goal.trim()}` : "",
            tone.trim() ? `Preferred tone: ${tone.trim()}` : "",
            "Use this structure: What it says, Why it matters, What could go wrong, Possible revision.",
        ].filter(Boolean);

        try {
            const message: MikeMessage = {
                role: "user",
                content: promptParts.join("\n\n"),
            };
            const chatId = await handleNewChat(message);

            if (chatId) {
                router.push(`/assistant/chat/${chatId}`);
                return;
            }

            setError(BACKEND_UNAVAILABLE_MESSAGE);
        } catch {
            setError(BACKEND_UNAVAILABLE_MESSAGE);
        } finally {
            setStarting(false);
        }
    }

    return (
        <div className="flex-1 overflow-y-auto bg-white">
            <div className="mx-auto w-full max-w-4xl px-6 md:px-8 py-8 md:py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-serif font-light text-gray-900 mb-2">
                        Explain This
                    </h1>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Paste legal language, a clause, or a confusing
                        paragraph. Gary will explain what it says, why it
                        matters, what could go wrong, and how it might be
                        revised. Pasted text explanations may not have document
                        citations unless tied to an uploaded document.
                    </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-200 p-5 md:p-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Legal text
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste the clause, paragraph, or legal language you want explained."
                            rows={8}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="Context / document type (optional)"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                        />
                        <input
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="Goal (optional)"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                        />
                        <input
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            placeholder="Preferred tone (optional)"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleExplain}
                        disabled={!text.trim() || starting}
                        className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Lightbulb className="h-4 w-4" />
                        {starting ? "Starting…" : "Explain This"}
                    </button>

                    <p className="text-xs text-gray-500">
                        Upload a document first when you need Gary to cite the
                        source.
                    </p>

                    {error && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        "What it says",
                        "Why it matters",
                        "What could go wrong",
                        "Possible revision",
                    ].map((section) => (
                        <div
                            key={section}
                            className="rounded-xl border border-gray-200 p-4"
                        >
                            <h2 className="text-sm font-semibold text-gray-900 mb-2">
                                {section}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Gary&apos;s explanation will appear in chat after
                                you click Explain This.
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => router.push("/assistant")}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        Back to Ask Gary <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
