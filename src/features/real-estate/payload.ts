import { parseAccountAmount } from '@/features/accounts/format';
import {
    emptyToNull,
    isChargePeriodicity,
    isChargeType,
    isDocumentType,
    isRealEstateMaintenanceType,
    isRentalStoredStatus,
    isUnitType,
    isValidYmd
} from '@/features/real-estate/format';
import {
    REAL_ESTATE_DESCRIPTION_MAX,
    REAL_ESTATE_NAME_MAX,
    REAL_ESTATE_NOTES_MAX,
    type ChargePeriodicity,
    type ChargeType,
    type CreateRealEstateDocumentPayload,
    type CreateRealEstateRentalPayload,
    type DocumentType,
    type RealEstateCharge,
    type RealEstateDocument,
    type RealEstateMaintenance,
    type RealEstateMaintenanceType,
    type RealEstateRental,
    type RealEstateUnit,
    type RentalStoredStatus,
    type SaveRealEstateChargePayload,
    type SaveRealEstateMaintenancePayload,
    type SaveRealEstateUnitPayload,
    type UnitType,
    type UpdateRealEstateDocumentPayload,
    type UpdateRealEstateRentalPayload
} from '@/features/real-estate/types';

export type RealEstatePayloadErrorCode =
    | 'nameRequired'
    | 'nameTooLong'
    | 'notesTooLong'
    | 'descriptionTooLong'
    | 'unitTypeInvalid'
    | 'surfaceInvalid'
    | 'roomsInvalid'
    | 'floorInvalid'
    | 'chargeTypeInvalid'
    | 'periodicityInvalid'
    | 'amountInvalid'
    | 'amountNegative'
    | 'startDateInvalid'
    | 'endDateInvalid'
    | 'endDateBeforeStart'
    | 'unitInvalid'
    | 'unitNotRentable'
    | 'maintenanceTypeInvalid'
    | 'maintenanceDateRequired'
    | 'maintenanceDateInvalid'
    | 'maintenanceDateFuture'
    | 'nextDateInvalid'
    | 'nextDateBeforeDate'
    | 'costInvalid'
    | 'costNegative'
    | 'documentTypeInvalid'
    | 'fileRequired'
    | 'documentDateInvalid'
    | 'tenantRequired'
    | 'rentInvalid'
    | 'rentNegative'
    | 'chargesInvalid'
    | 'chargesNegative'
    | 'depositInvalid'
    | 'depositNegative'
    | 'statusInvalid';

export type BuildRealEstatePayloadOk<T> = { ok: true; payload: T };
export type BuildRealEstatePayloadFail = { ok: false; code: RealEstatePayloadErrorCode; field?: string };
export type BuildRealEstatePayloadResult<T> = BuildRealEstatePayloadOk<T> | BuildRealEstatePayloadFail;

export type RealEstatePayloadContext = {
    /** « Aujourd’hui » `yyyy-MM-dd` dans le fuseau des settings — dates non futures. */
    today?: string | null;
    /** Lots connus du bien (un lot inconnu est refusé). */
    unitIds?: ReadonlySet<string>;
    /** Lots `isRentable` (bail). */
    rentableUnitIds?: ReadonlySet<string>;
};

function fail(code: RealEstatePayloadErrorCode, field?: string): BuildRealEstatePayloadFail {
    return field ? { ok: false, code, field } : { ok: false, code };
}

type Parsed<T> = { ok: true; value: T } | BuildRealEstatePayloadFail;

/** Montant optionnel : vide → `null`, invalide / négatif → erreur. */
function optionalAmount(
    raw: string,
    field: string,
    invalid: RealEstatePayloadErrorCode,
    negative: RealEstatePayloadErrorCode
): Parsed<number | null> {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: null };
    const parsed = parseAccountAmount(trimmed);
    if (parsed == null) return fail(invalid, field);
    if (parsed < 0) return fail(negative, field);
    return { ok: true, value: parsed };
}

