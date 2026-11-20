import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import { instrumentsApi } from '@/features/investments/api';
import { normalizeInstrument } from '@/features/investments/format';
import {
    buildCreateInstrumentPayload,
    buildSetPricePayload,
    buildUpdateInstrumentPayload,
    type InstrumentFormFields,
    type InvestmentPayloadContext,
    type PriceFormFields
} from '@/features/investments/payload';
import {
    INSTRUMENT_NOT_FOUND_MESSAGE,
    INSTRUMENT_PAGE_SIZE_DEFAULT,
    INSTRUMENT_PAGE_SIZE_MAX,
    INSTRUMENT_PICKER_PAGE_SIZE,
    INSTRUMENT_SEARCH_MAX,
    type Instrument,
    type InstrumentType,
    type ListInstrumentsQuery
} from '@/features/investments/types';

export type InstrumentsLoadOptions = ListInstrumentsQuery & { force?: boolean };

/** Message client des erreurs de validation (le serveur renvoie les siennes en français). */
export function instrumentPayloadErrorMessage(code: string): string {
    switch (code) {
        case 'symbolRequired':
            return 'Le symbole est obligatoire.';
        case 'symbolTooLong':
            return 'Le symbole est trop long.';
        case 'nameRequired':
            return 'Le nom de l’instrument est obligatoire.';
        case 'nameTooLong':
            return 'Le nom de l’instrument dépasse 150 caractères.';
        case 'typeInvalid':
            return 'Le type d’instrument est invalide.';
        case 'currencyInvalid':
            return 'Devise non supportée (CHF, EUR, USD, GBP).';
        case 'isinInvalid':
            return 'L’ISIN doit compter 12 caractères (2 lettres de pays + 9 caractères + chiffre de contrôle).';
        case 'priceRequired':
        case 'priceInvalid':
        case 'priceNegative':
            return 'Le cours doit être un nombre positif ou nul.';
        case 'priceDateInvalid':
            return 'La date du cours est invalide.';
        case 'priceDateFuture':
            return 'La date du cours ne peut pas être dans le futur.';
        default:
            return 'Données invalides.';
    }
}

/**
 * Catalogue d’instruments personnel. Pas d’événement SignalR dédié : les listes sont rafraîchies
 * après chaque mutation locale et sur `investmentPriceUpdated` (via le store placements).
 */
