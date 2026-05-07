"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

interface User {
    id: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    authLoading: boolean;
    /** True when NEXT_PUBLIC_GARY_SKIP_AUTH=true — dev/demo only. */
    isAuthBypassed: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Resolved once at module load. NEXT_PUBLIC_* is baked into the client bundle
// at build time, so this is effectively a build-time toggle on the deployed
// Worker. Never enable in production.
const SKIP_AUTH = process.env.NEXT_PUBLIC_GARY_SKIP_AUTH === "true";

const DEMO_USER: User = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "demo@gary.local",
};

export function AuthProvider({ children }: { children: ReactNode }) {
    // Lazy initial state so the bypass needs no setState inside the effect.
    const [user, setUser] = useState<User | null>(() =>
        SKIP_AUTH ? DEMO_USER : null,
    );
    const [authLoading, setAuthLoading] = useState(() => !SKIP_AUTH);

    useEffect(() => {
        if (SKIP_AUTH) {
            if (typeof window !== "undefined") {
                console.warn(
                    "[GaryOSS] NEXT_PUBLIC_GARY_SKIP_AUTH=true — running with a fake demo user. Backend calls will not be authenticated. Do not enable this in production.",
                );
            }
            return;
        }

        const ensureProfile = async (accessToken: string) => {
            const apiBase =
                process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
            await fetch(`${apiBase}/user/profile`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            }).catch((e) => {
                console.log(e);
            });
        };

        const checkUser = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || "",
                });
                ensureProfile(session.access_token);
            }
            setAuthLoading(false);
        };

        checkUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || "",
                });
                ensureProfile(session.access_token);
            } else {
                setUser(null);
            }
            setAuthLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        if (SKIP_AUTH) {
            // No-op so the demo session stays stable. The bypass is build-time
            // and would re-create the fake user on next mount anyway.
            return;
        }
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                authLoading,
                isAuthBypassed: SKIP_AUTH,
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
