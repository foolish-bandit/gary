"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Check,
    FileText,
    Loader2,
    Quote,
    Upload,
} from "lucide-react";
import { useAssistantChat } from "@/app/hooks/useAssistantChat";
import { useDirectoryData } from "@/app/components/shared/useDirectoryData";
import { FileDirectory } from "@/app/components/shared/FileDirectory";
import { uploadStandaloneDocument } from "@/app/lib/mikeApi";
import type { MikeDocument, MikeMessage } from "@/app/components/shared/types";

/**
 * The default prompt sent to the assistant when a contract review starts.
 * Lives in code (not in `backend/`) so it ships entirely as a frontend shell.
 */
const REVIEW_PROMPT =
    "Review this contract. Identify the parties, important dates, governing law, payment terms, termination rights, indemnity, confidentiality, assignment, dispute resolution, unusual or risky clauses, and missing clauses. Cite the document for each finding.";

const REVIEW_TOPICS = [
    "Parties",
    "Important dates",
    "Governing law",
    "Payment terms",
    "Termination",
    "Indemnity",
    "Confidentiality",
    "Assignment",
    "Dispute resolution",
    "Unusual or risky clauses",
    "Missing clauses",
];

interface SelectedDoc {
    id: string;
    filename: string;
}

export default function ReviewContractPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [selected, setSelected] = useState<SelectedDoc | null>(null);
    const [uploading, setUploading] = useState(false);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { loading, standaloneDocuments, projects } = useDirectoryData(true);
    const { handleNewChat } = useAssistantChat();

    const goToStep1 = () => {
        setStep(1);
        setError(null);
    };

    const handleSelectionChange = (ids: Set<string>) => {
        // FileDirectory hands back a Set; with allowMultiple={false} it has 0
        // or 1 entry. Find the doc and capture its filename for the summary.
        const id = Array.from(ids)[0];
        if (!id) {
            setSelected(null);
            return;
        }
        const all: MikeDocument[] = [
            ...standaloneDocuments,
            ...projects.flatMap((p) => p.documents ?? []),
        ];
        const doc = all.find((d) => d.id === id);
        if (!doc) return;
        setSelected({ id: doc.id, filename: doc.filename });
        setStep(2);
    };

    const handleUploadClick = () => {
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
            const doc = await uploadStandaloneDocument(file);
            setSelected({ id: doc.id, filename: doc.filename });
            setStep(2);
        } catch (err) {
            console.error("Upload failed:", err);
            setError(
                "The document could not be uploaded. Try again, or use a smaller PDF or Word document.",
            );
        } finally {
            setUploading(false);
        }
    };

    const handleStartReview = async () => {
        if (!selected || starting) return;
        setStarting(true);
        setError(null);
        try {
            const message: MikeMessage = {
                role: "user",
                content: REVIEW_PROMPT,
                files: [
                    {
                        filename: selected.filename,
                        document_id: selected.id,
                    },
                ],
            };
            const newChatId = await handleNewChat(message);
            if (newChatId) {
                router.push(`/assistant/chat/${newChatId}`);
                return;
            }
            setError("Could not start the review. Try again.");
            setStarting(false);
        } catch (err) {
            console.error("Start review failed:", err);
            setError("Could not start the review. Try again.");
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
                        Review a contract
                    </h1>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Gary reads the contract and surfaces key terms, risks,
                        and missing clauses, with a citation to the document
                        for each finding.
                    </p>
                </div>

                {/* Stepper */}
                <Stepper currentStep={step} />

                {step === 1 && (
                    <Step1
                        loading={loading}
                        standaloneDocuments={standaloneDocuments}
                        projects={projects}
                        selectedId={selected?.id ?? null}
                        onSelectionChange={handleSelectionChange}
                        uploading={uploading}
                        onUploadClick={handleUploadClick}
                        error={error}
                    />
                )}

                {step === 2 && selected && (
                    <Step2
                        selected={selected}
                        starting={starting}
                        error={error}
                        onStart={handleStartReview}
                        onChangeDocument={goToStep1}
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
    { n: 1, label: "Choose contract" },
    { n: 2, label: "Start review" },
    { n: 3, label: "Review key terms" },
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
                            {isComplete ? (
                                <Check className="h-3 w-3" />
                            ) : (
                                s.n
                            )}
                        </div>
                        <span
                            className={`${isActive ? "text-gray-900 font-medium" : "text-gray-500"}`}
                        >
                            {s.label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <span className="mx-1 h-px w-6 bg-gray-200" aria-hidden />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

// ---------------------------------------------------------------------------
// Step 1 — Choose contract
// ---------------------------------------------------------------------------

interface Step1Props {
    loading: boolean;
    standaloneDocuments: MikeDocument[];
    projects: import("@/app/components/shared/types").MikeProject[];
    selectedId: string | null;
    onSelectionChange: (ids: Set<string>) => void;
    uploading: boolean;
    onUploadClick: () => void;
    error: string | null;
}

function Step1({
    loading,
    standaloneDocuments,
    projects,
    selectedId,
    onSelectionChange,
    uploading,
    onUploadClick,
    error,
}: Step1Props) {
    const selectedSet = selectedId ? new Set([selectedId]) : new Set<string>();
    return (
        <div>
            <h2 className="text-base font-medium text-gray-900 mb-1">
                Choose or upload a contract
            </h2>
            <p className="text-xs text-gray-500 mb-4">
                Pick a contract from your documents, or upload a new PDF or
                Word document.
            </p>

            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <p className="text-xs font-medium text-gray-700">
                        Your documents
                    </p>
                    <button
                        type="button"
                        onClick={onUploadClick}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Upload className="h-3 w-3" />
                        )}
                        {uploading ? "Uploading your document…" : "Upload contract"}
                    </button>
                </div>

                <div className="px-4 py-3">
                    <FileDirectory
                        standaloneDocs={standaloneDocuments}
                        directoryProjects={projects}
                        loading={loading}
                        selectedIds={selectedSet}
                        onChange={onSelectionChange}
                        allowMultiple={false}
                        emptyMessage="No documents yet. Upload a contract above to get started."
                    />
                </div>
            </div>

            {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            <p className="mt-4 text-xs text-gray-400">
                Selecting a contract takes you to the next step.
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Step 2 — Confirm and start
// ---------------------------------------------------------------------------

interface Step2Props {
    selected: SelectedDoc;
    starting: boolean;
    error: string | null;
    onStart: () => void;
    onChangeDocument: () => void;
}

function Step2({
    selected,
    starting,
    error,
    onStart,
    onChangeDocument,
}: Step2Props) {
    return (
        <div>
            <h2 className="text-base font-medium text-gray-900 mb-1">
                Ready to review
            </h2>
            <p className="text-xs text-gray-500 mb-4">
                Gary will read the contract and write up the findings in a
                chat. You can ask follow-up questions afterwards.
            </p>

            {/* Selected contract chip */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5">
                <p className="text-xs font-medium text-gray-500 mb-2">
                    Selected contract
                </p>
                <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                    <span
                        className="text-sm font-medium text-gray-900 truncate"
                        title={selected.filename}
                    >
                        {selected.filename}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onChangeDocument}
                    className="mt-3 text-xs text-gray-500 hover:text-gray-900 transition-colors underline-offset-2 hover:underline"
                >
                    Choose a different document
                </button>
            </div>

            {/* What Gary checks */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 mb-5">
                <p className="text-xs font-medium text-gray-700 mb-3">
                    Gary will look for
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-700">
                    {REVIEW_TOPICS.map((topic) => (
                        <li
                            key={topic}
                            className="flex items-center gap-2"
                        >
                            <Check className="h-3 w-3 text-gray-400 shrink-0" />
                            <span>{topic}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Citation note */}
            <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-4 mb-6">
                <Quote className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">
                    Gary will cite the document so you can check each finding.
                    AI can make mistakes — answers are not legal advice.
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
                            Starting review…
                        </>
                    ) : (
                        <>
                            Start Review
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onChangeDocument}
                    disabled={starting}
                    className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Back
                </button>
            </div>
        </div>
    );
}
