import { AppError } from '@/utils/errors/app-error';
import { tiersApi } from '@/features/tiers/api';
import { buildCreateTierPayload, buildUpdateTierPayload, type TierFormFields } from '@/features/tiers/payload';
import { matchesTierSearch } from '@/features/tiers/format';
import { TIER_PAGE_SIZE_DEFAULT, TIER_PAGE_SIZE_MAX, type ListTiersQuery, type Tier } from '@/features/tiers/types';
import { listCacheKey, normalizeListQuery, parseListCacheKey, type TiersState } from '@/features/tiers/stores/internal/tiers-state';

export const TIER_NOT_FOUND_CODE = 'tier_not_found';
export const TIER_NOT_FOUND_MESSAGE = 'Ce tiers n’est plus disponible.';

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Le nom du tiers est obligatoire.';
        case 'nameTooLong':
            return 'Le nom du tiers dépasse 200 caractères.';
        case 'nameDuplicate':
            return 'Un tiers porte déjà ce nom.';
        case 'natureInvalid':
            return 'Nature de tiers invalide.';
        case 'emailInvalid':
            return 'L’adresse e-mail est invalide.';
        case 'emailTooLong':
            return 'L’adresse e-mail dépasse 180 caractères.';
        case 'phoneInvalid':
            return 'Le numéro de téléphone est invalide.';
        case 'phoneTooLong':
            return 'Le numéro de téléphone dépasse 50 caractères.';
        case 'websiteInvalid':
            return 'Le site web doit être une URL http(s) valide.';
        case 'notesTooLong':
            return 'Les notes dépassent 4000 caractères.';
        case 'rolesInvalid':
            return 'Un rôle est inconnu.';
        case 'rolesDuplicate':
            return 'Un rôle est présent en double.';
        case 'personFirstNameTooLong':
        case 'personLastNameTooLong':
            return 'Le prénom et le nom dépassent 100 caractères.';
        case 'personBirthDateInvalid':
            return 'La date de naissance est invalide.';
        case 'personBirthDateFuture':
            return 'La date de naissance ne peut pas être dans le futur.';
        case 'companyLegalNameTooLong':
            return 'La raison sociale dépasse 200 caractères.';
        case 'companyVatNumberTooLong':
        case 'companyRegistrationNumberTooLong':
            return 'Les identifiants d’entreprise dépassent 100 caractères.';
        case 'organizationOfficialNameTooLong':
            return 'Le nom officiel dépasse 200 caractères.';
        case 'organizationTypeTooLong':
            return 'Le type d’organisation dépasse 100 caractères.';
        default:
            return 'Données invalides.';
    }
}

/**
 * CRUD listes paginées + mutations.
 */
