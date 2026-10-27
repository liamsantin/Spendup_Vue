import { AppError } from '@/utils/errors/app-error';
import { assetsApi } from '@/features/assets/api';
import { buildSaveValuationPayload, type AssetSubPayloadContext, type AssetValuationFormFields } from '@/features/assets/payload';
import type { AssetValuation } from '@/features/assets/types';
import { assetPayloadErrorMessage, type AssetsCrud } from '@/features/assets/stores/internal/assets-crud';
import type { AssetsState } from '@/features/assets/stores/internal/assets-state';

type ValuationsDeps = Pick<AssetsCrud, 'fetchAsset' | 'rememberSubResourceError'>;

function sortNewestFirst(items: AssetValuation[]): AssetValuation[] {
    return [...items].sort((a, b) => (a.valuationDate < b.valuationDate ? 1 : a.valuationDate > b.valuationDate ? -1 : 0));
}

/** Valorisations d’un actif (clé = date). Après POST / DELETE : refetch l’actif (`estimatedValue`, `lastValuationDate`). */
export function createAssetsValuations(state: AssetsState, deps: ValuationsDeps) {
    const { valuationsById, loadingValuations, cache, clearError, beginActing, endActing, rememberLocalMutation } = state;
    const { fetchAsset, rememberSubResourceError } = deps;

    function cacheKey(publicId: string): string {
        return `valuations:${publicId}`;
    }

    async function loadValuations(publicId: string, options: { from?: string; to?: string; force?: boolean } = {}) {
        const id = publicId.trim();
        if (!id) return;
        const ranged = !!(options.from || options.to);
        loadingValuations.value = true;
        try {
            if (ranged) {
                // Une plage explicite n’est pas mise en cache : elle remplace la liste affichée.
                const result = await assetsApi.listValuations(id, { from: options.from, to: options.to });
                valuationsById.set(id, sortNewestFirst(Array.isArray(result?.items) ? result.items : []));
                return;
            }
            await cache.ensure(
                cacheKey(id),
                async () => {
                    const result = await assetsApi.listValuations(id);
                    valuationsById.set(id, sortNewestFirst(Array.isArray(result?.items) ? result.items : []));
                },
                { force: !!options.force }
            );
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            loadingValuations.value = false;
        }
    }

    async function saveValuation(publicId: string, fields: AssetValuationFormFields, context: AssetSubPayloadContext = {}) {
        const id = publicId.trim();
        beginActing();
        clearError();
        try {
            const built = buildSaveValuationPayload(fields, context);
            if (!built.ok) throw new AppError(assetPayloadErrorMessage(built.code), 400, built.code);
            const saved = await assetsApi.saveValuation(id, built.payload);
            const current = valuationsById.get(id) ?? [];
            valuationsById.set(id, sortNewestFirst([...current.filter((item) => item.valuationDate !== saved.valuationDate), saved]));
            cache.touch(cacheKey(id));
            rememberLocalMutation(id);
            await fetchAsset(id, true).catch(() => undefined);
            return saved;
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            endActing();
        }
    }

    async function deleteValuation(publicId: string, valuationDate: string) {
        const id = publicId.trim();
        beginActing();
        clearError();
        try {
            await assetsApi.removeValuation(id, valuationDate);
            const current = valuationsById.get(id) ?? [];
            valuationsById.set(
                id,
                current.filter((item) => item.valuationDate !== valuationDate)
            );
            cache.touch(cacheKey(id));
            rememberLocalMutation(id);
            await fetchAsset(id, true).catch(() => undefined);
        } catch (e: unknown) {
            // 400 (dernière valorisation) → message API ; 404 → actif introuvable.
            throw rememberSubResourceError(e, id);
        } finally {
            endActing();
        }
    }

    return { loadValuations, saveValuation, deleteValuation };
}

export type AssetsValuations = ReturnType<typeof createAssetsValuations>;
