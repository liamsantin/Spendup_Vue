import { describe, expect, it, vi } from 'vitest';
import { createResourceCache } from '../resource-cache';

describe('createResourceCache', () => {
    it('partage la même Promise pour deux ensure concurrents', async () => {
        let resolveLoader: (() => void) | undefined;
        const loader = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveLoader = resolve;
                })
        );
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => 1_000 });

        const first = cache.ensure('accounts', loader);
        const second = cache.ensure('accounts', loader);
        expect(loader).toHaveBeenCalledTimes(1);
        expect(cache.getMeta('accounts').inflight).toBe(true);

        resolveLoader?.();
        await Promise.all([first, second]);
        expect(loader).toHaveBeenCalledTimes(1);
        expect(cache.getMeta('accounts').inflight).toBe(false);
        expect(cache.isFresh('accounts')).toBe(true);
    });

    it('ne refetch pas tant que le TTL est valide', async () => {
        let now = 1_000;
        const loader = vi.fn(async () => undefined);
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => now });

        await cache.ensure('accounts', loader);
        await cache.ensure('accounts', loader);
        expect(loader).toHaveBeenCalledTimes(1);

        now = 1_000 + 59_999;
        await cache.ensure('accounts', loader);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('refetch après expiration du TTL ou force', async () => {
        let now = 1_000;
        const loader = vi.fn(async () => undefined);
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => now });

        await cache.ensure('accounts', loader);
        now = 1_000 + 60_000;
        await cache.ensure('accounts', loader);
        expect(loader).toHaveBeenCalledTimes(2);

        await cache.ensure('accounts', loader, { force: true });
        expect(loader).toHaveBeenCalledTimes(3);
    });

    it('n’est pas marqué frais si le loader échoue', async () => {
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => 1_000 });
        const loader = vi.fn(async () => {
            throw new Error('boom');
        });

        await expect(cache.ensure('accounts', loader)).rejects.toThrow('boom');
        expect(cache.isFresh('accounts')).toBe(false);
        expect(cache.getMeta('accounts').inflight).toBe(false);
    });

    it('invalide une clé, un préfixe, ou tout le cache', async () => {
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => 1_000 });
        await cache.ensure('detail:a', async () => undefined);
        await cache.ensure('detail:b', async () => undefined);
        await cache.ensure('accounts', async () => undefined);

        cache.invalidate('detail:*');
        expect(cache.isFresh('detail:a')).toBe(false);
        expect(cache.isFresh('detail:b')).toBe(false);
        expect(cache.isFresh('accounts')).toBe(true);

        cache.invalidate('accounts');
        expect(cache.isFresh('accounts')).toBe(false);

        cache.touch('accounts');
        expect(cache.isFresh('accounts')).toBe(true);
        cache.invalidate('*');
        expect(cache.isFresh('accounts')).toBe(false);
    });

    it('force attend un inflight non forcé puis refetch', async () => {
        const resolvers: Array<() => void> = [];
        const loader = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolvers.push(resolve);
                })
        );
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => 1_000 });

        const soft = cache.ensure('accounts', loader);
        const forced = cache.ensure('accounts', loader, { force: true });
        expect(loader).toHaveBeenCalledTimes(1);

        resolvers[0]?.();
        await soft;
        await Promise.resolve();
        expect(loader).toHaveBeenCalledTimes(2);

        resolvers[1]?.();
        await forced;
        expect(loader).toHaveBeenCalledTimes(2);
        expect(cache.isFresh('accounts')).toBe(true);
    });

    it('deux force concurrents partagent le refetch forcé après un inflight soft', async () => {
        const resolvers: Array<() => void> = [];
        const loader = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolvers.push(resolve);
                })
        );
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => 1_000 });

        const soft = cache.ensure('accounts', loader);
        const forcedA = cache.ensure('accounts', loader, { force: true });
        const forcedB = cache.ensure('accounts', loader, { force: true });
        expect(loader).toHaveBeenCalledTimes(1);

        resolvers[0]?.();
        await soft;
        await Promise.resolve();
        expect(loader).toHaveBeenCalledTimes(2);

        resolvers[1]?.();
        await Promise.all([forcedA, forcedB]);
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('force rejoint un inflight déjà forcé', async () => {
        let resolveLoader: (() => void) | undefined;
        const loader = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveLoader = resolve;
                })
        );
        const cache = createResourceCache({ defaultMaxAgeMs: 60_000, now: () => 1_000 });

        const first = cache.ensure('accounts', loader, { force: true });
        const second = cache.ensure('accounts', loader, { force: true });
        expect(loader).toHaveBeenCalledTimes(1);

        resolveLoader?.();
        await Promise.all([first, second]);
        expect(loader).toHaveBeenCalledTimes(1);
    });
});