/** Nombre optionnel (surface, pièces, étage) — virgule acceptée. */
function optionalNumber(
    raw: string,
    field: string,
    invalid: RealEstatePayloadErrorCode,
    options: { integer?: boolean; min?: number } = {}
): Parsed<number | null> {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: null };
    const n = Number(trimmed.replace(/[’'\s]/g, '').replace(',', '.'));
    if (!Number.isFinite(n)) return fail(invalid, field);
    if (options.integer && !Number.isInteger(n)) return fail(invalid, field);
    if (options.min != null && n < options.min) return fail(invalid, field);
    return { ok: true, value: n };
}

function optionalDate(raw: string | null, field: string, invalid: RealEstatePayloadErrorCode): Parsed<string | null> {
    const value = emptyToNull(raw);
    if (value && !isValidYmd(value)) return fail(invalid, field);
    return { ok: true, value };
}

function optionalUnit(raw: string, context: RealEstatePayloadContext): Parsed<string | null> {
    const unitPublicId = emptyToNull(raw);
    if (unitPublicId && context.unitIds && !context.unitIds.has(unitPublicId)) return fail('unitInvalid', 'unitPublicId');
    return { ok: true, value: unitPublicId };
}

/* ── lots ────────────────────────────────────────────────────────────────── */

export type RealEstateUnitFormFields = {
    name: string;
    unitType: UnitType | '';
    surfaceM2: string;
    rooms: string;
    floor: string;
    isRentable: boolean;
    notes: string;
};

export function emptyUnitFormFields(): RealEstateUnitFormFields {
    return { name: '', unitType: 'appartement', surfaceM2: '', rooms: '', floor: '', isRentable: true, notes: '' };
}

export function unitToFormFields(unit: RealEstateUnit): RealEstateUnitFormFields {
    return {
        name: unit.name,
        unitType: unit.unitType,
        surfaceM2: unit.surfaceM2 == null ? '' : String(unit.surfaceM2),
        rooms: unit.rooms == null ? '' : String(unit.rooms),
        floor: unit.floor == null ? '' : String(unit.floor),
        isRentable: unit.isRentable,
        notes: unit.notes ?? ''
    };
}

export function buildUnitPayload(fields: RealEstateUnitFormFields): BuildRealEstatePayloadResult<SaveRealEstateUnitPayload> {
    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > REAL_ESTATE_NAME_MAX) return fail('nameTooLong', 'name');
    if (!isUnitType(fields.unitType)) return fail('unitTypeInvalid', 'unitType');
    const surface = optionalNumber(fields.surfaceM2, 'surfaceM2', 'surfaceInvalid', { min: 0 });
    if (!surface.ok) return surface;
    const rooms = optionalNumber(fields.rooms, 'rooms', 'roomsInvalid', { min: 0 });
    if (!rooms.ok) return rooms;
    const floor = optionalNumber(fields.floor, 'floor', 'floorInvalid', { integer: true });
    if (!floor.ok) return floor;
    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > REAL_ESTATE_NOTES_MAX) return fail('notesTooLong', 'notes');
    return {
        ok: true,
        payload: {
            name,
            unitType: fields.unitType,
            surfaceM2: surface.value,
            rooms: rooms.value,
            floor: floor.value,
            isRentable: !!fields.isRentable,
            notes
        }
    };
}

export function isUnitFormDirty(unit: RealEstateUnit, fields: RealEstateUnitFormFields): boolean {
    const base = unitToFormFields(unit);
    return (
        fields.name.trim() !== base.name.trim() ||
        fields.unitType !== base.unitType ||
        fields.surfaceM2.trim() !== base.surfaceM2 ||
        fields.rooms.trim() !== base.rooms ||
        fields.floor.trim() !== base.floor ||
        fields.isRentable !== base.isRentable ||
        (emptyToNull(fields.notes) ?? '') !== (emptyToNull(base.notes) ?? '')
    );
}

/* ── charges ─────────────────────────────────────────────────────────────── */

export type RealEstateChargeFormFields = {
    name: string;
    chargeType: ChargeType | '';
    amount: string;
    periodicity: ChargePeriodicity | '';
    startDate: string | null;
    endDate: string | null;
    unitPublicId: string;
    tierPublicId: string;
    /** Non saisi dans l’UI (laissé `null`) — voir le contrat. */
    transactionPublicId: string;
};

export function emptyChargeFormFields(): RealEstateChargeFormFields {
    return {
        name: '',
        chargeType: 'other',
        amount: '',
        periodicity: 'mensuelle',
        startDate: null,
        endDate: null,
        unitPublicId: '',
        tierPublicId: '',
        transactionPublicId: ''
    };
}

