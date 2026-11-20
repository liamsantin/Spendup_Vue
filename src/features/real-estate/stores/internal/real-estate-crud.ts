import { AppError } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import { recurringIncomesApi } from '@/features/recurring-payments';
import { useUserSettingsStore } from '@/features/user-settings';
import { realEstateApi } from '@/features/real-estate/api';
import { isRentalStatus, sortCharges, sortRentals } from '@/features/real-estate/format';
import {
    buildChargePayload,
    buildCreateDocumentPayload,
    buildCreateRentalPayload,
    buildMaintenancePayload,
    buildUnitPayload,
    buildUpdateDocumentPayload,
    buildUpdateRentalPayload,
    type BuildRealEstatePayloadResult,
    type RealEstateChargeFormFields,
    type RealEstateDocumentFormFields,
    type RealEstateMaintenanceFormFields,
    type RealEstatePayloadContext,
    type RealEstateRentalFormFields,
    type RealEstateUnitFormFields
} from '@/features/real-estate/payload';
import {
    REAL_ESTATE_ASSET_NOT_FOUND_MESSAGE,
    REAL_ESTATE_CHARGE_NOT_FOUND_MESSAGE,
    REAL_ESTATE_DOCUMENT_NOT_FOUND_MESSAGE,
    REAL_ESTATE_MAINTENANCE_NOT_FOUND_MESSAGE,
    REAL_ESTATE_RENTAL_NOT_FOUND_MESSAGE,
    REAL_ESTATE_UNIT_NOT_FOUND_MESSAGE,
    type RealEstateCharge,
    type RealEstateDocument,
    type RealEstateMaintenance,
    type RealEstateRental,
    type RealEstateResourceKind,
    type RealEstateUnit,
    type RentalStatus
} from '@/features/real-estate/types';
import { listCacheKey, type RealEstateState } from '@/features/real-estate/stores/internal/real-estate-state';

export const REAL_ESTATE_NOT_FOUND_CODE = 'real_estate_not_found';

const NOT_FOUND_MESSAGES: Record<RealEstateResourceKind, string> = {
    units: REAL_ESTATE_UNIT_NOT_FOUND_MESSAGE,
    charges: REAL_ESTATE_CHARGE_NOT_FOUND_MESSAGE,
    maintenance: REAL_ESTATE_MAINTENANCE_NOT_FOUND_MESSAGE,
    documents: REAL_ESTATE_DOCUMENT_NOT_FOUND_MESSAGE,
    rentals: REAL_ESTATE_RENTAL_NOT_FOUND_MESSAGE
};

function payloadErrorMessage(code: string): string {
    switch (code) {
        case 'nameRequired':
            return 'Le nom est obligatoire.';
        case 'nameTooLong':
            return 'Le nom dépasse 150 caractères.';
        case 'notesTooLong':
            return 'Les notes dépassent 2000 caractères.';
        case 'descriptionTooLong':
            return 'La description dépasse 500 caractères.';
        case 'unitTypeInvalid':
        case 'chargeTypeInvalid':
        case 'periodicityInvalid':
        case 'maintenanceTypeInvalid':
        case 'documentTypeInvalid':
        case 'statusInvalid':
            return 'Valeur non supportée.';
        case 'surfaceInvalid':
        case 'roomsInvalid':
        case 'floorInvalid':
            return 'Valeur numérique invalide.';
        case 'amountInvalid':
        case 'amountNegative':
        case 'costInvalid':
        case 'costNegative':
        case 'rentInvalid':
        case 'rentNegative':
        case 'chargesInvalid':
        case 'chargesNegative':
        case 'depositInvalid':
        case 'depositNegative':
            return 'Le montant doit être un nombre positif ou nul.';
        case 'startDateInvalid':
        case 'endDateInvalid':
        case 'maintenanceDateRequired':
        case 'maintenanceDateInvalid':
        case 'nextDateInvalid':
        case 'documentDateInvalid':
            return 'Date invalide.';
        case 'maintenanceDateFuture':
            return 'La date des travaux ne peut pas être dans le futur.';
        case 'endDateBeforeStart':
            return 'La date de fin doit être postérieure ou égale à la date de début.';
        case 'nextDateBeforeDate':
            return 'La prochaine échéance doit être postérieure ou égale à la date des travaux.';
        case 'unitInvalid':
            return 'Le lot sélectionné est inconnu.';
        case 'unitNotRentable':
            return 'Le lot sélectionné n’est pas louable.';
        case 'fileRequired':
            return 'Choisissez un fichier PDF.';
        case 'tenantRequired':
            return 'Le locataire est obligatoire.';
        default:
            return 'Données invalides.';
    }
}

