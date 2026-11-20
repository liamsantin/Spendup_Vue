import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';
import type { RealEstatePayloadErrorCode } from '@/features/real-estate/payload';

const PAYLOAD_ERROR_CODES = new Set<string>([
    'nameRequired',
    'nameTooLong',
    'notesTooLong',
    'descriptionTooLong',
    'unitTypeInvalid',
    'surfaceInvalid',
    'roomsInvalid',
    'floorInvalid',
    'chargeTypeInvalid',
    'periodicityInvalid',
    'amountInvalid',
    'amountNegative',
    'startDateInvalid',
    'endDateInvalid',
    'endDateBeforeStart',
    'unitInvalid',
    'unitNotRentable',
    'maintenanceTypeInvalid',
    'maintenanceDateRequired',
    'maintenanceDateInvalid',
    'maintenanceDateFuture',
    'nextDateInvalid',
    'nextDateBeforeDate',
    'costInvalid',
    'costNegative',
    'documentTypeInvalid',
    'fileRequired',
    'documentDateInvalid',
    'tenantRequired',
    'rentInvalid',
    'rentNegative',
    'chargesInvalid',
    'chargesNegative',
    'depositInvalid',
    'depositNegative',
    'statusInvalid'
]);

/**
 * État commun des modales de sous-ressources : erreurs par champ (codes `payload.ts` traduits),
 * erreur globale (400 tel quel, 404 neutre), lots du bien pour les sélecteurs.
 */
export function useRealEstateForm(assetPublicId: () => string) {
    const { t } = useI18n();
    const store = useRealEstateStore();
    const assetsStore = useAssetsStore();

    const fieldErrors = reactive<Record<string, string | null>>({});
    const localError = ref<string | null>(null);

    const asset = computed(() => assetsStore.findByPublicId(assetPublicId()));
    const currency = computed(() => asset.value?.currency ?? '');
    const units = computed(() => store.unitsFor(assetPublicId()));

    /** Sélecteur de lot : « bien entier » + lots (option `rentableOnly` pour les baux). */
    function unitItems(options: { rentableOnly?: boolean; keep?: string | null } = {}) {
        const none = { title: t('realEstatePage.form.wholeProperty'), value: '' };
        const list = units.value
            .filter((unit) => !options.rentableOnly || unit.isRentable || unit.publicId === options.keep)
            .map((unit) => ({ title: unit.name, value: unit.publicId }));
        return [none, ...list];
    }

    function clearErrors() {
        for (const key of Object.keys(fieldErrors)) fieldErrors[key] = null;
        localError.value = null;
    }

    function applyPayloadError(code: RealEstatePayloadErrorCode, field?: string) {
        const message = t(`realEstatePage.form.errors.${code}`);
        if (field) fieldErrors[field] = message;
        else localError.value = message;
    }

    /** Erreur d’écriture : code client → champ, 404 → message neutre, sinon message API tel quel. */
    function applyError(e: unknown, notFoundKey: string, field?: string) {
        const err = AppError.fromUnknown(e);
        store.clearError();
        if (err.code && PAYLOAD_ERROR_CODES.has(err.code)) {
            applyPayloadError(err.code as RealEstatePayloadErrorCode, field);
            return;
        }
        localError.value = err.status === 404 ? t(notFoundKey) : getErrorMessage(e);
    }

    function ensureUnits() {
        const id = assetPublicId();
        if (id) void store.loadUnits(id).catch(() => undefined);
    }

    return { store, fieldErrors, localError, asset, currency, units, unitItems, clearErrors, applyPayloadError, applyError, ensureUnits };
}