export function chargeToFormFields(charge: RealEstateCharge): RealEstateChargeFormFields {
    return {
        name: charge.name,
        chargeType: charge.chargeType,
        amount: String(charge.amount),
        periodicity: charge.periodicity,
        startDate: charge.startDate,
        endDate: charge.endDate,
        unitPublicId: charge.unitPublicId ?? '',
        tierPublicId: charge.tierPublicId ?? '',
        transactionPublicId: charge.transactionPublicId ?? ''
    };
}

export function buildChargePayload(
    fields: RealEstateChargeFormFields,
    context: RealEstatePayloadContext = {}
): BuildRealEstatePayloadResult<SaveRealEstateChargePayload> {
    const name = fields.name.trim();
    if (!name) return fail('nameRequired', 'name');
    if (name.length > REAL_ESTATE_NAME_MAX) return fail('nameTooLong', 'name');
    if (!isChargeType(fields.chargeType)) return fail('chargeTypeInvalid', 'chargeType');
    if (!isChargePeriodicity(fields.periodicity)) return fail('periodicityInvalid', 'periodicity');
    const amount = parseAccountAmount(fields.amount.trim());
    if (amount == null) return fail('amountInvalid', 'amount');
    if (amount < 0) return fail('amountNegative', 'amount');
    const start = optionalDate(fields.startDate, 'startDate', 'startDateInvalid');
    if (!start.ok) return start;
    const end = optionalDate(fields.endDate, 'endDate', 'endDateInvalid');
    if (!end.ok) return end;
    if (start.value && end.value && end.value < start.value) return fail('endDateBeforeStart', 'endDate');
    const unit = optionalUnit(fields.unitPublicId, context);
    if (!unit.ok) return unit;
    return {
        ok: true,
        payload: {
            name,
            chargeType: fields.chargeType,
            amount,
            periodicity: fields.periodicity,
            startDate: start.value,
            endDate: end.value,
            unitPublicId: unit.value,
            tierPublicId: emptyToNull(fields.tierPublicId),
            transactionPublicId: emptyToNull(fields.transactionPublicId)
        }
    };
}

export function isChargeFormDirty(charge: RealEstateCharge, fields: RealEstateChargeFormFields): boolean {
    const base = chargeToFormFields(charge);
    return (
        fields.name.trim() !== base.name.trim() ||
        fields.chargeType !== base.chargeType ||
        parseAccountAmount(fields.amount.trim()) !== charge.amount ||
        fields.periodicity !== base.periodicity ||
        emptyToNull(fields.startDate) !== emptyToNull(base.startDate) ||
        emptyToNull(fields.endDate) !== emptyToNull(base.endDate) ||
        emptyToNull(fields.unitPublicId) !== emptyToNull(base.unitPublicId) ||
        emptyToNull(fields.tierPublicId) !== emptyToNull(base.tierPublicId) ||
        emptyToNull(fields.transactionPublicId) !== emptyToNull(base.transactionPublicId)
    );
}

/* ── travaux ─────────────────────────────────────────────────────────────── */

export type RealEstateMaintenanceFormFields = {
    maintenanceDate: string | null;
    maintenanceType: RealEstateMaintenanceType | '';
    description: string;
    cost: string;
    nextMaintenanceDate: string | null;
    unitPublicId: string;
    providerTierPublicId: string;
    transactionPublicId: string;
};

export function emptyMaintenanceFormFields(defaults: { today?: string | null } = {}): RealEstateMaintenanceFormFields {
    return {
        maintenanceDate: defaults.today ?? null,
        maintenanceType: 'reparation',
        description: '',
        cost: '',
        nextMaintenanceDate: null,
        unitPublicId: '',
        providerTierPublicId: '',
        transactionPublicId: ''
    };
}

export function maintenanceToFormFields(item: RealEstateMaintenance): RealEstateMaintenanceFormFields {
    return {
        maintenanceDate: item.maintenanceDate,
        maintenanceType: item.maintenanceType,
        description: item.description ?? '',
        cost: item.cost == null ? '' : String(item.cost),
        nextMaintenanceDate: item.nextMaintenanceDate,
        unitPublicId: item.unitPublicId ?? '',
        providerTierPublicId: item.providerTierPublicId ?? '',
        transactionPublicId: item.transactionPublicId ?? ''
    };
}

