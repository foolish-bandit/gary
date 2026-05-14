const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export const WORKSPACE_ACCESS_DENIED_MESSAGE =
    "This email address is not authorized for this workspace.";

export function isDevAuthBypassEnabled(): boolean {
    return (
        process.env.NEXT_PUBLIC_GARY_SKIP_AUTH === "true" &&
        process.env.NODE_ENV !== "production"
    );
}

export async function verifyWorkspaceAccess(
    accessToken: string,
): Promise<
    | { ok: true }
    | { ok: false; message: string; denySession: boolean }
> {
    try {
        const response = await fetch(`${API_BASE}/user/profile`, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) return { ok: true };

        let detail = "Could not verify workspace access.";
        try {
            const body = (await response.json()) as {
                detail?: string;
                code?: string;
            };
            if (body.code === "workspace_access_denied") {
                return {
                    ok: false,
                    message:
                        body.detail ?? WORKSPACE_ACCESS_DENIED_MESSAGE,
                    denySession: true,
                };
            }
            detail = body.detail ?? detail;
        } catch {
            // Ignore parse failure and fall back to generic message.
        }

        return { ok: false, message: detail, denySession: false };
    } catch {
        return {
            ok: false,
            message: "Could not verify workspace access.",
            denySession: false,
        };
    }
}
