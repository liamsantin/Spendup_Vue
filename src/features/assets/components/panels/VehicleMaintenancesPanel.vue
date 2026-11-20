<script setup lang="ts">
/**
 * Entretiens d’un véhicule : tableau éditorial (date, type, kilométrage, garage, coût, prochain),
 * boutons modifier / supprimer (confirmé) par ligne, ajout et édition via `VehicleMaintenanceFormModal`.
 */
defineOptions({ name: 'VehicleMaintenancesPanel' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PencilIcon, PlusIcon, TrashIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { formatAssetAmount, formatAssetInteger, formatCalendarDate } from '@/features/assets/format';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import type { Asset, VehicleMaintenance } from '@/features/assets/types';
import VehicleMaintenanceFormModal from '@/features/assets/components/modals/VehicleMaintenanceFormModal.vue';

const props = defineProps<{
    asset: Asset;
}>();

const { t, locale } = useI18n();
const store = useAssetsStore();

const localError = ref<string | null>(null);
const formOpen = ref(false);
const editTarget = ref<VehicleMaintenance | null>(null);
const deleteTarget = ref<VehicleMaintenance | null>(null);

const items = computed(() => store.maintenancesFor(props.asset.publicId));

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

async function load(force = false) {
    localError.value = null;
    try {
        await store.loadMaintenances(props.asset.publicId, force);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

watch(
    () => props.asset.publicId,
    () => {
        void load();
    },
    { immediate: true }
);

function openCreate() {
    editTarget.value = null;
    formOpen.value = true;
}

function openEdit(item: VehicleMaintenance) {
    if (store.acting) return;
    editTarget.value = item;
    formOpen.value = true;
}

async function confirmDelete() {
    const target = deleteTarget.value;
    if (!target) return;
    localError.value = null;
    try {
        await store.deleteMaintenance(props.asset.publicId, target.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        deleteTarget.value = null;
        localError.value = getErrorMessage(e);
    }
}

function nextText(item: VehicleMaintenance): string {
    const parts: string[] = [];
    if (item.nextMaintenanceDate) parts.push(formatCalendarDate(item.nextMaintenanceDate, locale.value));
    if (item.nextMaintenanceKm != null) {
        parts.push(t('assetsPage.maintenances.nextKm', { value: formatAssetInteger(item.nextMaintenanceKm, locale.value) }));
    }
    return parts.join(' · ') || t('common.emptyValue');
}
</script>

<template>
    <div class="asset-maintenances">
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <div class="asset-maintenances__head">
            <p class="asset-maintenances__hint">{{ t('assetsPage.maintenances.hint') }}</p>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="openCreate">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('assetsPage.actions.add') }}
            </button>
        </div>

        <div v-if="store.loadingVehicle && !items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <p v-else-if="!items.length" class="asset-maintenances__empty">{{ t('assetsPage.maintenances.empty') }}</p>
        <div v-else class="su-table-wrap">
            <table class="su-table asset-maintenances__table">
                <thead>
                    <tr>
                        <th>{{ t('assetsPage.maintenances.date') }}</th>
                        <th>{{ t('assetsPage.maintenances.type') }}</th>
                        <th class="is-num">{{ t('assetsPage.maintenances.kilometrage') }}</th>
                        <th>{{ t('assetsPage.maintenances.garage') }}</th>
                        <th class="is-num">{{ t('assetsPage.maintenances.cost') }}</th>
                        <th>{{ t('assetsPage.maintenances.next') }}</th>
                        <th class="asset-maintenances__actions-col" />
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in items" :key="item.publicId">
                        <td class="asset-maintenances__nowrap">{{ formatCalendarDate(item.maintenanceDate, locale) }}</td>
                        <td class="asset-maintenances__strong">
                            {{ t(`assetsPage.maintenanceTypes.${item.maintenanceType}`) }}
                            <span v-if="item.description" class="asset-maintenances__desc">{{ item.description }}</span>
                        </td>
                        <td class="is-num asset-maintenances__nowrap">
                            {{ item.kilometrage != null ? `${formatAssetInteger(item.kilometrage, locale)} km` : t('common.emptyValue') }}
                        </td>
                        <td class="asset-maintenances__muted">{{ item.garageTierName || t('common.emptyValue') }}</td>
                        <td class="is-num asset-maintenances__nowrap asset-maintenances__strong">
                            <template v-if="item.cost != null">
                                {{ formatAssetAmount(item.cost) }} <small>{{ item.currency || asset.currency }}</small>
                            </template>
                            <template v-else>{{ t('common.emptyValue') }}</template>
                        </td>
                        <td class="asset-maintenances__muted asset-maintenances__nowrap">{{ nextText(item) }}</td>
                        <td class="asset-maintenances__actions-col">
                            <div class="asset-maintenances__actions">
                                <button
                                    type="button"
                                    class="su-orb"
                                    :disabled="store.acting"
                                    :aria-label="t('assetsPage.actions.edit')"
                                    @click="openEdit(item)"
                                >
                                    <PencilIcon :size="16" stroke-width="1.6" />
                                </button>
                                <button
                                    type="button"
                                    class="su-orb"
                                    :disabled="store.acting"
                                    :aria-label="t('assetsPage.actions.delete')"
                                    @click="deleteTarget = item"
                                >
                                    <TrashIcon :size="16" stroke-width="1.6" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <VehicleMaintenanceFormModal v-model="formOpen" :asset="asset" :maintenance="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('assetsPage.maintenances.deleteTitle')"
            :message="
                deleteTarget
                    ? t('assetsPage.maintenances.deleteBody', { date: formatCalendarDate(deleteTarget.maintenanceDate, locale) })
                    : ''
            "
            :confirm-label="t('assetsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.asset-maintenances {
    display: flex;
    flex-direction: column;
    min-height: 100%;
}

.asset-maintenances__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
}

.asset-maintenances__hint,
.asset-maintenances__empty {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
}

.asset-maintenances__empty {
    font-size: 14px;
}

.asset-maintenances__nowrap {
    white-space: nowrap;
}

.asset-maintenances__strong {
    font-weight: 700;
}

.asset-maintenances__strong small {
    color: var(--gray);
    font-size: 12px;
    font-weight: 400;
}

.asset-maintenances__desc {
    display: block;
    max-width: 220px;
    overflow: hidden;
    color: var(--gray);
    font-size: 13px;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.asset-maintenances__muted {
    color: var(--gray);
}

.asset-maintenances__actions-col {
    width: 88px;
}

.asset-maintenances__actions {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
}

@media (max-width: 599.98px) {
    .asset-maintenances__head {
        flex-direction: column;
    }
}
</style>