export function buildMaintenancePayload(
    fields: RealEstateMaintenanceFormFields,
    context: RealEstatePayloadContext = {}
): BuildRealEstatePayloadResult<SaveRealEstateMaintenancePayload> {
    const maintenanceDate = emptyToNull(fields.maintenanceDate);
    if (!maintenanceDate) return fail('maintenanceDateRequired', 'maintenanceDate');
    if (!isValidYmd(maintenanceDate)) return fail('maintenanceDateInvalid', 'maintenanceDate');
    if (context.today && maintenanceDate > context.today) return fail('maintenanceDateFuture', 'maintenanceDate');
    if (!isRealEstateMaintenanceType(fields.maintenanceType)) return fail('maintenanceTypeInvalid', 'maintenanceType');
    const description = emptyToNull(fields.description);
    if (description && description.length > REAL_ESTATE_DESCRIPTION_MAX) return fail('descriptionTooLong', 'description');
    const cost = optionalAmount(fields.cost, 'cost', 'costInvalid', 'costNegative');
    if (!cost.ok) return cost;
    const next = optionalDate(fields.nextMaintenanceDate, 'nextMaintenanceDate', 'nextDateInvalid');
    if (!next.ok) return next;
    if (next.value && next.value < maintenanceDate) return fail('nextDateBeforeDate', 'nextMaintenanceDate');
    const unit = optionalUnit(fields.unitPublicId, context);
    if (!unit.ok) return unit;
    return {
        ok: true,
        payload: {
            maintenanceDate,
            maintenanceType: fields.maintenanceType,
            description,
            cost: cost.value,
            nextMaintenanceDate: next.value,
            unitPublicId: unit.value,
            providerTierPublicId: emptyToNull(fields.providerTierPublicId),
            transactionPublicId: emptyToNull(fields.transactionPublicId)
        }
    };
}

export function isMaintenanceFormDirty(item: RealEstateMaintenance, fields: RealEstateMaintenanceFormFields): boolean {
    const base = maintenanceToFormFields(item);
    const cost = fields.cost.trim() ? parseAccountAmount(fields.cost.trim()) : null;
    return (
        emptyToNull(fields.maintenanceDate) !== emptyToNull(base.maintenanceDate) ||
        fields.maintenanceType !== base.maintenanceType ||
        (emptyToNull(fields.description) ?? '') !== (emptyToNull(base.description) ?? '') ||
        cost !== item.cost ||
        emptyToNull(fields.nextMaintenanceDate) !== emptyToNull(base.nextMaintenanceDate) ||
        emptyToNull(fields.unitPublicId) !== emptyToNull(base.unitPublicId) ||
        emptyToNull(fields.providerTierPublicId) !== emptyToNull(base.providerTierPublicId) ||
        emptyToNull(fields.transactionPublicId) !== emptyToNull(base.transactionPublicId)
    );
}

/* ── documents ───────────────────────────────────────────────────────────── */

export type RealEstateDocumentFormFields = {
    /** Création seulement (le fichier ne change pas en édition). */
    filePublicId: string;
    documentType: DocumentType | '';
    name: string;
    documentDate: string | null;
    notes: string;
    unitPublicId: string;
};

export function emptyDocumentFormFields(): RealEstateDocumentFormFields {
    return { filePublicId: '', documentType: 'other', name: '', documentDate: null, notes: '', unitPublicId: '' };
}

export function documentToFormFields(doc: RealEstateDocument): RealEstateDocumentFormFields {
    return {
        filePublicId: doc.file?.publicId ?? '',
        documentType: doc.documentType,
        name: doc.name,
        documentDate: doc.documentDate,
        notes: doc.notes ?? '',
        unitPublicId: doc.unitPublicId ?? ''
    };
}

type DocumentCommon = BuildRealEstatePayloadFail | { ok: true; value: UpdateRealEstateDocumentPayload };

