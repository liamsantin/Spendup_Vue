<script setup lang="ts">
/** Onglet « Travaux » : du plus récent au plus ancien, prochaine échéance dépassée en violet. */
defineOptions({ name: 'RealEstateMaintenancePanel' });

import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useUserSettingsStore } from '@/features/user-settings';
import { useRealEstatePanel } from '@/features/real-estate/composables/useRealEstatePanel';
import { formatCalendarDate, formatRealEstateAmount, unitNameOf } from '@/features/real-estate/format';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';
import type { RealEstateMaintenance } from '@/features/real-estate/types';
import RealEstateMaintenanceFormModal from '@/features/real-estate/components/modals/RealEstateMaintenanceFormModal.vue';
import RealEstatePanelFrame from '@/features/real-estate/components/panels/RealEstatePanelFrame.vue';
import RealEstateRowMenu from '@/features/real-estate/components/panels/RealEstateRowMenu.vue';

const props = defineProps<{
    assetPublicId: string;
    currency: string;
}>();

const { t, locale } = useI18n();
const settings = useUserSettingsStore();
const store = useRealEstateStore();
const panel = useRealEstatePanel<RealEstateMaintenance>({
    notFoundKey: 'realEstatePage.errors.maintenanceNotFound',
    remove: (item) => store.deleteMaintenance(props.assetPublicId, item.publicId),
    reload: () => store.loadMaintenance(props.assetPublicId, true)
});
const { createOpen, editOpen, editTarget, deleteOpen, errorText } = panel;

const items = computed(() => store.maintenanceFor(props.assetPublicId));
const units = computed(() => store.unitsFor(props.assetPublicId));
const loading = computed(() => store.loadingFor(props.assetPublicId, 'maintenance'));
const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const countLabel = computed(() =>
    items.value.length ? t('realEstatePage.maintenance.count', { count: items.value.length }, items.value.length) : null
);
const total = computed(() => items.value.reduce((sum, item) => sum + (Number(item.cost) || 0), 0));

const empty = t('common.emptyValue');
const money = (amount: number | null, currency?: string) =>
    amount == null ? empty : formatRealEstateAmount(amount, currency || props.currency, locale.value);

function isOverdue(item: RealEstateMaintenance): boolean {
    return !!item.nextMaintenanceDate && item.nextMaintenanceDate < today.value;
}

watch(
    () => props.assetPublicId,
    (id) => {
        if (id) void panel.load(() => store.loadMaintenance(id));
    },
    { immediate: true }
);
</script>

<template>
    <RealEstatePanelFrame
        :count-label="countLabel"
        :add-label="t('realEstatePage.maintenance.add')"
        :loading="loading"
        :empty="!items.length"
        :empty-text="t('realEstatePage.maintenance.empty')"
        :error="errorText"
        :disabled="store.acting"
        @add="panel.openCreate"
        @dismiss="panel.dismissError"
    >
        <table class="su-table">
            <thead>
                <tr>
                    <th scope="col">{{ t('realEstatePage.maintenance.columns.date') }}</th>
                    <th scope="col">{{ t('realEstatePage.maintenance.columns.type') }}</th>
                    <th scope="col">{{ t('realEstatePage.maintenance.columns.description') }}</th>
                    <th scope="col">{{ t('realEstatePage.maintenance.columns.unit') }}</th>
                    <th scope="col">{{ t('realEstatePage.maintenance.columns.provider') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.maintenance.columns.cost') }}</th>
                    <th scope="col">{{ t('realEstatePage.maintenance.columns.next') }}</th>
                    <th scope="col">
                        <span class="d-sr-only">{{ t('common.more') }}</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in items" :key="item.publicId">
                    <td>{{ formatCalendarDate(item.maintenanceDate, locale) }}</td>
                    <td class="is-strong">{{ t(`realEstatePage.maintenanceTypes.${item.maintenanceType}`) }}</td>
                    <td class="is-wrap">{{ item.description || empty }}</td>
                    <td>{{ unitNameOf(units, item.unitPublicId) ?? t('realEstatePage.form.wholeProperty') }}</td>
                    <td>{{ item.providerTierName || empty }}</td>
                    <td class="is-num">{{ money(item.cost, item.currency) }}</td>
                    <td :class="{ 'su-over': isOverdue(item) }">
                        <template v-if="item.nextMaintenanceDate">
                            {{ formatCalendarDate(item.nextMaintenanceDate, locale) }}
                            <span v-if="isOverdue(item)" class="is-sub su-over">{{ t('realEstatePage.maintenance.overdue') }}</span>
                        </template>
                        <template v-else>{{ empty }}</template>
                    </td>
                    <td class="is-actions">
                        <RealEstateRowMenu :disabled="store.acting" @edit="panel.openEdit(item)" @delete="panel.requestDelete(item)" />
                    </td>
                </tr>
            </tbody>
        </table>

        <template v-if="items.length" #footer>
            <div class="su-kv su-kv--strong re-maintenance__total">
                <span>{{ t('realEstatePage.maintenance.total') }}</span>
                <span>{{ money(total) }}</span>
            </div>
        </template>
    </RealEstatePanelFrame>

    <RealEstateMaintenanceFormModal v-model="createOpen" :asset-public-id="assetPublicId" />
    <RealEstateMaintenanceFormModal v-model="editOpen" :asset-public-id="assetPublicId" :maintenance="editTarget" />

    <AppConfirmationModal
        v-model="deleteOpen"
        :title="t('realEstatePage.maintenance.deleteTitle')"
        :message="t('realEstatePage.maintenance.deleteBody')"
        :confirm-label="t('realEstatePage.actions.delete')"
        confirm-color="error"
        :loading="store.acting"
        @confirm="panel.confirmDelete"
    />
</template>

<style scoped>
.re-maintenance__total {
    border-top: 2px solid var(--ink);
    font-variant-numeric: tabular-nums;
}
</style>
