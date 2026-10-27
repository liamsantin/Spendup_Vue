<script setup lang="ts">
/** Onglet « Baux » : filtre par statut effectif, tri serveur (actifs, à venir, suspendus, terminés). */
defineOptions({ name: 'RealEstateRentalsPanel' });

import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { useRealEstatePanel } from '@/features/real-estate/composables/useRealEstatePanel';
import { formatRealEstateAmount, formatRealEstatePeriod, isRentalStatus, unitNameOf } from '@/features/real-estate/format';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';
import { RENTAL_STATUSES, type RealEstateRental, type RentalStatus } from '@/features/real-estate/types';
import RealEstateRentalFormModal from '@/features/real-estate/components/modals/RealEstateRentalFormModal.vue';
import RealEstatePanelFrame from '@/features/real-estate/components/panels/RealEstatePanelFrame.vue';
import RealEstateRowMenu from '@/features/real-estate/components/panels/RealEstateRowMenu.vue';

const props = defineProps<{
    assetPublicId: string;
    currency: string;
}>();

const { t, locale } = useI18n();
const store = useRealEstateStore();
const panel = useRealEstatePanel<RealEstateRental>({
    notFoundKey: 'realEstatePage.errors.rentalNotFound',
    remove: (rental) => store.deleteRental(props.assetPublicId, rental.publicId),
    reload: () => store.loadRentals(props.assetPublicId, { status: store.rentalsStatusFor(props.assetPublicId), force: true })
});
const { createOpen, editOpen, editTarget, deleteOpen, errorText } = panel;

const items = computed(() => store.rentalsFor(props.assetPublicId));
const units = computed(() => store.unitsFor(props.assetPublicId));
const loading = computed(() => store.loadingFor(props.assetPublicId, 'rentals'));
const countLabel = computed(() =>
    items.value.length ? t('realEstatePage.rentals.count', { count: items.value.length }, items.value.length) : null
);
const empty = t('common.emptyValue');

const statusFilter = computed({
    get: (): RentalStatus | '' => store.rentalsStatusFor(props.assetPublicId) ?? '',
    set: (value: string) => {
        const status = isRentalStatus(value) ? value : null;
        void panel.load(() => store.loadRentals(props.assetPublicId, { status }));
    }
});

const statusItems = computed(() => [
    { title: t('realEstatePage.rentals.allStatuses'), value: '' },
    ...RENTAL_STATUSES.map((value) => ({ title: t(`realEstatePage.rentalStatuses.${value}`), value }))
]);

const emptyText = computed(() => (statusFilter.value ? t('realEstatePage.rentals.emptyFiltered') : t('realEstatePage.rentals.empty')));

const money = (amount: number | null, currency?: string) =>
    amount == null ? empty : formatRealEstateAmount(amount, currency || props.currency, locale.value);

/** Statut : actif en bleu, à venir gris, suspendu violet (alerte), terminé gris. */
function statusTone(status: RentalStatus): string {
    if (status === 'active') return 'su-pos';
    if (status === 'suspendue') return 'su-over';
    return 'is-muted';
}

watch(
    () => props.assetPublicId,
    (id) => {
        if (id) void panel.load(() => store.loadRentals(id, { status: store.rentalsStatusFor(id) }));
    },
    { immediate: true }
);
</script>

<template>
    <RealEstatePanelFrame
        :count-label="countLabel"
        :add-label="t('realEstatePage.rentals.add')"
        :loading="loading"
        :empty="!items.length"
        :empty-text="emptyText"
        :error="errorText"
        :disabled="store.acting"
        @add="panel.openCreate"
        @dismiss="panel.dismissError"
    >
        <template #filters>
            <div class="re-rentals__filter">
                <AppSelect v-model="statusFilter" :items="statusItems" :label="t('realEstatePage.rentals.statusFilter')" hide-details />
            </div>
        </template>

        <table class="su-table">
            <thead>
                <tr>
                    <th scope="col">{{ t('realEstatePage.rentals.columns.tenant') }}</th>
                    <th scope="col">{{ t('realEstatePage.rentals.columns.unit') }}</th>
                    <th scope="col">{{ t('realEstatePage.rentals.columns.period') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.rentals.columns.rent') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.rentals.columns.charges') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.rentals.columns.deposit') }}</th>
                    <th scope="col">{{ t('realEstatePage.rentals.columns.status') }}</th>
                    <th scope="col">
                        <span class="d-sr-only">{{ t('common.more') }}</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="rental in items" :key="rental.publicId">
                    <td class="is-strong is-wrap">
                        {{ rental.tenantName || empty }}
                        <span v-if="rental.recurringIncomePublicId" class="is-sub">{{ t('realEstatePage.rentals.incomeLinked') }}</span>
                    </td>
                    <td>{{ unitNameOf(units, rental.unitPublicId) ?? t('realEstatePage.form.wholeProperty') }}</td>
                    <td>{{ formatRealEstatePeriod(rental.startDate, rental.endDate, locale) || empty }}</td>
                    <td class="is-num is-strong">{{ money(rental.monthlyRent, rental.currency) }}</td>
                    <td class="is-num">{{ money(rental.monthlyCharges, rental.currency) }}</td>
                    <td class="is-num">{{ money(rental.deposit, rental.currency) }}</td>
                    <td :class="statusTone(rental.status)">{{ t(`realEstatePage.rentalStatuses.${rental.status}`) }}</td>
                    <td class="is-actions">
                        <RealEstateRowMenu :disabled="store.acting" @edit="panel.openEdit(rental)" @delete="panel.requestDelete(rental)" />
                    </td>
                </tr>
            </tbody>
        </table>
    </RealEstatePanelFrame>

    <RealEstateRentalFormModal v-model="createOpen" :asset-public-id="assetPublicId" />
    <RealEstateRentalFormModal v-model="editOpen" :asset-public-id="assetPublicId" :rental="editTarget" />

    <AppConfirmationModal
        v-model="deleteOpen"
        :title="t('realEstatePage.rentals.deleteTitle')"
        :message="t('realEstatePage.rentals.deleteBody')"
        :confirm-label="t('realEstatePage.actions.delete')"
        confirm-color="error"
        :loading="store.acting"
        @confirm="panel.confirmDelete"
    />
</template>

<style scoped>
.re-rentals__filter {
    width: 220px;
    max-width: 100%;
}
</style>
