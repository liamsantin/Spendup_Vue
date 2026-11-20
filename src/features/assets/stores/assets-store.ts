import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    ASSETS_LIST_MAX_AGE_MS,
    createAssetsCrud,
    createAssetsLifecycle,
    createAssetsRealtime,
    createAssetsState,
    createAssetsValuations,
    createAssetsVehicle
} from '@/features/assets/stores/internal';

export { ASSETS_LIST_MAX_AGE_MS };

export const useAssetsStore = defineStore('assets', () => {
    const state = createAssetsState();
    const crud = createAssetsCrud(state);
    const valuations = createAssetsValuations(state, {
        fetchAsset: crud.fetchAsset,
        rememberSubResourceError: crud.rememberSubResourceError
    });
    const vehicle = createAssetsVehicle(state, {
        fetchAsset: crud.fetchAsset,
        rememberSubResourceError: crud.rememberSubResourceError
    });
    const realtime = createAssetsRealtime(state, {
        refetchActive: crud.refetchActive,
        fetchAsset: crud.fetchAsset
    });
    const lifecycle = createAssetsLifecycle(state, {
        loadList: crud.loadList,
        cancelPendingLoads: crud.cancelPendingLoads,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        items: state.items,
        totalCount: state.totalCount,
        loading: state.loading,
        acting: state.acting,
        initialized: state.initialized,
        error: state.error,
        hasItems: state.hasItems,
        activeQuery: state.activeQuery,
        findByPublicId: state.findByPublicId,
        allKnownItems: state.allKnownItems,
        subscribeToDeleted: state.subscribeToDeleted,
        clearError: state.clearError,
        loadList: crud.loadList,
        refetchActive: crud.refetchActive,
        fetchAsset: crud.fetchAsset,
        createAsset: crud.createAsset,
        updateAsset: crud.updateAsset,
        deleteAsset: crud.deleteAsset,
        valuationsFor: state.valuationsFor,
        loadingValuations: state.loadingValuations,
        loadValuations: valuations.loadValuations,
        saveValuation: valuations.saveValuation,
        deleteValuation: valuations.deleteValuation,
        mileagesFor: state.mileagesFor,
        maintenancesFor: state.maintenancesFor,
        loadingVehicle: state.loadingVehicle,
        loadMileages: vehicle.loadMileages,
        saveMileage: vehicle.saveMileage,
        deleteMileage: vehicle.deleteMileage,
        loadMaintenances: vehicle.loadMaintenances,
        createMaintenance: vehicle.createMaintenance,
        updateMaintenance: vehicle.updateMaintenance,
        deleteMaintenance: vehicle.deleteMaintenance,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
