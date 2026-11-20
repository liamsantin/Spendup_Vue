<script setup lang="ts">
/** Onglet « Charges » : charges du bien, équivalent mensuel et total des charges en cours. */
defineOptions({ name: 'RealEstateChargesPanel' });

import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { useRealEstatePanel } from '@/features/real-estate/composables/useRealEstatePanel';
import { formatRealEstateAmount, formatRealEstatePeriod, sumCurrentMonthlyCharges, unitNameOf } from '@/features/real-estate/format';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';
import type { RealEstateCharge } from '@/features/real-estate/types';
import RealEstateChargeFormModal from '@/features/real-estate/components/modals/RealEstateChargeFormModal.vue';
import RealEstatePanelFrame from '@/features/real-estate/components/panels/RealEstatePanelFrame.vue';
import RealEstateRowMenu from '@/features/real-estate/components/panels/RealEstateRowMenu.vue';

const props = defineProps<{
    assetPublicId: string;
    currency: string;
}>();

const { t, locale } = useI18n();
const store = useRealEstateStore();
const panel = useRealEstatePanel<RealEstateCharge>({
    notFoundKey: 'realEstatePage.errors.chargeNotFound',
    remove: (charge) => store.deleteCharge(props.assetPublicId, charge.publicId),
    reload: () => store.loadCharges(props.assetPublicId, true)
});
const { createOpen, editOpen, editTarget, deleteOpen, errorText } = panel;

const items = computed(() => store.chargesFor(props.assetPublicId));
const units = computed(() => store.unitsFor(props.assetPublicId));
const loading = computed(() => store.loadingFor(props.assetPublicId, 'charges'));
const countLabel = computed(() =>
    items.value.length ? t('realEstatePage.charges.count', { count: items.value.length }, items.value.length) : null
);
const monthlyTotal = computed(() => sumCurrentMonthlyCharges(items.value));

const money = (amount: number, currency?: string) => formatRealEstateAmount(amount, currency || props.currency, locale.value);
const empty = t('common.emptyValue');

watch(
    () => props.assetPublicId,
    (id) => {
        if (id) void panel.load(() => store.loadCharges(id));
    },
    { immediate: true }
);
</script>

<template>
    <RealEstatePanelFrame
        :count-label="countLabel"
        :add-label="t('realEstatePage.charges.add')"
        :loading="loading"
        :empty="!items.length"
        :empty-text="t('realEstatePage.charges.empty')"
        :error="errorText"
        :disabled="store.acting"
        @add="panel.openCreate"
        @dismiss="panel.dismissError"
    >
        <table class="su-table">
            <thead>
                <tr>
                    <th scope="col">{{ t('realEstatePage.charges.columns.name') }}</th>
                    <th scope="col">{{ t('realEstatePage.charges.columns.type') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.charges.columns.amount') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.charges.columns.monthly') }}</th>
                    <th scope="col">{{ t('realEstatePage.charges.columns.period') }}</th>
                    <th scope="col">{{ t('realEstatePage.charges.columns.unit') }}</th>
                    <th scope="col">{{ t('realEstatePage.charges.columns.tier') }}</th>
                    <th scope="col">{{ t('realEstatePage.charges.columns.state') }}</th>
                    <th scope="col">
                        <span class="d-sr-only">{{ t('common.more') }}</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="charge in items" :key="charge.publicId" :class="{ 'is-muted': !charge.isCurrent }">
                    <td class="is-strong is-wrap">{{ charge.name }}</td>
                    <td>{{ t(`realEstatePage.chargeTypes.${charge.chargeType}`) }}</td>
                    <td class="is-num">
                        {{ money(charge.amount, charge.currency) }}
                        <span class="is-sub">{{ t(`realEstatePage.periodicities.${charge.periodicity}`) }}</span>
                    </td>
                    <td class="is-num">
                        {{ charge.periodicity === 'ponctuelle' ? empty : money(charge.monthlyEquivalent, charge.currency) }}
                    </td>
                    <td>{{ formatRealEstatePeriod(charge.startDate, charge.endDate, locale) || empty }}</td>
                    <td>{{ unitNameOf(units, charge.unitPublicId) ?? t('realEstatePage.form.wholeProperty') }}</td>
                    <td>{{ charge.tierName || empty }}</td>
                    <td :class="{ 'is-muted': !charge.isCurrent }">
                        {{ charge.isCurrent ? t('realEstatePage.charges.current') : t('realEstatePage.charges.notCurrent') }}
                    </td>
                    <td class="is-actions">
                        <RealEstateRowMenu :disabled="store.acting" @edit="panel.openEdit(charge)" @delete="panel.requestDelete(charge)" />
                    </td>
                </tr>
            </tbody>
        </table>

        <template v-if="items.length" #footer>
            <div class="su-kv su-kv--strong re-charges__total">
                <span>{{ t('realEstatePage.charges.monthlyTotal') }}</span>
                <span>{{ money(monthlyTotal) }}</span>
            </div>
        </template>
    </RealEstatePanelFrame>

    <RealEstateChargeFormModal v-model="createOpen" :asset-public-id="assetPublicId" />
    <RealEstateChargeFormModal v-model="editOpen" :asset-public-id="assetPublicId" :charge="editTarget" />

    <AppConfirmationModal
        v-model="deleteOpen"
        :title="t('realEstatePage.charges.deleteTitle')"
        :message="t('realEstatePage.charges.deleteBody')"
        :confirm-label="t('realEstatePage.actions.delete')"
        confirm-color="error"
        :loading="store.acting"
        @confirm="panel.confirmDelete"
    />
</template>

<style scoped>
.re-charges__total {
    border-top: 2px solid var(--ink);
    font-variant-numeric: tabular-nums;
}
</style>