export function createRealEstateCrud(state: RealEstateState) {
    const {
        error,
        cache,
        clearError,
        beginActing,
        endActing,
        bucketOf,
        ensureBucket,
        setLoading,
        setList,
        setRentals,
        invalidateAsset,
        rememberLocalMutation,
        forget
    } = state;

    /** Un compteur par liste : une réponse d’un chargement annulé n’écrase pas la liste. */
    const requestSeq = new Map<string, number>();

    function nextSeq(key: string): number {
        const next = (requestSeq.get(key) ?? 0) + 1;
        requestSeq.set(key, next);
        return next;
    }

    function isCurrent(key: string, seq: number): boolean {
        return requestSeq.get(key) === seq;
    }

    function payloadContext(assetPublicId: string, extra?: RealEstatePayloadContext): RealEstatePayloadContext {
        const units = bucketOf(assetPublicId)?.units ?? [];
        const loaded = state.isLoaded(assetPublicId, 'units');
        return {
            today: extra?.today ?? todayYmdInTimeZone(useUserSettingsStore().current.timezone),
            unitIds: extra?.unitIds ?? (loaded ? new Set(units.map((unit) => unit.publicId)) : undefined),
            rentableUnitIds:
                extra?.rentableUnitIds ??
                (loaded ? new Set(units.filter((unit) => unit.isRentable).map((unit) => unit.publicId)) : undefined)
        };
    }

    function unwrap<T>(built: BuildRealEstatePayloadResult<T>): T {
        if (!built.ok) throw new AppError(payloadErrorMessage(built.code), 400, built.code);
        return built.payload;
    }

    /** Rafraîchit la synthèse du bien après toute écriture (sans faire échouer l’action). */
    async function refreshAssetSummary(assetPublicId: string) {
        try {
            await useAssetsStore().fetchAsset(assetPublicId, true);
        } catch {
            /* la synthèse sera rafraîchie par le realtime ou la prochaine ouverture */
        }
    }

    /** 404 : message neutre, retrait local, invalidation. Le 404 du bien lui-même purge son état. */
    function handleError(e: unknown, assetPublicId: string, kind: RealEstateResourceKind, publicId?: string): AppError {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            if (publicId) {
                error.value = NOT_FOUND_MESSAGES[kind];
                removeLocal(assetPublicId, kind, publicId);
                invalidateAsset(assetPublicId);
            } else {
                error.value = REAL_ESTATE_ASSET_NOT_FOUND_MESSAGE;
                forget(assetPublicId);
            }
        } else {
            error.value = err.message;
        }
        return err;
    }

    function removeLocal(assetPublicId: string, kind: RealEstateResourceKind, publicId: string) {
        const bucket = bucketOf(assetPublicId);
        if (!bucket) return;
        const list = bucket[kind] as { publicId: string }[];
        const next = list.filter((item) => item.publicId !== publicId);
        if (next.length !== list.length) (bucket[kind] as { publicId: string }[]) = next;
    }

    function upsertLocal<T extends { publicId: string }>(
        assetPublicId: string,
        kind: RealEstateResourceKind,
        item: T,
        sort?: (items: T[]) => T[]
    ) {
        const bucket = ensureBucket(assetPublicId);
        const list = bucket[kind] as unknown as T[];
        const idx = list.findIndex((entry) => entry.publicId === item.publicId);
        const next = idx >= 0 ? list.map((entry) => (entry.publicId === item.publicId ? item : entry)) : [item, ...list];
        (bucket as unknown as Record<RealEstateResourceKind, T[]>)[kind] = sort ? sort(next) : next;
    }

    /* ── chargement générique ── */

    async function loadKind<T>(
        assetPublicId: string,
        kind: RealEstateResourceKind,
        key: string,
        fetcher: () => Promise<{ items: T[] }>,
        apply: (items: T[]) => void,
        force: boolean
    ) {
        const id = assetPublicId.trim();
        if (!id) return;
        const seq = nextSeq(key);
        ensureBucket(id);
        setLoading(id, kind, true);
        clearError();

        async function fetchList(ensureForce: boolean): Promise<boolean> {
            let applied = false;
            await cache.ensure(
                key,
                async () => {
                    try {
                        const result = await fetcher();
                        if (!isCurrent(key, seq)) return;
                        apply(Array.isArray(result?.items) ? result.items : []);
                        applied = true;
                    } catch (e: unknown) {
                        if (isCurrent(key, seq)) handleError(e, id, kind);
                        throw e;
                    }
                },
                { force: ensureForce }
            );
            return applied;
        }

        try {
            const applied = await fetchList(force);
            if (isCurrent(key, seq) && (force || !cache.isFresh(key)) && !applied) {
                await fetchList(true);
            }
        } finally {
            if (isCurrent(key, seq) && bucketOf(id)) setLoading(id, kind, false);
        }
    }

    /* ── lots ── */

    async function loadUnits(assetPublicId: string, force = false) {
        const id = assetPublicId.trim();
        await loadKind<RealEstateUnit>(
            id,
            'units',
            listCacheKey(id, 'units'),
            () => realEstateApi.listUnits(id),
            (items) => setList(id, 'units', items),
            force
        );
    }

    async function createUnit(assetPublicId: string, fields: RealEstateUnitFormFields) {
        beginActing();
        clearError();
        try {
            const created = await realEstateApi.createUnit(assetPublicId, unwrap(buildUnitPayload(fields)));
            upsertLocal(assetPublicId, 'units', created);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return created;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'units');
        } finally {
            endActing();
        }
    }

    async function updateUnit(assetPublicId: string, unitPublicId: string, fields: RealEstateUnitFormFields) {
        beginActing();
        clearError();
        try {
            const updated = await realEstateApi.updateUnit(assetPublicId, unitPublicId, unwrap(buildUnitPayload(fields)));
            upsertLocal(assetPublicId, 'units', updated);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return updated;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'units', unitPublicId);
        } finally {
            endActing();
        }
    }

    async function deleteUnit(assetPublicId: string, unitPublicId: string) {
        beginActing();
        clearError();
        try {
            await realEstateApi.removeUnit(assetPublicId, unitPublicId);
            removeLocal(assetPublicId, 'units', unitPublicId);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'units', unitPublicId);
        } finally {
            endActing();
        }
    }

    /* ── charges ── */

    async function loadCharges(assetPublicId: string, force = false) {
        const id = assetPublicId.trim();
        await loadKind<RealEstateCharge>(
            id,
            'charges',
            listCacheKey(id, 'charges'),
            () => realEstateApi.listCharges(id),
            (items) => setList(id, 'charges', items),
            force
        );
    }

    async function createCharge(assetPublicId: string, fields: RealEstateChargeFormFields, extra?: RealEstatePayloadContext) {
        beginActing();
        clearError();
        try {
            const created = await realEstateApi.createCharge(
                assetPublicId,
                unwrap(buildChargePayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'charges', created, sortCharges);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return created;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'charges');
        } finally {
            endActing();
        }
    }

    async function updateCharge(
        assetPublicId: string,
        chargePublicId: string,
        fields: RealEstateChargeFormFields,
        extra?: RealEstatePayloadContext
    ) {
        beginActing();
        clearError();
        try {
            const updated = await realEstateApi.updateCharge(
                assetPublicId,
                chargePublicId,
                unwrap(buildChargePayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'charges', updated, sortCharges);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return updated;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'charges', chargePublicId);
        } finally {
            endActing();
        }
    }

    async function deleteCharge(assetPublicId: string, chargePublicId: string) {
        beginActing();
        clearError();
        try {
            await realEstateApi.removeCharge(assetPublicId, chargePublicId);
            removeLocal(assetPublicId, 'charges', chargePublicId);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'charges', chargePublicId);
        } finally {
            endActing();
        }
    }

    /* ── travaux ── */

    function sortMaintenance(items: RealEstateMaintenance[]): RealEstateMaintenance[] {
        return [...items].sort((a, b) => b.maintenanceDate.localeCompare(a.maintenanceDate));
    }

    async function loadMaintenance(assetPublicId: string, force = false) {
        const id = assetPublicId.trim();
        await loadKind<RealEstateMaintenance>(
            id,
            'maintenance',
            listCacheKey(id, 'maintenance'),
            () => realEstateApi.listMaintenance(id),
            (items) => setList(id, 'maintenance', items),
            force
        );
    }

    async function createMaintenance(assetPublicId: string, fields: RealEstateMaintenanceFormFields, extra?: RealEstatePayloadContext) {
        beginActing();
        clearError();
        try {
            const created = await realEstateApi.createMaintenance(
                assetPublicId,
                unwrap(buildMaintenancePayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'maintenance', created, sortMaintenance);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return created;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'maintenance');
        } finally {
            endActing();
        }
    }

    async function updateMaintenance(
        assetPublicId: string,
        maintenancePublicId: string,
        fields: RealEstateMaintenanceFormFields,
        extra?: RealEstatePayloadContext
    ) {
        beginActing();
        clearError();
        try {
            const updated = await realEstateApi.updateMaintenance(
                assetPublicId,
                maintenancePublicId,
                unwrap(buildMaintenancePayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'maintenance', updated, sortMaintenance);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return updated;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'maintenance', maintenancePublicId);
        } finally {
            endActing();
        }
    }

    async function deleteMaintenance(assetPublicId: string, maintenancePublicId: string) {
        beginActing();
        clearError();
        try {
            await realEstateApi.removeMaintenance(assetPublicId, maintenancePublicId);
            removeLocal(assetPublicId, 'maintenance', maintenancePublicId);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'maintenance', maintenancePublicId);
        } finally {
            endActing();
        }
    }

    /* ── documents ── */

    async function loadDocuments(assetPublicId: string, force = false) {
        const id = assetPublicId.trim();
        await loadKind<RealEstateDocument>(
            id,
            'documents',
            listCacheKey(id, 'documents'),
            () => realEstateApi.listDocuments(id),
            (items) => setList(id, 'documents', items),
            force
        );
    }

    /** `fields.filePublicId` = fichier déjà uploadé sur `/api/files`. */
    async function createDocument(assetPublicId: string, fields: RealEstateDocumentFormFields, extra?: RealEstatePayloadContext) {
        beginActing();
        clearError();
        try {
            const created = await realEstateApi.createDocument(
                assetPublicId,
                unwrap(buildCreateDocumentPayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'documents', created);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return created;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'documents');
        } finally {
            endActing();
        }
    }

    async function updateDocument(
        assetPublicId: string,
        documentPublicId: string,
        fields: RealEstateDocumentFormFields,
        extra?: RealEstatePayloadContext
    ) {
        beginActing();
        clearError();
        try {
            const updated = await realEstateApi.updateDocument(
                assetPublicId,
                documentPublicId,
                unwrap(buildUpdateDocumentPayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'documents', updated);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
            return updated;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'documents', documentPublicId);
        } finally {
            endActing();
        }
    }

    /** Délie seulement : le fichier reste dans la bibliothèque. */
    async function deleteDocument(assetPublicId: string, documentPublicId: string) {
        beginActing();
        clearError();
        try {
            await realEstateApi.removeDocument(assetPublicId, documentPublicId);
            removeLocal(assetPublicId, 'documents', documentPublicId);
            rememberLocalMutation(assetPublicId);
            await refreshAssetSummary(assetPublicId);
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'documents', documentPublicId);
        } finally {
            endActing();
        }
    }

    /* ── baux ── */

    async function loadRentals(assetPublicId: string, options: { status?: RentalStatus | null; force?: boolean } = {}) {
        const id = assetPublicId.trim();
        const status = isRentalStatus(options.status) ? options.status : null;
        const bucket = bucketOf(id);
        // changement de filtre : on repart d’une liste vide pour ne pas afficher l’ancien filtre
        if (bucket && bucket.loaded.rentals && bucket.rentalsStatus !== status) {
            bucket.rentals = [];
            bucket.rentalsStatus = status;
        }
        await loadKind<RealEstateRental>(
            id,
            'rentals',
            listCacheKey(id, 'rentals', status),
            () => realEstateApi.listRentals(id, { status: status ?? undefined }),
            (items) => setRentals(id, items, status),
            !!options.force
        );
    }

    /** Après une écriture de bail, le statut effectif peut sortir du filtre en place : on refetch la liste. */
    async function refetchRentals(assetPublicId: string) {
        const bucket = bucketOf(assetPublicId);
        if (!bucket?.loaded.rentals) return;
        await loadRentals(assetPublicId, { status: bucket.rentalsStatus, force: true }).catch(() => undefined);
    }

    async function createRental(assetPublicId: string, fields: RealEstateRentalFormFields, extra?: RealEstatePayloadContext) {
        beginActing();
        clearError();
        try {
            const created = await realEstateApi.createRental(
                assetPublicId,
                unwrap(buildCreateRentalPayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'rentals', created, sortRentals);
            rememberLocalMutation(assetPublicId);
            await Promise.all([refreshAssetSummary(assetPublicId), refetchRentals(assetPublicId), reloadUnitsIfLoaded(assetPublicId)]);
            return created;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'rentals');
        } finally {
            endActing();
        }
    }

    async function updateRental(
        assetPublicId: string,
        rentalPublicId: string,
        fields: RealEstateRentalFormFields,
        extra?: RealEstatePayloadContext
    ) {
        beginActing();
        clearError();
        try {
            const updated = await realEstateApi.updateRental(
                assetPublicId,
                rentalPublicId,
                unwrap(buildUpdateRentalPayload(fields, payloadContext(assetPublicId, extra)))
            );
            upsertLocal(assetPublicId, 'rentals', updated, sortRentals);
            rememberLocalMutation(assetPublicId);
            await Promise.all([refreshAssetSummary(assetPublicId), refetchRentals(assetPublicId), reloadUnitsIfLoaded(assetPublicId)]);
            return updated;
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'rentals', rentalPublicId);
        } finally {
            endActing();
        }
    }

    async function deleteRental(assetPublicId: string, rentalPublicId: string) {
        beginActing();
        clearError();
        try {
            await realEstateApi.removeRental(assetPublicId, rentalPublicId);
            removeLocal(assetPublicId, 'rentals', rentalPublicId);
            rememberLocalMutation(assetPublicId);
            await Promise.all([refreshAssetSummary(assetPublicId), reloadUnitsIfLoaded(assetPublicId)]);
        } catch (e: unknown) {
            throw handleError(e, assetPublicId, 'rentals', rentalPublicId);
        } finally {
            endActing();
        }
    }

    /** `isOccupied` des lots dépend des baux : on recharge les lots s’ils sont affichés. */
    async function reloadUnitsIfLoaded(assetPublicId: string) {
        if (!state.isLoaded(assetPublicId, 'units')) return;
        await loadUnits(assetPublicId, true).catch(() => undefined);
    }

    /** Recharge toutes les listes déjà chargées d’un bien (realtime, visibilité). */
    async function refetchLoaded(assetPublicId: string) {
        const id = assetPublicId.trim();
        const bucket = bucketOf(id);
        if (!bucket) return;
        invalidateAsset(id);
        const jobs: Promise<void>[] = [];
        if (bucket.loaded.units) jobs.push(loadUnits(id, true));
        if (bucket.loaded.charges) jobs.push(loadCharges(id, true));
        if (bucket.loaded.maintenance) jobs.push(loadMaintenance(id, true));
        if (bucket.loaded.documents) jobs.push(loadDocuments(id, true));
        if (bucket.loaded.rentals) jobs.push(loadRentals(id, { status: bucket.rentalsStatus, force: true }));
        await Promise.all(jobs.map((job) => job.catch(() => undefined)));
    }

    /* ── revenus récurrents (sélecteur du bail) ── */

    async function loadRecurringIncomes(force = false) {
        if (state.recurringIncomesLoaded.value && !force) return state.recurringIncomes.value;
        try {
            const result = await recurringIncomesApi.list({ pageSize: 200 });
            state.recurringIncomes.value = Array.isArray(result?.items) ? result.items : [];
            state.recurringIncomesLoaded.value = true;
            return state.recurringIncomes.value;
        } catch (e: unknown) {
            throw AppError.fromUnknown(e);
        }
    }

    function cancelPendingLoads() {
        for (const key of [...requestSeq.keys()]) nextSeq(key);
    }

    return {
        loadUnits,
        createUnit,
        updateUnit,
        deleteUnit,
        loadCharges,
        createCharge,
        updateCharge,
        deleteCharge,
        loadMaintenance,
        createMaintenance,
        updateMaintenance,
        deleteMaintenance,
        loadDocuments,
        createDocument,
        updateDocument,
        deleteDocument,
        loadRentals,
        createRental,
        updateRental,
        deleteRental,
        refetchLoaded,
        loadRecurringIncomes,
        cancelPendingLoads
    };
}

export type RealEstateCrud = ReturnType<typeof createRealEstateCrud>;
