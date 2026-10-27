import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import {
    RENTAL_STATUSES,
    type CreateRealEstateDocumentPayload,
    type CreateRealEstateRentalPayload,
    type ListRealEstateRentalsQuery,
    type RealEstateCharge,
    type RealEstateDocument,
    type RealEstateListResult,
    type RealEstateMaintenance,
    type RealEstateRental,
    type RealEstateUnit,
    type SaveRealEstateChargePayload,
    type SaveRealEstateMaintenancePayload,
    type SaveRealEstateUnitPayload,
    type UpdateRealEstateDocumentPayload,
    type UpdateRealEstateRentalPayload
} from '@/features/real-estate/types';

function base(assetPublicId: string, resource: string): string {
    return `/api/assets/${encodeURIComponent(assetPublicId)}/real-estate/${resource}`;
}

function item(assetPublicId: string, resource: string, publicId: string): string {
    return `${base(assetPublicId, resource)}/${encodeURIComponent(publicId)}`;
}

/** L’API peut renvoyer `{ items, totalCount }` ou un tableau nu : on normalise. */
export function normalizeListResult<T>(raw: unknown): RealEstateListResult<T> {
    if (Array.isArray(raw)) return { items: raw as T[], totalCount: raw.length };
    const items = Array.isArray((raw as { items?: unknown })?.items) ? ((raw as { items: T[] }).items ?? []) : [];
    const total = (raw as { totalCount?: unknown })?.totalCount;
    return { items, totalCount: typeof total === 'number' ? total : items.length };
}

function rentalsQueryString(query: ListRealEstateRentalsQuery = {}): string {
    const params = new URLSearchParams();
    if (query.status && RENTAL_STATUSES.includes(query.status)) params.set('status', query.status);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

/** Sous-ressources d’un bien : `/api/assets/{assetPublicId}/real-estate/{units|charges|maintenance|documents|rentals}`. */
export const realEstateApi = {
    /* ── lots ── */
    listUnits(assetPublicId: string) {
        return fetchWrapper.get(base(assetPublicId, 'units')).then((raw) => normalizeListResult<RealEstateUnit>(raw));
    },
    getUnit(assetPublicId: string, publicId: string) {
        return fetchWrapper.get(item(assetPublicId, 'units', publicId)) as Promise<RealEstateUnit>;
    },
    createUnit(assetPublicId: string, body: SaveRealEstateUnitPayload) {
        return fetchWrapper.post(base(assetPublicId, 'units'), body) as Promise<RealEstateUnit>;
    },
    updateUnit(assetPublicId: string, publicId: string, body: SaveRealEstateUnitPayload) {
        return fetchWrapper.put(item(assetPublicId, 'units', publicId), body) as Promise<RealEstateUnit>;
    },
    removeUnit(assetPublicId: string, publicId: string) {
        return fetchWrapper.delete(item(assetPublicId, 'units', publicId)) as Promise<void>;
    },

    /* ── charges ── */
    listCharges(assetPublicId: string) {
        return fetchWrapper.get(base(assetPublicId, 'charges')).then((raw) => normalizeListResult<RealEstateCharge>(raw));
    },
    getCharge(assetPublicId: string, publicId: string) {
        return fetchWrapper.get(item(assetPublicId, 'charges', publicId)) as Promise<RealEstateCharge>;
    },
    createCharge(assetPublicId: string, body: SaveRealEstateChargePayload) {
        return fetchWrapper.post(base(assetPublicId, 'charges'), body) as Promise<RealEstateCharge>;
    },
    updateCharge(assetPublicId: string, publicId: string, body: SaveRealEstateChargePayload) {
        return fetchWrapper.put(item(assetPublicId, 'charges', publicId), body) as Promise<RealEstateCharge>;
    },
    removeCharge(assetPublicId: string, publicId: string) {
        return fetchWrapper.delete(item(assetPublicId, 'charges', publicId)) as Promise<void>;
    },

    /* ── travaux ── */
    listMaintenance(assetPublicId: string) {
        return fetchWrapper.get(base(assetPublicId, 'maintenance')).then((raw) => normalizeListResult<RealEstateMaintenance>(raw));
    },
    getMaintenance(assetPublicId: string, publicId: string) {
        return fetchWrapper.get(item(assetPublicId, 'maintenance', publicId)) as Promise<RealEstateMaintenance>;
    },
    createMaintenance(assetPublicId: string, body: SaveRealEstateMaintenancePayload) {
        return fetchWrapper.post(base(assetPublicId, 'maintenance'), body) as Promise<RealEstateMaintenance>;
    },
    updateMaintenance(assetPublicId: string, publicId: string, body: SaveRealEstateMaintenancePayload) {
        return fetchWrapper.put(item(assetPublicId, 'maintenance', publicId), body) as Promise<RealEstateMaintenance>;
    },
    removeMaintenance(assetPublicId: string, publicId: string) {
        return fetchWrapper.delete(item(assetPublicId, 'maintenance', publicId)) as Promise<void>;
    },

    /* ── documents ── */
    listDocuments(assetPublicId: string) {
        return fetchWrapper.get(base(assetPublicId, 'documents')).then((raw) => normalizeListResult<RealEstateDocument>(raw));
    },
    getDocument(assetPublicId: string, publicId: string) {
        return fetchWrapper.get(item(assetPublicId, 'documents', publicId)) as Promise<RealEstateDocument>;
    },
    createDocument(assetPublicId: string, body: CreateRealEstateDocumentPayload) {
        return fetchWrapper.post(base(assetPublicId, 'documents'), body) as Promise<RealEstateDocument>;
    },
    updateDocument(assetPublicId: string, publicId: string, body: UpdateRealEstateDocumentPayload) {
        return fetchWrapper.put(item(assetPublicId, 'documents', publicId), body) as Promise<RealEstateDocument>;
    },
    /** Délie seulement : le fichier reste dans `/api/files`. */
    removeDocument(assetPublicId: string, publicId: string) {
        return fetchWrapper.delete(item(assetPublicId, 'documents', publicId)) as Promise<void>;
    },

    /* ── baux ── */
    listRentals(assetPublicId: string, query: ListRealEstateRentalsQuery = {}) {
        return fetchWrapper
            .get(`${base(assetPublicId, 'rentals')}${rentalsQueryString(query)}`)
            .then((raw) => normalizeListResult<RealEstateRental>(raw));
    },
    getRental(assetPublicId: string, publicId: string) {
        return fetchWrapper.get(item(assetPublicId, 'rentals', publicId)) as Promise<RealEstateRental>;
    },
    createRental(assetPublicId: string, body: CreateRealEstateRentalPayload) {
        return fetchWrapper.post(base(assetPublicId, 'rentals'), body) as Promise<RealEstateRental>;
    },
    updateRental(assetPublicId: string, publicId: string, body: UpdateRealEstateRentalPayload) {
        return fetchWrapper.put(item(assetPublicId, 'rentals', publicId), body) as Promise<RealEstateRental>;
    },
    removeRental(assetPublicId: string, publicId: string) {
        return fetchWrapper.delete(item(assetPublicId, 'rentals', publicId)) as Promise<void>;
    }
};
