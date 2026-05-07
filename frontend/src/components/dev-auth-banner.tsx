"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Slim top-of-page strip rendered when NEXT_PUBLIC_GARY_SKIP_AUTH=true. Used
 * by `(pages)/layout.tsx` to make it obvious that the running session is the
 * fake demo user from AuthContext.
 */
export function DevAuthBanner() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-medium text-amber-900 bg-amber-100 border-b border-amber-200 shrink-0"
        >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            <span>Dev auth bypass enabled</span>
        </div>
    );
}
