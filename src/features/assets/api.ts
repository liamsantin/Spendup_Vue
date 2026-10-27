import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    ASSET_TYPES,
    type Asset,
    type AssetValuation,
    type AssetValuationsListResult,
    type AssetsListResult,
    type CreateAssetPayload,
    type ListAssetValuationsQuery,
    type ListAssetsQuery,
    type SaveAssetValuationPayload,
    type SaveVehicleMaintenancePayload,
    type SaveVehicleMileagePayload,
    type UpdateAssetPayload,
    type VehicleMaintenance,
    type VehicleMaintenancesListResult,
    type VehicleMileage,
    type VehicleMileagesListResult
} from '@/features/assets/types';

function listQueryString(query: ListAssetsQuery = {}): string {
    const params = new URLSearchParams();
    if (query.type && ASSET_TYPES.includes(query.type)) params.set('type', query.type);
    if (typeof query.active === 'boolean') params.set('active', query.active ? 'true' : 'false');
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function rangeQueryString(query: ListAssetValuationsQuery = {}): string {
    const params = new URLSearchParams();
    const from = query.from?.trim();
    const to = query.to?.trim();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

function assetUrl(publicId: string, suffix = ''): string {
    return `/api/assets/${encodeURIComponent(publicId)}${suffix}`;
}

/** `/api/assets` — racine, valorisations, volet véhicule. L’immobilier vit dans `features/real-estate`. */
export const assetsApi = {
    list(query: ListAssetsQuery = {}) {
        return fetchWrapper.get(`/api/assets${listQueryString(query)}`) as Promise<AssetsListResult>;
    },

    get(publicId: string) {
        return fetchWrapper.get(assetUrl(publicId)) as Promise<Asset>;
    },

    create(body: CreateAssetPayload) {
        return fetchWrapper.post('/api/assets', body) as Promise<Asset>;
    },

    update(publicId: string, body: UpdateAssetPayload) {
        return fetchWrapper.put(assetUrl(publicId), body) as Promise<Asset>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(assetUrl(publicId)) as Promise<void>;
    },

    /* ── valorisations (clé = date) ── */

    listValuations(publicId: string, query: ListAssetValuationsQuery = {}) {
        return fetchWrapper.get(assetUrl(publicId, `/valuations${rangeQueryString(query)}`)) as Promise<AssetValuationsListResult>;
    },

    saveValuation(publicId: string, body: SaveAssetValuationPayload) {
        return fetchWrapper.post(assetUrl(publicId, '/valuations'), body) as Promise<AssetValuation>;
    },

    removeValuation(publicId: string, valuationDate: string) {
        return fetchWrapper.delete(assetUrl(publicId, `/valuations/${encodeURIComponent(valuationDate)}`)) as Promise<void>;
    },

    /* ── véhicule : relevés kilométriques (clé = date) ── */

    listMileages(publicId: string) {
        return fetchWrapper.get(assetUrl(publicId, '/vehicle/mileages')) as Promise<VehicleMileagesListResult>;
    },

    saveMileage(publicId: string, body: SaveVehicleMileagePayload) {
        return fetchWrapper.post(assetUrl(publicId, '/vehicle/mileages'), body) as Promise<VehicleMileage>;
    },

    removeMileage(publicId: string, statementDate: string) {
        return fetchWrapper.delete(assetUrl(publicId, `/vehicle/mileages/${encodeURIComponent(statementDate)}`)) as Promise<void>;
    },

    /* ── véhicule : entretiens ── */

    listMaintenances(publicId: string) {
        return fetchWrapper.get(assetUrl(publicId, '/vehicle/maintenances')) as Promise<VehicleMaintenancesListResult>;
    },

    createMaintenance(publicId: string, body: SaveVehicleMaintenancePayload) {
        return fetchWrapper.post(assetUrl(publicId, '/vehicle/maintenances'), body) as Promise<VehicleMaintenance>;
    },

    updateMaintenance(publicId: string, maintenancePublicId: string, body: SaveVehicleMaintenancePayload) {
        return fetchWrapper.put(
            assetUrl(publicId, `/vehicle/maintenances/${encodeURIComponent(maintenancePublicId)}`),
            body
        ) as Promise<VehicleMaintenance>;
    },

    removeMaintenance(publicId: string, maintenancePublicId: string) {
        return fetchWrapper.delete(assetUrl(publicId, `/vehicle/maintenances/${encodeURIComponent(maintenancePublicId)}`)) as Promise<void>;
    }
};
