"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    FileSignature,
    Loader2,
    MessageSquare,
    Table2,
    Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MikeIcon } from "@/components/chat/mike-icon";
import { ChatInput, type ChatInputHandle } from "./ChatInput";
import { SelectAssistantProjectModal } from "./SelectAssistantProjectModal";
import { uploadStandaloneDocument } from "@/app/lib/mikeApi";
import type { MikeMessage } from "../shared/types";

interface InitialViewProps {
    onSubmit: (message: MikeMessage) => void;
}

const ICON_SIZE = 35;
const GAP = 16; // gap-4 = 1rem = 16px

interface ActionCard {
    key: string;
    title: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    busy?: boolean;
}

export function InitialView({ onSubmit }: InitialViewProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const [loaded, setLoaded] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [iconOffset, setIconOffset] = useState(0);
    const [textOffset, setTextOffset] = useState(0);
    const [uploading, setUploading] = useState(false);
    const textRef = useRef<HTMLHeadingElement>(null);
    const chatInputRef = useRef<ChatInputHandle>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const username =
        profile?.displayName?.trim() || user?.email?.split("@")[0] || "there";

    useLayoutEffect(() => {
        if (!profile || !textRef.current) return;
        const h1Width = textRef.current.offsetWidth;
        setIconOffset((h1Width + GAP) / 2);
        setTextOffset((ICON_SIZE + GAP) / 2);
    }, [profile]);

    useEffect(() => {
        if (!iconOffset) return;
        const t = setTimeout(() => setLoaded(true), 100);
        return () => clearTimeout(t);
    }, [iconOffset]);

    const handleAskGary = () => {
        chatInputRef.current?.focus();
    };

    const handleUploadClick = () => {
        if (uploading) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length === 0) return;
        setUploading(true);
        try {
            for (const f of files) {
                const doc = await uploadStandaloneDocument(f);
                chatInputRef.current?.addDoc(doc);
            }
            chatInputRef.current?.focus();
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setUploading(false);
        }
    };

    const actions: ActionCard[] = [
        {
            key: "ask",
            title: "Ask Gary",
            description: "Ask Gary questions and check the cited sources.",
            Icon: MessageSquare,
            onClick: handleAskGary,
        },
        {
            key: "upload",
            title: "Upload Document",
            description: "Upload a legal document to get started.",
            Icon: uploading ? Loader2 : Upload,
            onClick: handleUploadClick,
            busy: uploading,
        },
        {
            key: "review",
            title: "Review Contract",
            description:
                "Review a contract for key terms, risks, and missing clauses.",
            Icon: Table2,
            onClick: () => router.push("/tabular-reviews"),
        },
        {
            key: "draft",
            title: "Draft Something",
            description:
                "Draft letters, emails, memos, clauses, and summaries.",
            Icon: FileSignature,
            onClick: () => router.push("/workflows"),
        },
    ];

    return (
        <div className="flex flex-col h-full w-full px-6">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex-col items-center w-full max-w-4xl relative px-0 xl:px-8">
                    <div className="mb-10 relative flex items-center justify-center">
                        <div
                            className="absolute h-[35px]"
                            style={{
                                left: "50%",
                                transform: loaded
                                    ? `translateX(calc(-50% - ${iconOffset}px))`
                                    : "translateX(-50%)",
                                transition:
                                    "transform 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                            }}
                        >
                            <MikeIcon size={ICON_SIZE} />
                        </div>
                        <h1
                            ref={textRef}
                            className="absolute text-4xl font-serif font-light text-gray-900 whitespace-nowrap"
                            style={{
                                left: "50%",
                                transform: loaded
                                    ? `translateX(calc(-50% + ${textOffset}px))`
                                    : "translateX(-50%)",
                                opacity: loaded ? 1 : 0,
                                transition:
                                    "transform 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 800ms ease-in-out 300ms",
                            }}
                        >
                            Hi, {username}
                        </h1>
                    </div>

                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
                        aria-label="What would you like to do?"
                    >
                        {actions.map(
                            ({
                                key,
                                title,
                                description,
                                Icon,
                                onClick,
                                busy,
                            }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={onClick}
                                    disabled={busy}
                                    className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <Icon
                                        className={`h-5 w-5 text-gray-700 mb-3 ${busy ? "animate-spin" : ""}`}
                                    />
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                        {title}
                                    </div>
                                    <div className="text-xs text-gray-500 leading-snug">
                                        {description}
                                    </div>
                                </button>
                            ),
                        )}
                    </div>

                    <ChatInput
                        ref={chatInputRef}
                        onSubmit={onSubmit}
                        onCancel={() => {}}
                        isLoading={false}
                        onProjectsClick={() => setProjectModalOpen(true)}
                        hideModelToggle
                    />

                    <div className="text-center">
                        <p className="text-xs py-3 mb-3 text-gray-500">
                            AI can make mistakes. Answers are not legal advice.
                        </p>
                    </div>
                </div>
            </div>

            <SelectAssistantProjectModal
                open={projectModalOpen}
                onClose={() => setProjectModalOpen(false)}
            />
        </div>
    );
}