export function createTiersCrud(state: TiersState) {
    const {
        items,
        itemsByListKey,
        activeListKey,
        page,
        pageSize,
        totalCount,
        loading,
        loadingMore,
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
        notifyDeleted
    } = state;

    let listRequestSeq = 0;

    function rememberNotFound() {
        error.value = TIER_NOT_FOUND_MESSAGE;
    }

    function touchHydratedListCaches() {
        for (const key of itemsByListKey.keys()) {
            cache.touch(key);
        }
    }

    async function loadList(query: ListTiersQuery & { force?: boolean } = {}) {
        const normalized = normalizeListQuery(query);
        const key = listCacheKey(normalized);
        const requestId = ++listRequestSeq;
        const force = !!query.force;
        activateList(key);
        loading.value = true;
        clearError();

        async function fetchPage(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await tiersApi.list({
                            nature: normalized.nature ?? undefined,
                            role: normalized.role ?? undefined,
                            search: normalized.search ?? undefined,
                            page: 1,
                            pageSize: query.pageSize ?? TIER_PAGE_SIZE_DEFAULT
                        });
                        if (requestId !== listRequestSeq) return;
                        const nextItems = Array.isArray(result?.items) ? result.items : [];
                        setList(key, nextItems, {
                            page: result?.page ?? 1,
                            pageSize: result?.pageSize ?? TIER_PAGE_SIZE_DEFAULT,
                            totalCount: result?.totalCount ?? nextItems.length
                        });
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
            const applied = await fetchPage(force);
            if (requestId === listRequestSeq && (force || !cache.isFresh(key)) && !applied) {
                await fetchPage(true);
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
        loadingMore.value = false;
    }

    async function loadMore() {
        if (loading.value || loadingMore.value) return;
        if (items.value.length >= totalCount.value) return;
        const key = activeListKey.value;
        const query = parseListCacheKey(key);
        const requestId = ++listRequestSeq;
        loadingMore.value = true;
        clearError();
        try {
            const nextPage = page.value + 1;
            const result = await tiersApi.list({
                nature: query.nature ?? undefined,
                role: query.role ?? undefined,
                search: query.search ?? undefined,
                page: nextPage,
                pageSize: pageSize.value || TIER_PAGE_SIZE_DEFAULT
            });
            if (requestId !== listRequestSeq) return;
            const incoming = Array.isArray(result?.items) ? result.items : [];
            const prev = itemsByListKey.get(key)?.items ?? [];
            const byId = new Map<string, Tier>();
            for (const item of prev) byId.set(item.publicId, item);
            for (const item of incoming) byId.set(item.publicId, item);
            setList(key, [...byId.values()], {
                page: result?.page ?? nextPage,
                pageSize: result?.pageSize ?? pageSize.value,
                totalCount: result?.totalCount ?? totalCount.value
            });
            cache.touch(key);
        } catch (e: unknown) {
            if (requestId === listRequestSeq) {
                error.value = AppError.fromUnknown(e).message;
            }
            throw e;
        } finally {
            if (requestId === listRequestSeq) {
                loadingMore.value = false;
            }
        }
    }

    /**
     * Recherche pour un sélecteur (pas d’impact sur la liste active) : `pageSize` max, résultats mémorisés dans l’index.
     */
    async function searchForPicker(search: string, options: { role?: ListTiersQuery['role'] } = {}): Promise<Tier[]> {
        const term = search.trim();
        const result = await tiersApi.list({
            role: options.role,
            page: 1,
            pageSize: TIER_PAGE_SIZE_MAX
        });
        const found = Array.isArray(result?.items) ? result.items : [];
        for (const tier of found) state.knownById.set(tier.publicId, tier);
        if (!term) return found;
        const byId = new Map<string, Tier>();
        for (const tier of found) byId.set(tier.publicId, tier);
        for (const tier of state.allKnownItems()) {
            if (matchesTierSearch(tier, term)) byId.set(tier.publicId, tier);
        }
        return [...byId.values()].filter((tier) => matchesTierSearch(tier, term));
    }

    /** Charge un tier (détail) et l’indexe ; `null` si 404. */
    async function fetchTier(publicId: string): Promise<Tier | null> {
        try {
            const tier = await tiersApi.get(publicId);
            upsertItem(tier);
            return tier;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                removeItemLocal(publicId);
                return null;
            }
            throw err;
        }
    }

    async function createTier(fields: TierFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildCreateTierPayload(fields, { knownTiers: state.allKnownItems() });
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const created = await tiersApi.create(built.payload);
            upsertItem(created);
            touchHydratedListCaches();
            rememberLocalMutation(created.publicId);
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updateTier(publicId: string, fields: TierFormFields) {
        beginActing();
        clearError();
        try {
            const built = buildUpdateTierPayload(fields, { knownTiers: state.allKnownItems(), excludePublicId: publicId });
            if (!built.ok) {
                throw new AppError(payloadErrorMessage(built.code), 400, built.code);
            }
            const updated = await tiersApi.update(publicId, built.payload);
            upsertItem(updated);
            touchHydratedListCaches();
            rememberLocalMutation(updated.publicId);
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                invalidateAllLists();
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    /**
     * Soft-delete. Un `400` (transactions vivantes liées) remonte avec le message serveur à afficher tel quel.
     */
    async function deleteTier(publicId: string) {
        beginActing();
        clearError();
        try {
            await tiersApi.remove(publicId);
            removeItemLocal(publicId);
            touchHydratedListCaches();
            rememberLocalMutation(publicId);
            notifyDeleted(publicId);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) {
                rememberNotFound();
                removeItemLocal(publicId);
                invalidateAllLists();
                notifyDeleted(publicId);
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    async function refetchActive(force = true) {
        const current = parseListCacheKey(activeListKey.value);
        await loadList({
            nature: current.nature ?? undefined,
            role: current.role ?? undefined,
            search: current.search ?? undefined,
            force
        }).catch(() => undefined);
    }

    return {
        loadList,
        loadMore,
        cancelPendingLoads,
        searchForPicker,
        fetchTier,
        createTier,
        updateTier,
        deleteTier,
        refetchActive
    };
}

export type TiersCrud = ReturnType<typeof createTiersCrud>;
