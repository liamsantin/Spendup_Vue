export type EnsureOptions = {
    /** Ignore TTL and refetch. Join an in-flight request if one exists. */
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
            entry = { lastFetchedAt: null, inflight: null };
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
        if (entry.inflight) return entry.inflight;

        const maxAgeMs = ensureOptions.maxAgeMs ?? options.defaultMaxAgeMs;
        if (!ensureOptions.force && isFresh(key, maxAgeMs)) return;

        const request = (async () => {
            try {
                await loader();
                entry.lastFetchedAt = now();
            } finally {
                entry.inflight = null;
            }
        })();

        entry.inflight = request;
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
