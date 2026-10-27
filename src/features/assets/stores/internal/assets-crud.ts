import { AppError } from '@/utils/errors/app-error';
import { assetsApi } from '@/features/assets/api';
import { normalizeAsset, normalizeListQuery } from '@/features/assets/format';
import {
    buildCreateAssetPayload,
    buildUpdateAssetPayload,
    type AssetFormFields,
    type AssetPayloadContext
} from '@/features/assets/payload';
import { ASSET_NOT_FOUND_MESSAGE, type Asset, type ListAssetsQuery } from '@/features/assets/types';
import { listCacheKey, type AssetsState } from '@/features/assets/stores/internal/assets-state';

export const ASSET_NOT_FOUND_CODE = 'asset_not_found';
export const ASSET_SUB_RESOURCE_NOT_FOUND_MESSAGE = 'Élément introuvable.';

/** Message de repli (le composant affiche `assetsPage.form.errors.<code>` traduit). */
export function assetPayloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return "Le nom de l'actif est obligatoire.";
        case 'nameTooLong':
            return "Le nom de l'actif dépasse 150 caractères.";
        case 'typeInvalid':
            return "Le type d'actif est invalide.";
        case 'estimatedValueInvalid':
        case 'estimatedValueNegative':
            return 'La valeur estimée doit être un montant positif ou nul.';
        case 'acquisitionPriceInvalid':
        case 'acquisitionPriceNegative':
            return "Le prix d'acquisition doit être un montant positif ou nul.";
        case 'acquisitionDateInvalid':
            return "La date d'acquisition est invalide.";
        case 'descriptionTooLong':
            return 'La description dépasse 500 caractères.';
        case 'notesTooLong':
            return 'Les notes dépassent 2000 caractères.';
        case 'currencyInvalid':
            return 'Devise non supportée (CHF, EUR, USD, GBP).';
        case 'currencyLocked':
            return "La devise d'un actif ne peut pas être modifiée.";
        case 'vehicleBrandRequired':
            return 'La marque du véhicule est obligatoire.';
        case 'vehicleModelRequired':
            return 'Le modèle du véhicule est obligatoire.';
        case 'cryptoNameRequired':
            return 'Le nom de la cryptomonnaie est obligatoire.';
        case 'cryptoSymbolRequired':
            return 'Le symbole est obligatoire.';
        case 'cryptoQuantityInvalid':
            return 'La quantité doit être un nombre positif ou nul.';
        case 'accountInvalid':
            return 'Le compte lié doit être un compte actif dont vous êtes propriétaire.';
        case 'countryInvalid':
            return 'Le pays doit être un code à 2 lettres.';
        default:
            return 'Données invalides.';
    }
}

