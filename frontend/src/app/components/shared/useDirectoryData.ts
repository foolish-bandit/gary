"use client";

import { useEffect, useState } from "react";
import { getProject, listProjects, listStandaloneDocuments } from "@/app/lib/mikeApi";
import type { MikeDocument, MikeProject } from "./types";

const CACHE_TTL_MS = 30_000;

interface DirectoryCache {
    standaloneDocuments: MikeDocument[];
    projects: MikeProject[];
    fetchedAt: number;
}

let cache: DirectoryCache | null = null;

export function invalidateDirectoryCache() {
    cache = null;
}

export function useDirectoryData(enabled: boolean) {
    const initialCache = enabled ? cache : null;
    const [loading, setLoading] = useState(() => !initialCache);
    const [standaloneDocuments, setStandaloneDocuments] = useState<MikeDocument[]>(
        () => initialCache?.standaloneDocuments ?? [],
    );
    const [projects, setProjects] = useState<MikeProject[]>(
        () => initialCache?.projects ?? [],
    );

    useEffect(() => {
        if (!enabled) return;

        if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
            return;
        }

        queueMicrotask(() => setLoading(true));
        Promise.all([listProjects(), listStandaloneDocuments()])
            .then(([ps, ds]) => {
                const sorted = [...ds].sort((a, b) =>
                    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
                );
                return Promise.all(ps.map((p) => getProject(p.id))).then(
                    (fullProjects) => {
                        cache = {
                            standaloneDocuments: sorted,
                            projects: fullProjects,
                            fetchedAt: Date.now(),
                        };
                        setStandaloneDocuments(sorted);
                        setProjects(fullProjects);
                    },
                );
            })
            .catch(() => {
                setStandaloneDocuments([]);
                setProjects([]);
            })
            .finally(() => setLoading(false));
    }, [enabled]);

    return { loading, standaloneDocuments, projects };
}
