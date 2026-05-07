"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlignLeft,
    ArrowRight,
    BookOpen,
    Check,
    ClipboardList,
    FileText,
    Loader2,
    Mail,
    Megaphone,
    NotebookText,
    Paperclip,
    Send,
    Sparkles,
    X,
} from "lucide-react";
import { useAssistantChat } from "@/app/hooks/useAssistantChat";
import { uploadStandaloneDocument } from "@/app/lib/mikeApi";
import type { MikeDocument, MikeMessage } from "@/app/components/shared/types";

/**
 * The default tail instruction appended to every drafting message. Lives in
 * code (not in `backend/`) so this ships entirely as a frontend shell.
 */
const DEFAULT_INSTRUCTION =
    "Draft the requested legal document using the facts provided. Be clear, organized, and practical. Do not invent facts. Flag any missing information that would be needed before finalizing.";

interface DraftOption {
    key: string;
    title: string;
    description: string;
    /** Opening line of the prompt sent to the assistant. */
    opening: string;
    Icon: React.ComponentType<{ className?: string }>;
}

const DRAFT_OPTIONS: DraftOption[] = [
    {
        key: "email",
        title: "Email",
        description:
            "Draft a clear email to a client, opposing counsel, or another lawyer.",
        opening: "Draft an email.",
        Icon: Send,
    },
    {
        key: "letter",
        title: "Letter",
        description: "Draft a formal letter using the facts and tone you provide.",
        opening: "Draft a formal letter.",
        Icon: Mail,
    },
    {
        key: "memo",
        title: "Memo",
        description: "Draft a legal or business memo with organized sections.",
        opening: "Draft a memo with clearly organized sections.",
        Icon: NotebookText,
    },
    {
        key: "clause",
        title: "Clause",
        description: "Draft or revise a contract clause.",
        opening: "Draft (or revise) a contract clause.",
        Icon: BookOpen,
    },
    {
        key: "summary",
        title: "Summary",
        description: "Summarize a document or issue in plain English.",
        opening: "Draft a plain-English summary.",
        Icon: AlignLeft,
    },
    {
        key: "demand-letter",
        title: "Demand letter",
        description:
            "Draft a structured demand letter based on the facts you provide.",
        opening: "Draft a structured demand letter.",
        Icon: Megaphone,
    },
    {
        key: "client-update",
        title: "Client update",
        description:
            "Draft a short update explaining status, next steps, and risks.",
        opening:
            "Draft a short client update covering status, next steps, and risks.",
        Icon: ClipboardList,
    },
    {
        key: "custom",
        title: "Custom draft",
        description: "Anything else — describe what you need below.",
        opening: "Help me draft the document described below.",
        Icon: Sparkles,
    },
];

interface AttachedDoc {
    id: string;
    filename: string;
}

