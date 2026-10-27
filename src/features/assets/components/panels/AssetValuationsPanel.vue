<script setup lang="ts">
/**
 * Historique des valorisations d’un actif (clé = date, une par jour) : saisie en ligne d’une
 * valorisation (ajout ou remplacement de la date), tableau éditorial, suppression confirmée.
 * La dernière valorisation restante ne peut pas être supprimée (400 côté API, bouton désactivé ici).
 */
defineOptions({ name: 'AssetValuationsPanel' });

import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlusIcon, TrashIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { formatAssetAmount, formatCalendarDate } from '@/features/assets/format';
import { buildSaveValuationPayload, emptyAssetValuationFormFields, type AssetPayloadErrorCode } from '@/features/assets/payload';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import type { Asset, AssetValuation } from '@/features/assets/types';

const props = defineProps<{
    asset: Asset;
}>();

const { t, locale } = useI18n();
const store = useAssetsStore();
const settings = useUserSettingsStore();

const form = reactive(emptyAssetValuationFormFields());
const fieldErrors = reactive<{ valuationDate: string | null; value: string | null }>({ valuationDate: null, value: null });
const localError = ref<string | null>(null);
const deleteTarget = ref<AssetValuation | null>(null);

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const items = computed(() => store.valuationsFor(props.asset.publicId));
const canDelete = computed(() => items.value.length > 1);

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

function resetForm() {
    Object.assign(form, emptyAssetValuationFormFields({ date: today.value }));
    fieldErrors.valuationDate = null;
    fieldErrors.value = null;
}

async function load(force = false) {
    localError.value = null;
    try {
        await store.loadValuations(props.asset.publicId, { force });
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
    fieldErrors.valuationDate = null;
    fieldErrors.value = null;
    const built = buildSaveValuationPayload(form, { today: today.value });
    if (!built.ok) {
        if (built.field === 'valuationDate') fieldErrors.valuationDate = errorText(built.code);
        else if (built.field === 'value') fieldErrors.value = errorText(built.code);
        else localError.value = errorText(built.code);
        return;
    }
    try {
        await store.saveValuation(props.asset.publicId, form, { today: today.value });
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
        await store.deleteValuation(props.asset.publicId, target.valuationDate);
        deleteTarget.value = null;
    } catch (e: unknown) {
        deleteTarget.value = null;
        localError.value = getErrorMessage(e);
    }
}

function sourceLabel(item: AssetValuation): string {
    return t(`assetsPage.valuationSources.${item.source}`);
}
</script>

<template>
    <div class="asset-subpanel">
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <p class="asset-subpanel__hint">{{ t('assetsPage.valuations.hint') }}</p>

        <form class="asset-subpanel__add" @submit.prevent="onAdd">
            <div class="asset-subpanel__cell">
                <AppDatePicker v-model="form.valuationDate" :label="t('assetsPage.valuations.date')" :max="today" :clearable="false" />
                <p v-if="fieldErrors.valuationDate" class="asset-subpanel__error">{{ fieldErrors.valuationDate }}</p>
            </div>
            <div class="asset-subpanel__cell">
                <v-text-field
                    v-model="form.value"
                    type="number"
                    step="0.01"
                    min="0"
                    :label="t('assetsPage.valuations.value')"
                    :suffix="asset.currency"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.value"
                    :error-messages="fieldErrors.value || undefined"
                />
            </div>
            <button type="submit" class="su-btn su-btn--ink asset-subpanel__submit" :disabled="store.acting">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('assetsPage.actions.add') }}
            </button>
        </form>

        <div v-if="store.loadingValuations && !items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <p v-else-if="!items.length" class="asset-subpanel__empty">{{ t('assetsPage.valuations.empty') }}</p>
        <div v-else class="su-table-wrap">
            <table class="su-table">
                <thead>
                    <tr>
                        <th>{{ t('assetsPage.valuations.date') }}</th>
                        <th class="is-num">{{ t('assetsPage.valuations.value') }}</th>
                        <th>{{ t('assetsPage.valuations.source') }}</th>
                        <th class="asset-subpanel__actions-col" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in items" :key="item.valuationDate">
                        <td>{{ formatCalendarDate(item.valuationDate, locale) }}</td>
                        <td class="is-num asset-subpanel__amount">
                            {{ formatAssetAmount(item.value) }} <small>{{ asset.currency }}</small>
                        </td>
                        <td class="asset-subpanel__muted">{{ sourceLabel(item) }}</td>
                        <td class="asset-subpanel__actions-col">
                            <button
                                type="button"
                                class="su-orb"
                                :disabled="store.acting || !canDelete"
                                :title="canDelete ? undefined : t('assetsPage.valuations.lastHint')"
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
            :title="t('assetsPage.valuations.deleteTitle')"
            :message="
                deleteTarget ? t('assetsPage.valuations.deleteBody', { date: formatCalendarDate(deleteTarget.valuationDate, locale) }) : ''
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
