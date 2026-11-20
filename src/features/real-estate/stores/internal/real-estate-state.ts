import { reactive, ref } from 'vue';
import { createResourceCache } from '@/utils/helpers/resource-cache';
import type { RecurringIncome } from '@/features/recurring-payments/types';
import type {
    RealEstateCharge,
    RealEstateDocument,
    RealEstateMaintenance,
    RealEstateRental,
    RealEstateResourceKind,
    RealEstateUnit,
    RentalStatus
} from '@/features/real-estate/types';

export const REAL_ESTATE_LIST_MAX_AGE_MS = 30_000;

const EMPTY_UNITS: readonly RealEstateUnit[] = Object.freeze([]);
const EMPTY_CHARGES: readonly RealEstateCharge[] = Object.freeze([]);
const EMPTY_MAINTENANCE: readonly RealEstateMaintenance[] = Object.freeze([]);
const EMPTY_DOCUMENTS: readonly RealEstateDocument[] = Object.freeze([]);
const EMPTY_RENTALS: readonly RealEstateRental[] = Object.freeze([]);

/** Sous-listes d’un bien : chaque tableau est réactif, `loaded` indique quelles listes ont été chargées au moins une fois. */
export type RealEstateAssetBucket = {
    units: RealEstateUnit[];
    charges: RealEstateCharge[];
    maintenance: RealEstateMaintenance[];
    documents: RealEstateDocument[];
    rentals: RealEstateRental[];
    /** Filtre `status` de la liste de baux en place (`null` = tous). */
    rentalsStatus: RentalStatus | null;
    loaded: Record<RealEstateResourceKind, boolean>;
    loading: Record<RealEstateResourceKind, boolean>;
};

function emptyBucket(): RealEstateAssetBucket {
    return {
        units: [],
        charges: [],
        maintenance: [],
        documents: [],
        rentals: [],
        rentalsStatus: null,
        loaded: { units: false, charges: false, maintenance: false, documents: false, rentals: false },
        loading: { units: false, charges: false, maintenance: false, documents: false, rentals: false }
    };
}

export function listCacheKey(assetPublicId: string, kind: RealEstateResourceKind, status: RentalStatus | null = null): string {
    return kind === 'rentals' ? `${kind}:${assetPublicId}:${status ?? 'all'}` : `${kind}:${assetPublicId}`;
}