function documentCommon(fields: RealEstateDocumentFormFields, context: RealEstatePayloadContext): DocumentCommon {
    if (!isDocumentType(fields.documentType)) return fail('documentTypeInvalid', 'documentType');
    const name = emptyToNull(fields.name);
    if (name && name.length > REAL_ESTATE_NAME_MAX) return fail('nameTooLong', 'name');
    const date = optionalDate(fields.documentDate, 'documentDate', 'documentDateInvalid');
    if (!date.ok) return date;
    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > REAL_ESTATE_NOTES_MAX) return fail('notesTooLong', 'notes');
    const unit = optionalUnit(fields.unitPublicId, context);
    if (!unit.ok) return unit;
    return { ok: true, value: { name, documentType: fields.documentType, documentDate: date.value, notes, unitPublicId: unit.value } };
}

export function buildCreateDocumentPayload(
    fields: RealEstateDocumentFormFields,
    context: RealEstatePayloadContext = {}
): BuildRealEstatePayloadResult<CreateRealEstateDocumentPayload> {
    const filePublicId = emptyToNull(fields.filePublicId);
    if (!filePublicId) return fail('fileRequired', 'filePublicId');
    const common = documentCommon(fields, context);
    if (!common.ok) return common;
    return { ok: true, payload: { filePublicId, ...common.value } };
}

export function buildUpdateDocumentPayload(
    fields: RealEstateDocumentFormFields,
    context: RealEstatePayloadContext = {}
): BuildRealEstatePayloadResult<UpdateRealEstateDocumentPayload> {
    const common = documentCommon(fields, context);
    if (!common.ok) return common;
    return { ok: true, payload: common.value };
}

export function isDocumentFormDirty(doc: RealEstateDocument, fields: RealEstateDocumentFormFields): boolean {
    const base = documentToFormFields(doc);
    return (
        (emptyToNull(fields.name) ?? '') !== (emptyToNull(base.name) ?? '') ||
        fields.documentType !== base.documentType ||
        emptyToNull(fields.documentDate) !== emptyToNull(base.documentDate) ||
        (emptyToNull(fields.notes) ?? '') !== (emptyToNull(base.notes) ?? '') ||
        emptyToNull(fields.unitPublicId) !== emptyToNull(base.unitPublicId)
    );
}

/* ── baux ────────────────────────────────────────────────────────────────── */

export type RealEstateRentalFormFields = {
    tenantTierPublicId: string;
    unitPublicId: string;
    startDate: string | null;
    endDate: string | null;
    monthlyRent: string;
    monthlyCharges: string;
    deposit: string;
    recurringIncomePublicId: string;
    notes: string;
    /** Édition : `''` = laisser l’API décider (`null`). */
    status: RentalStoredStatus | '';
};

export function emptyRentalFormFields(defaults: { today?: string | null } = {}): RealEstateRentalFormFields {
    return {
        tenantTierPublicId: '',
        unitPublicId: '',
        startDate: defaults.today ?? null,
        endDate: null,
        monthlyRent: '',
        monthlyCharges: '',
        deposit: '',
        recurringIncomePublicId: '',
        notes: '',
        status: ''
    };
}

export function rentalToFormFields(rental: RealEstateRental): RealEstateRentalFormFields {
    return {
        tenantTierPublicId: rental.tenantTierPublicId,
        unitPublicId: rental.unitPublicId ?? '',
        startDate: rental.startDate,
        endDate: rental.endDate,
        monthlyRent: String(rental.monthlyRent),
        monthlyCharges: rental.monthlyCharges == null ? '' : String(rental.monthlyCharges),
        deposit: rental.deposit == null ? '' : String(rental.deposit),
        recurringIncomePublicId: rental.recurringIncomePublicId ?? '',
        notes: rental.notes ?? '',
        // statut stocké pré-rempli : renvoyé tel quel en PUT (l’effectif `aVenir` n’est jamais stocké)
        status: isRentalStoredStatus(rental.storedStatus) ? rental.storedStatus : ''
    };
}

type RentalCommon = BuildRealEstatePayloadFail | { ok: true; value: CreateRealEstateRentalPayload };

