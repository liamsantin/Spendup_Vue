export type EnsureOptions = {
    /**
     * Ignore TTL and refetch.
     * Non-force callers still join an in-flight request.
     * A force caller joins only an in-flight *forced* request; if a non-forced
     * request is in flight, it waits for it then starts a fresh forced fetch
     * (so acceptShare / realtime cannot resolve with pre-mutation data).
     */
    force?: boolean;
    /** Override the cache default TTL for this call. */
    maxAgeMs?: number;
};

export type ResourceMeta = {
    lastFetchedAt: number | null;
    inflight: boolean;
};

export type ResourceCacheOptions = {
    defaultMaxAgeMs: number;
    now?: () => number;
};

type CacheEntry = {
    lastFetchedAt: number | null;
    inflight: Promise<void> | null;
    /** True when the current inflight was started with `force: true`. */
    inflightForced: boolean;
    /** Bumped by `invalidate` so soft joiners refetch instead of keeping a stale TTL. */
    generation: number;
};

/**
 * In-memory TTL + in-flight dedupe for Pinia stores.
 * Convention: `ensure` by default; `force` only after a failed local mutation,
 * a user “refresh” action, or realtime invalidation.
 */
export function createResourceCache(options: ResourceCacheOptions) {
    const entries = new Map<string, CacheEntry>();
    const now = options.now ?? (() => Date.now());

    function getOrCreate(key: string): CacheEntry {
        let entry = entries.get(key);
        if (!entry) {
            entry = { lastFetchedAt: null, inflight: null, inflightForced: false, generation: 0 };
            entries.set(key, entry);
        }
        return entry;
    }

    function isFresh(key: string, maxAgeMs = options.defaultMaxAgeMs): boolean {
        const entry = entries.get(key);
        if (!entry?.lastFetchedAt) return false;
        return now() - entry.lastFetchedAt < maxAgeMs;
    }

    async function ensure(key: string, loader: () => Promise<void>, ensureOptions: EnsureOptions = {}): Promise<void> {
        const entry = getOrCreate(key);
        const force = !!ensureOptions.force;
        const maxAgeMs = ensureOptions.maxAgeMs ?? options.defaultMaxAgeMs;
        const startGen = entry.generation;

        for (;;) {
            if (entry.inflight) {
                if (force && !entry.inflightForced) {
                    // Force must not resolve with a non-forced fetch that started earlier.
                    await entry.inflight.catch(() => undefined);
                    continue;
                }
                if (force && entry.inflightForced) {
                    await entry.inflight.catch(() => undefined);
                    // Invalidate pendant le GET forcé partagé → refetch.
                    if (entry.generation === startGen && isFresh(key, maxAgeMs)) return;
                    continue;
                }
                // Soft: wait, then re-check (invalidate may have bumped generation).
                await entry.inflight.catch(() => undefined);
                if (entry.generation === startGen && isFresh(key, maxAgeMs)) return;
                continue;
            }

            if (!force && isFresh(key, maxAgeMs)) return;

            const fetchGen = entry.generation;
            // Holder so the finally clause can identity-check this fetch without TS2454
            // (`const request = (async () => request)()` is used-before-assigned).
            const inflight = { promise: undefined as Promise<void> | undefined };
            inflight.promise = (async () => {
                try {
                    await loader();
                    // Invalidate pendant le GET : ne pas re-marquer le TTL frais.
                    if (entry.generation === fetchGen) {
                        entry.lastFetchedAt = now();
                    }
                } finally {
                    if (entry.inflight === inflight.promise) {
                        entry.inflight = null;
                        entry.inflightForced = false;
                    }
                }
            })();

            entry.inflight = inflight.promise;
            entry.inflightForced = force;
            await inflight.promise;
            return;
        }
    }

    function bumpGeneration(entry: CacheEntry): void {
        entry.lastFetchedAt = null;
        entry.generation += 1;
    }

    function invalidate(keyOrPrefix: string): void {
        if (keyOrPrefix === '*') {
            for (const entry of entries.values()) bumpGeneration(entry);
            return;
        }
        if (keyOrPrefix.endsWith('*')) {
            const prefix = keyOrPrefix.slice(0, -1);
            for (const [key, entry] of entries) {
                if (key.startsWith(prefix)) bumpGeneration(entry);
            }
            return;
        }
        bumpGeneration(getOrCreate(keyOrPrefix));
    }

    function touch(key: string): void {
        getOrCreate(key).lastFetchedAt = now();
    }

    function getMeta(key: string): ResourceMeta {
        const entry = entries.get(key);
        return {
            lastFetchedAt: entry?.lastFetchedAt ?? null,
            inflight: !!entry?.inflight
        };
    }

    function reset(): void {
        entries.clear();
    }

    return {
        ensure,
        invalidate,
        touch,
        isFresh,
        getMeta,
        reset
    };
}

export type ResourceCache = ReturnType<typeof createResourceCache>;
