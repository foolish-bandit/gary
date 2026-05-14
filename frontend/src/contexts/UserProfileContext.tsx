"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
    getUserProfile,
    updateUserProfile,
    type ProviderAvailability,
    type UserProfileResponse,
} from "@/app/lib/mikeApi";

interface UserProfile {
    displayName: string | null;
    organisation: string | null;
    messageCreditsUsed: number;
    creditsResetDate: string;
    creditsRemaining: number;
    tier: string;
    tabularModel: string;
    providerAvailability: ProviderAvailability;
}

interface UserProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    updateDisplayName: (name: string) => Promise<boolean>;
    updateOrganisation: (organisation: string) => Promise<boolean>;
    updateModelPreference: (
        field: "tabularModel",
        value: string,
    ) => Promise<boolean>;
    reloadProfile: () => Promise<void>;
    incrementMessageCredits: () => Promise<boolean>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
    undefined,
);

const MONTHLY_CREDIT_LIMIT = 999999;

function defaultResetDate(): string {
    const futureResetDate = new Date();
    futureResetDate.setDate(futureResetDate.getDate() + 30);
    return futureResetDate.toISOString();
}

function fallbackProfile(): UserProfile {
    return {
        displayName: null,
        organisation: null,
        messageCreditsUsed: 0,
        creditsResetDate: defaultResetDate(),
        creditsRemaining: MONTHLY_CREDIT_LIMIT,
        tier: "Free",
        tabularModel: "gemini-3-flash-preview",
        providerAvailability: {
            openai: false,
            gemini: false,
            claude: false,
        },
    };
}

function mapServerProfile(data: UserProfileResponse): UserProfile {
    let creditsUsed = data.message_credits_used;
    let resetDate = data.credits_reset_date ?? defaultResetDate();
    if (new Date() > new Date(resetDate)) {
        creditsUsed = 0;
        resetDate = defaultResetDate();
    }

    return {
        displayName: data.display_name,
        organisation: data.organisation ?? null,
        messageCreditsUsed: creditsUsed,
        creditsResetDate: resetDate,
        creditsRemaining: MONTHLY_CREDIT_LIMIT - creditsUsed,
        tier: data.tier || "Free",
        tabularModel: data.tabular_model || "gemini-3-flash-preview",
        providerAvailability: data.provider_availability,
    };
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async () => {
        try {
            const data = await getUserProfile();
            setProfile(mapServerProfile(data));
        } catch {
            setProfile(fallbackProfile());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            setLoading(true);
            void loadProfile();
        } else {
            setProfile(null);
            setLoading(false);
        }
    }, [isAuthenticated, user, loadProfile]);

    const updateDisplayName = useCallback(
        async (displayName: string): Promise<boolean> => {
            if (!user) return false;
            try {
                const data = await updateUserProfile({
                    display_name: displayName.trim(),
                });
                setProfile(mapServerProfile(data));
                return true;
            } catch {
                return false;
            }
        },
        [user],
    );

    const updateOrganisation = useCallback(
        async (organisation: string): Promise<boolean> => {
            if (!user) return false;
            try {
                const data = await updateUserProfile({
                    organisation: organisation.trim(),
                });
                setProfile(mapServerProfile(data));
                return true;
            } catch {
                return false;
            }
        },
        [user],
    );

    const updateModelPreference = useCallback(
        async (
            field: "tabularModel",
            value: string,
        ): Promise<boolean> => {
            if (!user || field !== "tabularModel") return false;
            try {
                const data = await updateUserProfile({
                    tabular_model: value,
                });
                setProfile(mapServerProfile(data));
                return true;
            } catch {
                return false;
            }
        },
        [user],
    );

    const reloadProfile = useCallback(async () => {
        if (user) {
            setLoading(true);
            await loadProfile();
        }
    }, [user, loadProfile]);

    const incrementMessageCredits = useCallback(async (): Promise<boolean> => {
        if (!user || !profile) {
            return false;
        }

        if (profile.creditsRemaining <= 0) {
            return false;
        }

        try {
            const newCreditsUsed = profile.messageCreditsUsed + 1;

            const { error } = await supabase
                .from("user_profiles")
                .update({
                    message_credits_used: newCreditsUsed,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);

            if (error) {
                throw error;
            }

            setProfile((prev) =>
                prev
                    ? {
                          ...prev,
                          messageCreditsUsed: newCreditsUsed,
                          creditsRemaining: MONTHLY_CREDIT_LIMIT - newCreditsUsed,
                      }
                    : null,
            );

            return true;
        } catch {
            return false;
        }
    }, [user, profile]);

    return (
        <UserProfileContext.Provider
            value={{
                profile,
                loading,
                updateDisplayName,
                updateOrganisation,
                updateModelPreference,
                reloadProfile,
                incrementMessageCredits,
            }}
        >
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    const context = useContext(UserProfileContext);
    if (context === undefined) {
        throw new Error(
            "useUserProfile must be used within a UserProfileProvider",
        );
    }
    return context;
}