export function createAssetsCrud(state: AssetsState) {
    const {
        loading,
        error,
        cache,
        initialized,
        clearError,
        beginActing,
        endActing,
        setList,
        activateList,
        upsertItem,
        removeItemLocal,
        invalidateAllLists,
        rememberLocalMutation,
        notifyDeleted,
        findByPublicId
    } = state;

    let listRequestSeq = 0;

    function rememberNotFound() {
        error.value = ASSET_NOT_FOUND_MESSAGE;
    }

    function touchHydratedListCaches() {
        for (const key of state.itemsByListKey.keys()) {
            cache.touch(key);
        }
    }

    /** 404 → message neutre + retrait local + invalidation ; sinon message API. */
    function rememberError(e: unknown, publicId?: string): AppError {
        const err = AppError.fromUnknown(e);
        if (err.status === 404 && publicId) {
            rememberNotFound();
            removeItemLocal(publicId);
            invalidateAllLists();
        } else {
            error.value = err.message;
        }
        return err;
    }

    /**
     * Erreur sur une sous-ressource (valorisation, relevé, entretien) : un 404 peut viser la
     * sous-ressource ou l’actif → message neutre, sous-listes invalidées, refetch silencieux de l’actif
     * (qui retire l’actif localement s’il a disparu).
     */
    function rememberSubResourceError(e: unknown, publicId: string): AppError {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            error.value = ASSET_SUB_RESOURCE_NOT_FOUND_MESSAGE;
            state.invalidateSubLists(publicId);
            void fetchAsset(publicId, true).catch(() => undefined);
        } else {
            error.value = err.message;
        }
        return err;
    }

    async function loadList(query: ListAssetsQuery & { force?: boolean } = {}) {
        const normalized = normalizeListQuery(query);
        const key = listCacheKey(normalized);
        const requestId = ++listRequestSeq;
        const force = !!query.force;
        activateList(key);
        loading.value = true;
        clearError();

        async function fetchList(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await assetsApi.list({
                            type: normalized.type ?? undefined,
                            active: normalized.active ?? undefined
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = (Array.isArray(result?.items) ? result.items : []).map(normalizeAsset);
                        setList(key, nextItems, { totalCount: result?.totalCount ?? nextItems.length });
                        applied = true;
                    } catch (e: unknown) {
                        if (requestId === listRequestSeq) {
                            error.value = AppError.fromUnknown(e).message;
                        }
                        throw e;
                    }
                },
                { force: ensureForce }
            );
            return applied;
        }

        try {
            const applied = await fetchList(force);
            if (requestId === listRequestSeq && (force || !cache.isFresh(key)) && !applied) {
                await fetchList(true);
            }
        } finally {
            if (requestId === listRequestSeq) {
                loading.value = false;
                initialized.value = true;
            }
        }
        if (requestId !== listRequestSeq) {
            cache.invalidate(key);
            return;
        }
        activateList(key);
    }

    function cancelPendingLoads() {
        listRequestSeq += 1;
        loading.value = false;
    }

    async function refetchActive(force = true) {
        const query = state.activeQuery.value;
        await loadList({
            type: query.type ?? undefined,
            active: query.active ?? undefined,
            force
        }).catch(() => undefined);
    }

    /** GET détail : `realEstate.summary` renseigné ici seulement, conservé ensuite par `rememberKnown`. */
    async function fetchAsset(publicId: string, force = false): Promise<Asset | null> {
        const id = publicId.trim();
        if (!id) return null;
        if (!force) {
            const known = findByPublicId(id);
            if (known) return known;
        }
        try {
            const asset = normalizeAsset(await assetsApi.get(id));
            upsertItem(asset, { replaceSummary: true });
            return asset;
        } catch (e: unknown) {
            throw rememberError(e, id);
        }
    }

    async function createAsset(fields: AssetFormFields, extra?: AssetPayloadContext) {
        beginActing();
        clearError();
        try {
            const built = buildCreateAssetPayload(fields, extra);
            if (!built.ok) {
                throw new AppError(assetPayloadErrorMessage(built.code), 400, built.code);
            }
            const created = normalizeAsset(await assetsApi.create(built.payload));
            upsertItem(created, { replaceSummary: true });
            touchHydratedListCaches();
            rememberLocalMutation(created.publicId);
            return created;
        } catch (e: unknown) {
            throw rememberError(e);
        } finally {
            endActing();
        }
    }

    async function updateAsset(publicId: string, fields: AssetFormFields, extra?: AssetPayloadContext) {
        beginActing();
        clearError();
        try {
            const current = findByPublicId(publicId);
            const built = buildUpdateAssetPayload(fields, {
                lockedCurrency: extra?.lockedCurrency ?? current?.currency ?? null,
                lockedType: extra?.lockedType ?? current?.type ?? null,
                allowedAccountIds: extra?.allowedAccountIds,
                isValueFromAccount: extra?.isValueFromAccount ?? current?.isValueFromAccount ?? false,
                currentEstimatedValue: extra?.currentEstimatedValue ?? current?.estimatedValue ?? null
            });
            if (!built.ok) {
                throw new AppError(assetPayloadErrorMessage(built.code), 400, built.code);
            }
            const updated = normalizeAsset(await assetsApi.update(publicId, built.payload));
            upsertItem(updated, { replaceSummary: true });
            touchHydratedListCaches();
            rememberLocalMutation(updated.publicId);
            // Un PUT avec une valeur différente crée / remplace la valorisation du jour.
            cache.invalidate(`valuations:${publicId}`);
            cache.invalidate(`mileages:${publicId}`);
            return updated;
        } catch (e: unknown) {
            throw rememberError(e, publicId);
        } finally {
            endActing();
        }
    }

    async function deleteAsset(publicId: string) {
        beginActing();
        clearError();
        try {
            await assetsApi.remove(publicId);
            removeItemLocal(publicId);
            touchHydratedListCaches();
            rememberLocalMutation(publicId);
            notifyDeleted(publicId);
        } catch (e: unknown) {
            const err = rememberError(e, publicId);
            if (err.status === 404) notifyDeleted(publicId);
            throw err;
        } finally {
            endActing();
        }
    }

    return {
        loadList,
        cancelPendingLoads,
        refetchActive,
        fetchAsset,
        createAsset,
        updateAsset,
        deleteAsset,
        rememberError,
        rememberSubResourceError
    };
}

export type AssetsCrud = ReturnType<typeof createAssetsCrud>;
