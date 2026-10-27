import { defineStore } from 'pinia';
import { AppError } from '@/utils/errors/app-error';
import {
    createRealEstateCrud,
    createRealEstateLifecycle,
    createRealEstateRealtime,
    createRealEstateState,
    REAL_ESTATE_LIST_MAX_AGE_MS
} from '@/features/real-estate/stores/internal';

export { REAL_ESTATE_LIST_MAX_AGE_MS };

/** Sous-ressources des biens immobiliers, indexées par `assetPublicId`. Le bien lui-même vit dans `useAssetsStore`. */
export const useRealEstateStore = defineStore('real-estate', () => {
    const state = createRealEstateState();
    const crud = createRealEstateCrud(state);
    const realtime = createRealEstateRealtime(state, { refetchLoaded: crud.refetchLoaded });
    const lifecycle = createRealEstateLifecycle(state, {
        cancelPendingLoads: crud.cancelPendingLoads,
        ensureRealtimeBridge: realtime.ensureRealtimeBridge,
        teardownRealtimeBridge: realtime.teardownRealtimeBridge
    });

    function toAppError(e: unknown): AppError {
        return AppError.fromUnknown(e);
    }

    return {
        acting: state.acting,
        error: state.error,
        recurringIncomes: state.recurringIncomes,
        recurringIncomesLoaded: state.recurringIncomesLoaded,
        unitsFor: state.unitsFor,
        chargesFor: state.chargesFor,
        maintenanceFor: state.maintenanceFor,
        documentsFor: state.documentsFor,
        rentalsFor: state.rentalsFor,
        rentalsStatusFor: state.rentalsStatusFor,
        loadingFor: state.loadingFor,
        isLoaded: state.isLoaded,
        clearError: state.clearError,
        forget: state.forget,
        loadUnits: crud.loadUnits,
        createUnit: crud.createUnit,
        updateUnit: crud.updateUnit,
        deleteUnit: crud.deleteUnit,
        loadCharges: crud.loadCharges,
        createCharge: crud.createCharge,
        updateCharge: crud.updateCharge,
        deleteCharge: crud.deleteCharge,
        loadMaintenance: crud.loadMaintenance,
        createMaintenance: crud.createMaintenance,
        updateMaintenance: crud.updateMaintenance,
        deleteMaintenance: crud.deleteMaintenance,
        loadDocuments: crud.loadDocuments,
        createDocument: crud.createDocument,
        updateDocument: crud.updateDocument,
        deleteDocument: crud.deleteDocument,
        loadRentals: crud.loadRentals,
        createRental: crud.createRental,
        updateRental: crud.updateRental,
        deleteRental: crud.deleteRental,
        refetchLoaded: crud.refetchLoaded,
        loadRecurringIncomes: crud.loadRecurringIncomes,
        onAuthenticatedSession: realtime.onAuthenticatedSession,
        bootstrap: lifecycle.bootstrap,
        reset: lifecycle.reset,
        toAppError
    };
});
