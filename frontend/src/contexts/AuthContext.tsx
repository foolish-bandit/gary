"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import {
    isDevAuthBypassEnabled,
    verifyWorkspaceAccess,
    WORKSPACE_ACCESS_DENIED_MESSAGE,
} from "@/lib/workspaceAccess";

interface User {
    id: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    authLoading: boolean;
    isAuthBypassed: boolean;
    authError: string | null;
    clearAuthError: () => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SKIP_AUTH = isDevAuthBypassEnabled();
const HAS_SKIP_AUTH_FLAG = process.env.NEXT_PUBLIC_GARY_SKIP_AUTH === "true";

const DEMO_USER: User = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "demo@gary.local",
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() =>
        SKIP_AUTH ? DEMO_USER : null,
    );
    const [authLoading, setAuthLoading] = useState(() => !SKIP_AUTH);
    const [authError, setAuthError] = useState<string | null>(null);

    async function bootstrapSession(session: {
        access_token: string;
        user: { id: string; email?: string | null };
    } | null): Promise<void> {
        if (!session?.user) {
            setUser(null);
            setAuthLoading(false);
            return;
        }

        const access = await verifyWorkspaceAccess(session.access_token);
        if (!access.ok) {
            if (access.denySession) {
                await supabase.auth.signOut();
                setUser(null);
                setAuthError(access.message || WORKSPACE_ACCESS_DENIED_MESSAGE);
                setAuthLoading(false);
                return;
            }

            setAuthError(null);
            setUser({
                id: session.user.id,
                email: session.user.email || "",
            });
            setAuthLoading(false);
            return;
        }

        setAuthError(null);
        setUser({
            id: session.user.id,
            email: session.user.email || "",
        });
        setAuthLoading(false);
    }

    useEffect(() => {
        if (SKIP_AUTH) {
            if (typeof window !== "undefined") {
                console.warn(
                    "[GaryOSS] NEXT_PUBLIC_GARY_SKIP_AUTH=true - running with a fake demo user. Backend calls will not be authenticated. Do not enable this in production.",
                );
            }
            return;
        }

        if (HAS_SKIP_AUTH_FLAG && typeof window !== "undefined") {
            console.error(
                "[GaryOSS] NEXT_PUBLIC_GARY_SKIP_AUTH=true was ignored because production auth bypass is disabled.",
            );
        }

        void (async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            await bootstrapSession(session);
        })();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuthLoading(true);
            void bootstrapSession(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const clearAuthError = () => setAuthError(null);

    const signOut = async () => {
        if (SKIP_AUTH) {
            return;
        }
        await supabase.auth.signOut();
        setUser(null);
        setAuthError(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                authLoading,
                isAuthBypassed: SKIP_AUTH,
                authError,
                clearAuthError,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