export const useInstrumentsStore = defineStore('instruments', () => {
    const items = ref<Instrument[]>([]);
    const totalCount = ref(0);
    const page = ref(1);
    const pageSize = ref(INSTRUMENT_PAGE_SIZE_DEFAULT);
    const loading = ref(false);
    const acting = ref(false);
    const initialized = ref(false);
    const error = ref<string | null>(null);

    // Map non suivie par Vue : `knownVersion` est la dépendance réactive de `findByPublicId` / `allKnownItems`.
    const knownById = new Map<string, Instrument>();
    const knownVersion = ref(0);
    let actingDepth = 0;
    let listRequestSeq = 0;
    let activeQuery: { search: string; type: InstrumentType | null; page: number; pageSize: number } = {
        search: '',
        type: null,
        page: 1,
        pageSize: INSTRUMENT_PAGE_SIZE_DEFAULT
    };

    const hasItems = computed(() => items.value.length > 0);
    const hasMore = computed(() => page.value * pageSize.value < totalCount.value);

    function beginActing() {
        actingDepth += 1;
        acting.value = true;
    }

    function endActing() {
        actingDepth = Math.max(0, actingDepth - 1);
        acting.value = actingDepth > 0;
    }

    function clearError() {
        error.value = null;
    }

    function remember(instrument: Instrument): Instrument {
        const normalized = normalizeInstrument(instrument);
        knownById.set(normalized.publicId, normalized);
        knownVersion.value += 1;
        return normalized;
    }

    function forget(publicId: string) {
        if (knownById.delete(publicId)) knownVersion.value += 1;
        items.value = items.value.filter((item) => item.publicId !== publicId);
    }

    function findByPublicId(publicId: string): Instrument | null {
        void knownVersion.value;
        const id = publicId.trim();
        if (!id) return null;
        return knownById.get(id) ?? items.value.find((item) => item.publicId === id) ?? null;
    }

    function allKnownItems(): Instrument[] {
        void knownVersion.value;
        return [...knownById.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    function normalizeQuery(query: ListInstrumentsQuery) {
        const size = query.pageSize ?? INSTRUMENT_PAGE_SIZE_DEFAULT;
        return {
            search: (query.search ?? '').trim().slice(0, INSTRUMENT_SEARCH_MAX),
            type: query.type ?? null,
            page: Math.max(1, Math.floor(query.page ?? 1)),
            pageSize: Math.min(INSTRUMENT_PAGE_SIZE_MAX, Math.max(1, Math.floor(size)))
        };
    }

    async function loadList(query: InstrumentsLoadOptions = {}) {
        const normalized = normalizeQuery(query);
        const requestId = ++listRequestSeq;
        activeQuery = normalized;
        loading.value = true;
        clearError();
        try {
            const result = await instrumentsApi.list({
                search: normalized.search || undefined,
                type: normalized.type ?? undefined,
                page: normalized.page,
                pageSize: normalized.pageSize
            });
            if (requestId !== listRequestSeq) return;
            const nextItems = (Array.isArray(result?.items) ? result.items : []).map(remember);
            items.value = nextItems;
            totalCount.value = Number(result?.totalCount) || nextItems.length;
            page.value = Number(result?.page) || normalized.page;
            pageSize.value = Number(result?.pageSize) || normalized.pageSize;
        } catch (e: unknown) {
            if (requestId === listRequestSeq) error.value = AppError.fromUnknown(e).message;
            throw AppError.fromUnknown(e);
        } finally {
            if (requestId === listRequestSeq) {
                loading.value = false;
                initialized.value = true;
            }
        }
    }

    async function refetchActive() {
        if (!initialized.value) return;
        await loadList({ ...activeQuery, type: activeQuery.type ?? undefined, force: true }).catch(() => undefined);
    }

    /** Recherche serveur pour un sélecteur : n’altère pas la liste principale, indexe les résultats. */
    async function searchForPicker(search: string): Promise<Instrument[]> {
        const term = search.trim().slice(0, INSTRUMENT_SEARCH_MAX);
        try {
            const result = await instrumentsApi.list({ search: term || undefined, pageSize: INSTRUMENT_PICKER_PAGE_SIZE });
            return (Array.isArray(result?.items) ? result.items : []).map(remember);
        } catch (e: unknown) {
            throw AppError.fromUnknown(e);
        }
    }

    function handleNotFound(publicId: string) {
        error.value = INSTRUMENT_NOT_FOUND_MESSAGE;
        forget(publicId);
    }

    async function fetchInstrument(publicId: string, force = false): Promise<Instrument | null> {
        const id = publicId.trim();
        if (!id) return null;
        if (!force) {
            const known = findByPublicId(id);
            if (known) return known;
        }
        try {
            const fresh = remember(await instrumentsApi.get(id));
            items.value = items.value.map((item) => (item.publicId === fresh.publicId ? fresh : item));
            return fresh;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(id);
            else error.value = err.message;
            throw err;
        }
    }

    async function createInstrument(fields: InstrumentFormFields, context: InvestmentPayloadContext = {}): Promise<Instrument> {
        beginActing();
        clearError();
        try {
            const built = buildCreateInstrumentPayload(fields, context);
            if (!built.ok) throw new AppError(instrumentPayloadErrorMessage(built.code), 400, built.code);
            const created = remember(await instrumentsApi.create(built.payload));
            void refetchActive();
            return created;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function updateInstrument(publicId: string, fields: InstrumentFormFields): Promise<Instrument> {
        beginActing();
        clearError();
        try {
            const built = buildUpdateInstrumentPayload(fields);
            if (!built.ok) throw new AppError(instrumentPayloadErrorMessage(built.code), 400, built.code);
            const updated = remember(await instrumentsApi.update(publicId, built.payload));
            items.value = items.value.map((item) => (item.publicId === updated.publicId ? updated : item));
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId);
            else error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function setPrice(publicId: string, fields: PriceFormFields, context: InvestmentPayloadContext = {}): Promise<Instrument> {
        beginActing();
        clearError();
        try {
            const built = buildSetPricePayload(fields, context);
            if (!built.ok) throw new AppError(instrumentPayloadErrorMessage(built.code), 400, built.code);
            const updated = remember(await instrumentsApi.setPrice(publicId, built.payload));
            items.value = items.value.map((item) => (item.publicId === updated.publicId ? updated : item));
            return updated;
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId);
            else error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    async function deleteInstrument(publicId: string): Promise<void> {
        beginActing();
        clearError();
        try {
            await instrumentsApi.remove(publicId);
            forget(publicId);
            totalCount.value = Math.max(0, totalCount.value - 1);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404) handleNotFound(publicId);
            else error.value = err.message;
            throw err;
        } finally {
            endActing();
        }
    }

    /** Aucun flux temps réel propre : rien à brancher, gardé pour la symétrie du bootstrap. */
    function onAuthenticatedSession() {
        // no-op
    }

    function reset() {
        listRequestSeq += 1;
        items.value = [];
        totalCount.value = 0;
        page.value = 1;
        pageSize.value = INSTRUMENT_PAGE_SIZE_DEFAULT;
        loading.value = false;
        actingDepth = 0;
        acting.value = false;
        initialized.value = false;
        error.value = null;
        knownById.clear();
        knownVersion.value += 1;
        activeQuery = { search: '', type: null, page: 1, pageSize: INSTRUMENT_PAGE_SIZE_DEFAULT };
    }

    return {
        items,
        totalCount,
        page,
        pageSize,
        loading,
        acting,
        initialized,
        error,
        hasItems,
        hasMore,
        clearError,
        findByPublicId,
        allKnownItems,
        loadList,
        refetchActive,
        searchForPicker,
        fetchInstrument,
        createInstrument,
        updateInstrument,
        setPrice,
        deleteInstrument,
        onAuthenticatedSession,
        reset
    };
});
