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
            entry = { lastFetchedAt: null, inflight: null, inflightForced: false };
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

        while (entry.inflight) {
            if (!force || entry.inflightForced) {
                return entry.inflight;
            }
            // Force must not resolve with a non-forced fetch that started earlier.
            await entry.inflight.catch(() => undefined);
        }

        const maxAgeMs = ensureOptions.maxAgeMs ?? options.defaultMaxAgeMs;
        if (!force && isFresh(key, maxAgeMs)) return;

        const request = (async () => {
            try {
                await loader();
                entry.lastFetchedAt = now();
            } finally {
                entry.inflight = null;
                entry.inflightForced = false;
            }
        })();

        entry.inflight = request;
        entry.inflightForced = force;
        return request;
    }

    function invalidate(keyOrPrefix: string): void {
        if (keyOrPrefix === '*') {
            for (const entry of entries.values()) entry.lastFetchedAt = null;
            return;
        }
        if (keyOrPrefix.endsWith('*')) {
            const prefix = keyOrPrefix.slice(0, -1);
            for (const [key, entry] of entries) {
                if (key.startsWith(prefix)) entry.lastFetchedAt = null;
            }
            return;
        }
        getOrCreate(keyOrPrefix).lastFetchedAt = null;
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