export default function DraftSomethingPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [optionKey, setOptionKey] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [audience, setAudience] = useState("");
    const [tone, setTone] = useState("");
    const [attached, setAttached] = useState<AttachedDoc | null>(null);
    const [uploading, setUploading] = useState(false);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { handleNewChat } = useAssistantChat();

    const selectedOption =
        DRAFT_OPTIONS.find((o) => o.key === optionKey) ?? null;

    const goToStep1 = () => {
        setStep(1);
        setError(null);
    };

    const handleSelect = (key: string) => {
        setOptionKey(key);
        setStep(2);
        setError(null);
    };

    const handleAttachClick = () => {
        if (uploading) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const doc: MikeDocument = await uploadStandaloneDocument(file);
            setAttached({ id: doc.id, filename: doc.filename });
        } catch (err) {
            console.error("Upload failed:", err);
            setError(
                "The document could not be uploaded. Try again, or use a smaller PDF or Word document.",
            );
        } finally {
            setUploading(false);
        }
    };

    const buildPrompt = (option: DraftOption): string => {
        const parts: string[] = [option.opening];
        const trimmedDesc = description.trim();
        if (trimmedDesc) {
            parts.push(`What I need:\n${trimmedDesc}`);
        }
        const meta: string[] = [];
        if (audience.trim()) meta.push(`Audience: ${audience.trim()}`);
        if (tone.trim()) meta.push(`Tone: ${tone.trim()}`);
        if (meta.length > 0) parts.push(meta.join("\n"));
        parts.push(DEFAULT_INSTRUCTION);
        return parts.join("\n\n");
    };

    const handleStartDrafting = async () => {
        if (!selectedOption || starting) return;
        if (!description.trim()) {
            setError(
                "Tell Gary a little more about what you need drafted before starting.",
            );
            return;
        }
        setStarting(true);
        setError(null);
        try {
            const message: MikeMessage = {
                role: "user",
                content: buildPrompt(selectedOption),
                files: attached
                    ? [
                          {
                              filename: attached.filename,
                              document_id: attached.id,
                          },
                      ]
                    : undefined,
            };
            const newChatId = await handleNewChat(message);
            if (newChatId) {
                router.push(`/assistant/chat/${newChatId}`);
                return;
            }
            setError("This will be available once GaryOSS is connected to the backend.");
            setStarting(false);
        } catch (err) {
            console.error("Start drafting failed:", err);
            setError("This will be available once GaryOSS is connected to the backend.");
            setStarting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-white">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="mx-auto w-full max-w-3xl px-6 md:px-8 py-8 md:py-12">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-serif font-light text-gray-900 mb-2">
                        Draft something
                    </h1>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Pick the kind of writing you need help with, then tell
                        Gary the audience, the goal, and the important facts.
                    </p>
                </div>

                {/* Stepper */}
                <Stepper currentStep={step} />

                {step === 1 && <Step1 onSelect={handleSelect} />}

                {step === 2 && selectedOption && (
                    <Step2
                        option={selectedOption}
                        description={description}
                        audience={audience}
                        tone={tone}
                        attached={attached}
                        uploading={uploading}
                        starting={starting}
                        error={error}
                        onDescriptionChange={setDescription}
                        onAudienceChange={setAudience}
                        onToneChange={setTone}
                        onAttachClick={handleAttachClick}
                        onRemoveAttachment={() => setAttached(null)}
                        onChangeType={goToStep1}
                        onStart={handleStartDrafting}
                    />
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

const STEPS = [
    { n: 1, label: "Choose draft type" },
    { n: 2, label: "Add details" },
    { n: 3, label: "Review draft" },
];

function Stepper({ currentStep }: { currentStep: 1 | 2 }) {
    return (
        <ol className="flex items-center gap-2 mb-8 text-xs">
            {STEPS.map((s, i) => {
                const isComplete = currentStep > s.n;
                const isActive = currentStep === s.n;
                return (
                    <li key={s.n} className="flex items-center gap-2">
                        <div
                            className={`flex items-center justify-center h-6 w-6 rounded-full font-medium ${
                                isComplete
                                    ? "bg-gray-900 text-white"
                                    : isActive
                                      ? "bg-gray-900 text-white"
                                      : "bg-gray-100 text-gray-500"
                            }`}
                        >
                            {isComplete ? <Check className="h-3 w-3" /> : s.n}
                        </div>
                        <span
                            className={`${isActive ? "text-gray-900 font-medium" : "text-gray-500"}`}
                        >
                            {s.label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <span
                                className="mx-1 h-px w-6 bg-gray-200"
                                aria-hidden
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

// ---------------------------------------------------------------------------
// Step 1 — Choose draft type
// ---------------------------------------------------------------------------

function Step1({ onSelect }: { onSelect: (key: string) => void }) {
    return (
        <div>
            <h2 className="text-base font-medium text-gray-900 mb-1">
                What would you like to draft?
            </h2>
            <p className="text-xs text-gray-500 mb-4">
                Pick the kind of writing — you can change it on the next step.
            </p>

            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                aria-label="Draft type"
            >
                {DRAFT_OPTIONS.map(({ key, title, description, Icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onSelect(key)}
                        className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        <Icon className="h-5 w-5 text-gray-700 mb-3" />
                        <div className="text-sm font-medium text-gray-900 mb-1">
                            {title}
                        </div>
                        <div className="text-xs text-gray-500 leading-snug">
                            {description}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Step 2 — Add details
// ---------------------------------------------------------------------------

interface Step2Props {
    option: DraftOption;
    description: string;
    audience: string;
    tone: string;
    attached: AttachedDoc | null;
    uploading: boolean;
    starting: boolean;
    error: string | null;
    onDescriptionChange: (v: string) => void;
    onAudienceChange: (v: string) => void;
    onToneChange: (v: string) => void;
    onAttachClick: () => void;
    onRemoveAttachment: () => void;
    onChangeType: () => void;
    onStart: () => void;
}

function Step2({
    option,
    description,
    audience,
    tone,
    attached,
    uploading,
    starting,
    error,
    onDescriptionChange,
    onAudienceChange,
    onToneChange,
    onAttachClick,
    onRemoveAttachment,
    onChangeType,
    onStart,
}: Step2Props) {
    const Icon = option.Icon;
    return (
        <div>
            {/* Selected type chip */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5">
                <p className="text-xs font-medium text-gray-500 mb-2">
                    Draft type
                </p>
                <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-gray-700 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">
                        {option.title}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onChangeType}
                    className="mt-3 text-xs text-gray-500 hover:text-gray-900 transition-colors underline-offset-2 hover:underline"
                >
                    Choose a different type
                </button>
            </div>

            {/* Description */}
            <div className="mb-4">
                <label
                    htmlFor="draft-description"
                    className="block text-xs font-medium text-gray-700 mb-2"
                >
                    What do you need?
                </label>
                <textarea
                    id="draft-description"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={6}
                    placeholder="Tell Gary what you need drafted. Include the audience, goal, important facts, and preferred tone."
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors resize-y"
                />
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                    <label
                        htmlFor="draft-audience"
                        className="block text-xs font-medium text-gray-700 mb-2"
                    >
                        Audience{" "}
                        <span className="text-gray-400 font-normal">
                            (optional)
                        </span>
                    </label>
                    <input
                        id="draft-audience"
                        type="text"
                        value={audience}
                        onChange={(e) => onAudienceChange(e.target.value)}
                        placeholder="e.g. opposing counsel, board, client"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                    />
                </div>
                <div>
                    <label
                        htmlFor="draft-tone"
                        className="block text-xs font-medium text-gray-700 mb-2"
                    >
                        Tone{" "}
                        <span className="text-gray-400 font-normal">
                            (optional)
                        </span>
                    </label>
                    <input
                        id="draft-tone"
                        type="text"
                        value={tone}
                        onChange={(e) => onToneChange(e.target.value)}
                        placeholder="e.g. firm, plain-English, formal"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                    />
                </div>
            </div>

            {/* Attach a document (optional) */}
            <div className="mb-5">
                <p className="text-xs font-medium text-gray-700 mb-2">
                    Use a document{" "}
                    <span className="text-gray-400 font-normal">
                        (optional)
                    </span>
                </p>
                {attached ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs text-white border border-white/20 shadow">
                        <FileText className="h-3 w-3 text-red-400 shrink-0" />
                        <span className="max-w-[220px] truncate">
                            {attached.filename}
                        </span>
                        <button
                            type="button"
                            onClick={onRemoveAttachment}
                            className="rounded-full p-0.5 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                            aria-label="Remove attachment"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onAttachClick}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Paperclip className="h-3 w-3" />
                        )}
                        {uploading
                            ? "Uploading your document…"
                            : "Attach a document"}
                    </button>
                )}
            </div>

            {/* Caution */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 mb-6">
                <p className="text-sm text-gray-600 leading-relaxed">
                    Review the draft before using it. Gary may help organize
                    and revise, but the lawyer is responsible for the final
                    work.
                </p>
            </div>

            {error && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onStart}
                    disabled={starting}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {starting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Starting draft…
                        </>
                    ) : (
                        <>
                            Start Drafting
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onChangeType}
                    disabled={starting}
                    className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Back
                </button>
            </div>
        </div>
    );
}
