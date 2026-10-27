<script setup lang="ts">
/**
 * Relevés kilométriques d’un véhicule (clé = date, un par jour) : saisie en ligne (ajout ou
 * remplacement de la date), tableau éditorial, suppression confirmée. Le kilométrage actuel de
 * l’actif est le relevé le plus récent (refetch de l’actif par le store après chaque écriture).
 */
defineOptions({ name: 'VehicleMileagesPanel' });

import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon, TrashIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { formatAssetInteger, formatCalendarDate } from '@/features/assets/format';
import { buildSaveMileagePayload, emptyVehicleMileageFormFields, type AssetPayloadErrorCode } from '@/features/assets/payload';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import type { Asset, VehicleMileage } from '@/features/assets/types';

const props = defineProps<{
    asset: Asset;
}>();

const { t, locale } = useI18n();
const store = useAssetsStore();
const settings = useUserSettingsStore();

const form = reactive(emptyVehicleMileageFormFields());
const fieldErrors = reactive<{ statementDate: string | null; kilometrage: string | null }>({ statementDate: null, kilometrage: null });
const localError = ref<string | null>(null);
const deleteTarget = ref<VehicleMileage | null>(null);

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const items = computed(() => store.mileagesFor(props.asset.publicId));

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

function resetForm() {
    Object.assign(form, emptyVehicleMileageFormFields({ date: today.value }));
    fieldErrors.statementDate = null;
    fieldErrors.kilometrage = null;
}

async function load(force = false) {
    localError.value = null;
    try {
        await store.loadMileages(props.asset.publicId, force);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

watch(
    () => props.asset.publicId,
    () => {
        resetForm();
        void load();
    },
    { immediate: true }
);

function errorText(code: AssetPayloadErrorCode): string {
    return t(`assetsPage.form.errors.${code}`);
}

async function onAdd() {
    localError.value = null;
    fieldErrors.statementDate = null;
    fieldErrors.kilometrage = null;
    const built = buildSaveMileagePayload(form, { today: today.value });
    if (!built.ok) {
        if (built.field === 'statementDate') fieldErrors.statementDate = errorText(built.code);
        else if (built.field === 'kilometrage') fieldErrors.kilometrage = errorText(built.code);
        else localError.value = errorText(built.code);
        return;
    }
    try {
        await store.saveMileage(props.asset.publicId, form, { today: today.value });
        resetForm();
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function confirmDelete() {
    const target = deleteTarget.value;
    if (!target) return;
    localError.value = null;
    try {
        await store.deleteMileage(props.asset.publicId, target.statementDate);
        deleteTarget.value = null;
    } catch (e: unknown) {
        deleteTarget.value = null;
        localError.value = getErrorMessage(e);
    }
}

/** Source inconnue (nouvelle valeur API) : affichée telle quelle. */
function sourceLabel(item: VehicleMileage): string {
    const key = `assetsPage.mileageSources.${item.source}`;
    const label = t(key);
    return label === key ? item.source : label;
}
</script>

<template>
    <div class="asset-subpanel">
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <p class="asset-subpanel__hint">{{ t('assetsPage.mileages.hint') }}</p>

        <form class="asset-subpanel__add" @submit.prevent="onAdd">
            <div class="asset-subpanel__cell">
                <AppDatePicker v-model="form.statementDate" :label="t('assetsPage.mileages.date')" :max="today" :clearable="false" />
                <p v-if="fieldErrors.statementDate" class="asset-subpanel__error">{{ fieldErrors.statementDate }}</p>
            </div>
            <div class="asset-subpanel__cell">
                <v-text-field
                    v-model="form.kilometrage"
                    type="number"
                    step="1"
                    min="0"
                    :label="t('assetsPage.mileages.kilometrage')"
                    suffix="km"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.kilometrage"
                    :error-messages="fieldErrors.kilometrage || undefined"
                />
            </div>
            <button type="submit" class="su-btn su-btn--ink asset-subpanel__submit" :disabled="store.acting">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('assetsPage.actions.add') }}
            </button>
        </form>

        <div v-if="store.loadingVehicle && !items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <p v-else-if="!items.length" class="asset-subpanel__empty">{{ t('assetsPage.mileages.empty') }}</p>
        <div v-else class="su-table-wrap">
            <table class="su-table">
                <thead>
                    <tr>
                        <th>{{ t('assetsPage.mileages.date') }}</th>
                        <th class="is-num">{{ t('assetsPage.mileages.kilometrage') }}</th>
                        <th>{{ t('assetsPage.mileages.source') }}</th>
                        <th class="asset-subpanel__actions-col" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in items" :key="item.statementDate">
                        <td>{{ formatCalendarDate(item.statementDate, locale) }}</td>
                        <td class="is-num asset-subpanel__amount">{{ formatAssetInteger(item.kilometrage, locale) }} <small>km</small></td>
                        <td class="asset-subpanel__muted">{{ sourceLabel(item) }}</td>
                        <td class="asset-subpanel__actions-col">
                            <button
                                type="button"
                                class="su-orb"
                                :disabled="store.acting"
                                :aria-label="t('assetsPage.actions.deleteRow')"
                                @click="deleteTarget = item"
                            >
                                <TrashIcon :size="16" stroke-width="1.6" />
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('assetsPage.mileages.deleteTitle')"
            :message="
                deleteTarget ? t('assetsPage.mileages.deleteBody', { date: formatCalendarDate(deleteTarget.statementDate, locale) }) : ''
            "
            :confirm-label="t('assetsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.asset-subpanel {
    display: flex;
    flex-direction: column;
    min-height: 100%;
}

.asset-subpanel__hint {
    margin: 0 0 12px;
    color: var(--gray);
    font-size: 13px;
}

/* saisie en ligne : date | valeur | bouton */
.asset-subpanel__add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
    margin-bottom: 20px;
}

.asset-subpanel__cell {
    min-width: 0;
}

.asset-subpanel__cell :deep(.v-field) {
    --v-input-control-height: 42px;
}

.asset-subpanel__submit {
    min-height: 42px;
}

.asset-subpanel__error {
    margin: 4px 0 0;
    color: var(--danger);
    font-size: 13px;
}

.asset-subpanel__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.asset-subpanel__amount {
    font-weight: 700;
    white-space: nowrap;
}

.asset-subpanel__amount small {
    color: var(--gray);
    font-size: 12px;
    font-weight: 400;
}

.asset-subpanel__muted {
    color: var(--gray);
}

.asset-subpanel__actions-col {
    width: 48px;
    text-align: right;
}

.asset-subpanel__actions-col .su-orb:disabled {
    opacity: 0.35;
    cursor: default;
}

@media (max-width: 599.98px) {
    .asset-subpanel__add {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