function rentalCommon(fields: RealEstateRentalFormFields, context: RealEstatePayloadContext): RentalCommon {
    const tenantTierPublicId = emptyToNull(fields.tenantTierPublicId);
    if (!tenantTierPublicId) return fail('tenantRequired', 'tenantTierPublicId');
    const startDate = emptyToNull(fields.startDate);
    if (!startDate || !isValidYmd(startDate)) return fail('startDateInvalid', 'startDate');
    const end = optionalDate(fields.endDate, 'endDate', 'endDateInvalid');
    if (!end.ok) return end;
    if (end.value && end.value < startDate) return fail('endDateBeforeStart', 'endDate');
    const monthlyRent = parseAccountAmount(fields.monthlyRent.trim());
    if (monthlyRent == null) return fail('rentInvalid', 'monthlyRent');
    if (monthlyRent < 0) return fail('rentNegative', 'monthlyRent');
    const charges = optionalAmount(fields.monthlyCharges, 'monthlyCharges', 'chargesInvalid', 'chargesNegative');
    if (!charges.ok) return charges;
    const deposit = optionalAmount(fields.deposit, 'deposit', 'depositInvalid', 'depositNegative');
    if (!deposit.ok) return deposit;
    const unitPublicId = emptyToNull(fields.unitPublicId);
    if (unitPublicId) {
        if (context.unitIds && !context.unitIds.has(unitPublicId)) return fail('unitInvalid', 'unitPublicId');
        if (context.rentableUnitIds && !context.rentableUnitIds.has(unitPublicId)) return fail('unitNotRentable', 'unitPublicId');
    }
    const notes = emptyToNull(fields.notes);
    if (notes && notes.length > REAL_ESTATE_NOTES_MAX) return fail('notesTooLong', 'notes');
    return {
        ok: true,
        value: {
            tenantTierPublicId,
            startDate,
            monthlyRent,
            endDate: end.value,
            monthlyCharges: charges.value,
            deposit: deposit.value,
            unitPublicId,
            recurringIncomePublicId: emptyToNull(fields.recurringIncomePublicId),
            notes
        }
    };
}

export function buildCreateRentalPayload(
    fields: RealEstateRentalFormFields,
    context: RealEstatePayloadContext = {}
): BuildRealEstatePayloadResult<CreateRealEstateRentalPayload> {
    const common = rentalCommon(fields, context);
    if (!common.ok) return common;
    return { ok: true, payload: common.value };
}

/** `status` : `''` → `null` (le serveur décide) ; `aVenir` n’est jamais envoyé (refusé ici). */
export function buildUpdateRentalPayload(
    fields: RealEstateRentalFormFields,
    context: RealEstatePayloadContext = {}
): BuildRealEstatePayloadResult<UpdateRealEstateRentalPayload> {
    const common = rentalCommon(fields, context);
    if (!common.ok) return common;
    const statusRaw = emptyToNull(fields.status);
    let status: RentalStoredStatus | null = null;
    if (statusRaw) {
        if (!isRentalStoredStatus(statusRaw)) return fail('statusInvalid', 'status');
        status = statusRaw;
    }
    return { ok: true, payload: { ...common.value, status } };
}

export function isRentalFormDirty(rental: RealEstateRental, fields: RealEstateRentalFormFields): boolean {
    const base = rentalToFormFields(rental);
    const charges = fields.monthlyCharges.trim() ? parseAccountAmount(fields.monthlyCharges.trim()) : null;
    const deposit = fields.deposit.trim() ? parseAccountAmount(fields.deposit.trim()) : null;
    return (
        emptyToNull(fields.tenantTierPublicId) !== emptyToNull(base.tenantTierPublicId) ||
        emptyToNull(fields.unitPublicId) !== emptyToNull(base.unitPublicId) ||
        emptyToNull(fields.startDate) !== emptyToNull(base.startDate) ||
        emptyToNull(fields.endDate) !== emptyToNull(base.endDate) ||
        parseAccountAmount(fields.monthlyRent.trim()) !== rental.monthlyRent ||
        charges !== rental.monthlyCharges ||
        deposit !== rental.deposit ||
        emptyToNull(fields.recurringIncomePublicId) !== emptyToNull(base.recurringIncomePublicId) ||
        (emptyToNull(fields.notes) ?? '') !== (emptyToNull(base.notes) ?? '') ||
        (emptyToNull(fields.status) ?? '') !== (emptyToNull(base.status) ?? '')
    );
}
