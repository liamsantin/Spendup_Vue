import { AppError } from '@/utils/errors/app-error';
import { assetsApi } from '@/features/assets/api';
import {
    buildSaveMaintenancePayload,
    buildSaveMileagePayload,
    type AssetSubPayloadContext,
    type VehicleMaintenanceFormFields,
    type VehicleMileageFormFields
} from '@/features/assets/payload';
import type { VehicleMaintenance, VehicleMileage } from '@/features/assets/types';
import { assetPayloadErrorMessage, type AssetsCrud } from '@/features/assets/stores/internal/assets-crud';
import type { AssetsState } from '@/features/assets/stores/internal/assets-state';

type VehicleDeps = Pick<AssetsCrud, 'fetchAsset' | 'rememberSubResourceError'>;

function sortMileages(items: VehicleMileage[]): VehicleMileage[] {
    return [...items].sort((a, b) => (a.statementDate < b.statementDate ? 1 : a.statementDate > b.statementDate ? -1 : 0));
}

function sortMaintenances(items: VehicleMaintenance[]): VehicleMaintenance[] {
    return [...items].sort((a, b) => (a.maintenanceDate < b.maintenanceDate ? 1 : a.maintenanceDate > b.maintenanceDate ? -1 : 0));
}

/**
 * Volet véhicule : relevés kilométriques (clé = date) et entretiens.
 * Toute écriture refetch l’actif (`currentMileage` = relevé le plus récent) ; un entretien avec
 * kilométrage écrit aussi le relevé de sa date → les relevés sont invalidés.
 */
export function createAssetsVehicle(state: AssetsState, deps: VehicleDeps) {
    const { mileagesById, maintenancesById, loadingVehicle, cache, clearError, beginActing, endActing, rememberLocalMutation } = state;
    const { fetchAsset, rememberSubResourceError } = deps;

    function mileagesKey(id: string): string {
        return `mileages:${id}`;
    }

    function maintenancesKey(id: string): string {
        return `maintenances:${id}`;
    }

    async function afterWrite(id: string) {
        rememberLocalMutation(id);
        await fetchAsset(id, true).catch(() => undefined);
    }

    /* ── relevés ── */

    async function loadMileages(publicId: string, force = false) {
        const id = publicId.trim();
        if (!id) return;
        loadingVehicle.value = true;
        try {
            await cache.ensure(
                mileagesKey(id),
                async () => {
                    const result = await assetsApi.listMileages(id);
                    mileagesById.set(id, sortMileages(Array.isArray(result?.items) ? result.items : []));
                },
                { force }
            );
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            loadingVehicle.value = false;
        }
    }

    async function saveMileage(publicId: string, fields: VehicleMileageFormFields, context: AssetSubPayloadContext = {}) {
        const id = publicId.trim();
        beginActing();
        clearError();
        try {
            const built = buildSaveMileagePayload(fields, context);
            if (!built.ok) throw new AppError(assetPayloadErrorMessage(built.code), 400, built.code);
            const saved = await assetsApi.saveMileage(id, built.payload);
            const current = mileagesById.get(id) ?? [];
            mileagesById.set(id, sortMileages([...current.filter((item) => item.statementDate !== saved.statementDate), saved]));
            cache.touch(mileagesKey(id));
            await afterWrite(id);
            return saved;
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            endActing();
        }
    }

    async function deleteMileage(publicId: string, statementDate: string) {
        const id = publicId.trim();
        beginActing();
        clearError();
        try {
            await assetsApi.removeMileage(id, statementDate);
            const current = mileagesById.get(id) ?? [];
            mileagesById.set(
                id,
                current.filter((item) => item.statementDate !== statementDate)
            );
            cache.touch(mileagesKey(id));
            await afterWrite(id);
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            endActing();
        }
    }

    /* ── entretiens ── */

    async function loadMaintenances(publicId: string, force = false) {
        const id = publicId.trim();
        if (!id) return;
        loadingVehicle.value = true;
        try {
            await cache.ensure(
                maintenancesKey(id),
                async () => {
                    const result = await assetsApi.listMaintenances(id);
                    maintenancesById.set(id, sortMaintenances(Array.isArray(result?.items) ? result.items : []));
                },
                { force }
            );
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            loadingVehicle.value = false;
        }
    }

    function applyMaintenance(id: string, saved: VehicleMaintenance) {
        const current = maintenancesById.get(id) ?? [];
        maintenancesById.set(id, sortMaintenances([...current.filter((item) => item.publicId !== saved.publicId), saved]));
        cache.touch(maintenancesKey(id));
        // Un entretien avec kilométrage écrit le relevé de sa date (source `entretien`).
        cache.invalidate(mileagesKey(id));
    }

    async function createMaintenance(publicId: string, fields: VehicleMaintenanceFormFields, context: AssetSubPayloadContext = {}) {
        const id = publicId.trim();
        beginActing();
        clearError();
        try {
            const built = buildSaveMaintenancePayload(fields, context);
            if (!built.ok) throw new AppError(assetPayloadErrorMessage(built.code), 400, built.code);
            const saved = await assetsApi.createMaintenance(id, built.payload);
            applyMaintenance(id, saved);
            await afterWrite(id);
            return saved;
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            endActing();
        }
    }

    async function updateMaintenance(
        publicId: string,
        maintenancePublicId: string,
        fields: VehicleMaintenanceFormFields,
        context: AssetSubPayloadContext = {}
    ) {
        const id = publicId.trim();
        beginActing();
        clearError();
        try {
            const built = buildSaveMaintenancePayload(fields, context);
            if (!built.ok) throw new AppError(assetPayloadErrorMessage(built.code), 400, built.code);
            const saved = await assetsApi.updateMaintenance(id, maintenancePublicId, built.payload);
            applyMaintenance(id, saved);
            await afterWrite(id);
            return saved;
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            endActing();
        }
    }

    async function deleteMaintenance(publicId: string, maintenancePublicId: string) {
        const id = publicId.trim();
        beginActing();
        clearError();
        try {
            await assetsApi.removeMaintenance(id, maintenancePublicId);
            const current = maintenancesById.get(id) ?? [];
            maintenancesById.set(
                id,
                current.filter((item) => item.publicId !== maintenancePublicId)
            );
            cache.touch(maintenancesKey(id));
            cache.invalidate(mileagesKey(id));
            await afterWrite(id);
        } catch (e: unknown) {
            throw rememberSubResourceError(e, id);
        } finally {
            endActing();
        }
    }

    return {
        loadMileages,
        saveMileage,
        deleteMileage,
        loadMaintenances,
        createMaintenance,
        updateMaintenance,
        deleteMaintenance
    };
}

export type AssetsVehicle = ReturnType<typeof createAssetsVehicle>;