export function createRealEstateState() {
    // État indexé par `assetPublicId` : un seau réactif par bien ouvert.
    const buckets = reactive<Record<string, RealEstateAssetBucket>>({});

    const acting = ref(false);
    let actingDepth = 0;
    const error = ref<string | null>(null);

    /** Revenus récurrents (sélecteur du bail), chargés à la demande. */
    const recurringIncomes = ref<RecurringIncome[]>([]);
    const recurringIncomesLoaded = ref(false);

    const cache = createResourceCache({ defaultMaxAgeMs: REAL_ESTATE_LIST_MAX_AGE_MS });
    const recentMutations = new Map<string, ReturnType<typeof setTimeout>>();

    function bucketOf(assetPublicId: string): RealEstateAssetBucket | null {
        const id = assetPublicId.trim();
        return id ? (buckets[id] ?? null) : null;
    }

    function ensureBucket(assetPublicId: string): RealEstateAssetBucket {
        const id = assetPublicId.trim();
        if (!buckets[id]) buckets[id] = emptyBucket();
        return buckets[id];
    }

    function unitsFor(assetPublicId: string): readonly RealEstateUnit[] {
        return bucketOf(assetPublicId)?.units ?? EMPTY_UNITS;
    }

    function chargesFor(assetPublicId: string): readonly RealEstateCharge[] {
        return bucketOf(assetPublicId)?.charges ?? EMPTY_CHARGES;
    }

    function maintenanceFor(assetPublicId: string): readonly RealEstateMaintenance[] {
        return bucketOf(assetPublicId)?.maintenance ?? EMPTY_MAINTENANCE;
    }

    function documentsFor(assetPublicId: string): readonly RealEstateDocument[] {
        return bucketOf(assetPublicId)?.documents ?? EMPTY_DOCUMENTS;
    }

    function rentalsFor(assetPublicId: string): readonly RealEstateRental[] {
        return bucketOf(assetPublicId)?.rentals ?? EMPTY_RENTALS;
    }

    function rentalsStatusFor(assetPublicId: string): RentalStatus | null {
        return bucketOf(assetPublicId)?.rentalsStatus ?? null;
    }

    /** Chargement en cours : d’une liste donnée, ou de n’importe laquelle si `kind` est omis. */
    function loadingFor(assetPublicId: string, kind?: RealEstateResourceKind): boolean {
        const bucket = bucketOf(assetPublicId);
        if (!bucket) return false;
        if (kind) return bucket.loading[kind];
        return Object.values(bucket.loading).some(Boolean);
    }

    function isLoaded(assetPublicId: string, kind: RealEstateResourceKind): boolean {
        return bucketOf(assetPublicId)?.loaded[kind] ?? false;
    }

    function loadedKinds(assetPublicId: string): RealEstateResourceKind[] {
        const bucket = bucketOf(assetPublicId);
        if (!bucket) return [];
        return (Object.keys(bucket.loaded) as RealEstateResourceKind[]).filter((kind) => bucket.loaded[kind]);
    }

    function knownAssetIds(): string[] {
        return Object.keys(buckets);
    }

    function setLoading(assetPublicId: string, kind: RealEstateResourceKind, value: boolean) {
        ensureBucket(assetPublicId).loading[kind] = value;
    }

    function setList<K extends Exclude<RealEstateResourceKind, 'rentals'>>(
        assetPublicId: string,
        kind: K,
        items: RealEstateAssetBucket[K]
    ) {
        const bucket = ensureBucket(assetPublicId);
        (bucket[kind] as RealEstateAssetBucket[K]) = items;
        bucket.loaded[kind] = true;
    }

    function setRentals(assetPublicId: string, items: RealEstateRental[], status: RentalStatus | null) {
        const bucket = ensureBucket(assetPublicId);
        bucket.rentals = items;
        bucket.rentalsStatus = status;
        bucket.loaded.rentals = true;
    }

    function invalidateAsset(assetPublicId: string) {
        const id = assetPublicId.trim();
        for (const kind of ['units', 'charges', 'maintenance', 'documents'] as const) cache.invalidate(listCacheKey(id, kind));
        cache.invalidate(`rentals:${id}:*`);
    }

    function forget(assetPublicId: string) {
        const id = assetPublicId.trim();
        if (!id) return;
        invalidateAsset(id);
        delete buckets[id];
        const timer = recentMutations.get(id);
        if (timer) clearTimeout(timer);
        recentMutations.delete(id);
    }

    function beginActing() {
        actingDepth += 1;
        acting.value = true;
    }

    function endActing() {
        actingDepth = Math.max(0, actingDepth - 1);
        acting.value = actingDepth > 0;
    }

    function resetActing() {
        actingDepth = 0;
        acting.value = false;
    }

    function clearError() {
        error.value = null;
    }

    /** Mutation locale sur un bien : l’événement `assetChanged` qui suit (2,5 s) est ignoré. */
    function rememberLocalMutation(assetPublicId: string) {
        const id = assetPublicId.trim();
        if (!id) return;
        const previous = recentMutations.get(id);
        if (previous) clearTimeout(previous);
        recentMutations.set(
            id,
            setTimeout(() => {
                recentMutations.delete(id);
            }, 2500)
        );
    }

    function consumeLocalMutation(assetPublicId: string): boolean {
        const id = assetPublicId.trim();
        const timer = recentMutations.get(id);
        if (!timer) return false;
        clearTimeout(timer);
        recentMutations.delete(id);
        return true;
    }

    function clearRecentMutations() {
        for (const timer of recentMutations.values()) clearTimeout(timer);
        recentMutations.clear();
    }

    function clearAll() {
        for (const id of Object.keys(buckets)) delete buckets[id];
        recurringIncomes.value = [];
        recurringIncomesLoaded.value = false;
    }

    return {
        buckets,
        acting,
        error,
        recurringIncomes,
        recurringIncomesLoaded,
        cache,
        bucketOf,
        ensureBucket,
        unitsFor,
        chargesFor,
        maintenanceFor,
        documentsFor,
        rentalsFor,
        rentalsStatusFor,
        loadingFor,
        isLoaded,
        loadedKinds,
        knownAssetIds,
        setLoading,
        setList,
        setRentals,
        invalidateAsset,
        forget,
        beginActing,
        endActing,
        resetActing,
        clearError,
        rememberLocalMutation,
        consumeLocalMutation,
        clearRecentMutations,
        clearAll
    };
}

export type RealEstateState = ReturnType<typeof createRealEstateState>;
