"use client";

import { AlertCircle, Check, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { MODELS } from "@/app/components/assistant/ModelToggle";
import {
    isModelAvailable,
    modelGroupToProvider,
    providerLabel,
} from "@/app/lib/modelAvailability";
import type { ProviderAvailability } from "@/app/lib/mikeApi";
import { useState } from "react";

export default function ModelsPage() {
    const { profile, updateModelPreference } = useUserProfile();
    const providerAvailability = profile?.providerAvailability ?? null;

    return (
        <div className="space-y-8">
            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-medium font-serif">
                        Default assistant
                    </h2>
                    <p className="text-sm text-gray-500 max-w-2xl">
                        Choose the default assistant for tabular reviews. Gary
                        only shows providers configured on the server.
                    </p>
                </div>

                <div className="max-w-md">
                    <label className="text-sm text-gray-600 block mb-2">
                        Assistant for tabular reviews
                    </label>
                    <TabularModelDropdown
                        value={profile?.tabularModel ?? "gemini-3-flash-preview"}
                        providerAvailability={providerAvailability}
                        onChange={(id) =>
                            updateModelPreference("tabularModel", id)
                        }
                    />
                </div>
            </section>

            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-medium font-serif">
                        Provider status
                    </h2>
                    <p className="text-sm text-gray-500 max-w-2xl">
                        Model providers are configured by the administrator on
                        the backend. No user API keys are required.
                    </p>
                </div>

                {!providerAvailability ||
                !Object.values(providerAvailability).some(Boolean) ? (
                    <div className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        GaryOSS is not configured yet. Contact the
                        administrator.
                    </div>
                ) : null}

                <div className="max-w-2xl space-y-3">
                    <ProviderRow
                        label={providerLabel("openai")}
                        available={!!providerAvailability?.openai}
                    />
                    <ProviderRow
                        label={providerLabel("gemini")}
                        available={!!providerAvailability?.gemini}
                    />
                    <ProviderRow
                        label={providerLabel("claude")}
                        available={!!providerAvailability?.claude}
                    />
                </div>
            </section>
        </div>
    );
}

function ProviderRow({
    label,
    available,
}: {
    label: string;
    available: boolean;
}) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
                {available ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm text-gray-900">{label}</span>
            </div>
            <span
                className={`text-xs font-medium ${available ? "text-emerald-700" : "text-amber-700"}`}
            >
                {available ? "Configured" : "Unavailable"}
            </span>
        </div>
    );
}

function TabularModelDropdown({
    value,
    onChange,
    providerAvailability,
}: {
    value: string;
    onChange: (id: string) => void;
    providerAvailability: ProviderAvailability | null;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selected = MODELS.find((m) => m.id === value);
    const selectedAvailable = isModelAvailable(value, providerAvailability);
    const groups: ("Anthropic" | "Google" | "OpenAI")[] = [
        "Anthropic",
        "Google",
        "OpenAI",
    ];

    return (
        <DropdownMenu onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm flex items-center justify-between gap-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                    <span className="flex items-center gap-2 min-w-0">
                        {!selectedAvailable && (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        )}
                        <span className="truncate text-gray-900">
                            {selected?.label ?? "Select an assistant"}
                        </span>
                    </span>
                    <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="z-50"
                style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}
                align="start"
            >
                {groups.map((group, gi) => {
                    const items = MODELS.filter((m) => m.group === group);
                    if (items.length === 0) return null;
                    return (
                        <div key={group}>
                            {gi > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400">
                                {group}
                            </DropdownMenuLabel>
                            {items.map((m) => {
                                const provider = modelGroupToProvider(m.group);
                                const available = isModelAvailable(
                                    m.id,
                                    providerAvailability,
                                );
                                return (
                                    <DropdownMenuItem
                                        key={m.id}
                                        className="cursor-pointer"
                                        disabled={!available}
                                        onSelect={() => {
                                            if (available) onChange(m.id);
                                        }}
                                        title={
                                            !available
                                                ? `${providerLabel(provider)} is not configured on the server`
                                                : undefined
                                        }
                                    >
                                        <span
                                            className={`flex-1 ${available ? "" : "text-gray-400"}`}
                                        >
                                            {m.label}
                                        </span>
                                        {!available && (
                                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 ml-1" />
                                        )}
                                        {m.id === value && available && (
                                            <Check className="h-3.5 w-3.5 text-gray-600 ml-1" />
                                        )}
                                    </DropdownMenuItem>
                                );
                            })}
                        </div>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
