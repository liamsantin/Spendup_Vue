<script setup lang="ts">
/** Onglet « Lots » de la fiche d’un bien. */
defineOptions({ name: 'RealEstateUnitsPanel' });

import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { useRealEstatePanel } from '@/features/real-estate/composables/useRealEstatePanel';
import { formatShortNumber } from '@/features/real-estate/format';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';
import type { RealEstateUnit } from '@/features/real-estate/types';
import RealEstateUnitFormModal from '@/features/real-estate/components/modals/RealEstateUnitFormModal.vue';
import RealEstatePanelFrame from '@/features/real-estate/components/panels/RealEstatePanelFrame.vue';
import RealEstateRowMenu from '@/features/real-estate/components/panels/RealEstateRowMenu.vue';

const props = defineProps<{
    assetPublicId: string;
}>();

const { t, locale } = useI18n();
const store = useRealEstateStore();
const panel = useRealEstatePanel<RealEstateUnit>({
    notFoundKey: 'realEstatePage.errors.unitNotFound',
    remove: (unit) => store.deleteUnit(props.assetPublicId, unit.publicId),
    reload: () => store.loadUnits(props.assetPublicId, true)
});
const { createOpen, editOpen, editTarget, deleteOpen, errorText } = panel;

const items = computed(() => store.unitsFor(props.assetPublicId));
const loading = computed(() => store.loadingFor(props.assetPublicId, 'units'));
const countLabel = computed(() =>
    items.value.length ? t('realEstatePage.units.count', { count: items.value.length }, items.value.length) : null
);

function occupancy(unit: RealEstateUnit): { text: string; tone: string } {
    if (!unit.isRentable) return { text: t('realEstatePage.units.notRentable'), tone: 'is-muted' };
    if (unit.isOccupied) return { text: t('realEstatePage.units.occupied'), tone: '' };
    return { text: t('realEstatePage.units.vacant'), tone: 'su-over' };
}

function surface(unit: RealEstateUnit): string {
    const value = formatShortNumber(unit.surfaceM2, locale.value);
    return value ? `${value} m²` : t('common.emptyValue');
}

function num(value: number | null): string {
    return formatShortNumber(value, locale.value) || t('common.emptyValue');
}

watch(
    () => props.assetPublicId,
    (id) => {
        if (id) void panel.load(() => store.loadUnits(id));
    },
    { immediate: true }
);
</script>

<template>
    <RealEstatePanelFrame
        :count-label="countLabel"
        :add-label="t('realEstatePage.units.add')"
        :loading="loading"
        :empty="!items.length"
        :empty-text="t('realEstatePage.units.empty')"
        :error="errorText"
        :disabled="store.acting"
        @add="panel.openCreate"
        @dismiss="panel.dismissError"
    >
        <table class="su-table">
            <thead>
                <tr>
                    <th scope="col">{{ t('realEstatePage.units.columns.name') }}</th>
                    <th scope="col">{{ t('realEstatePage.units.columns.type') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.units.columns.surface') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.units.columns.rooms') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.units.columns.floor') }}</th>
                    <th scope="col">{{ t('realEstatePage.units.columns.occupancy') }}</th>
                    <th scope="col">
                        <span class="d-sr-only">{{ t('common.more') }}</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="unit in items" :key="unit.publicId">
                    <td class="is-strong is-wrap">
                        {{ unit.name }}
                        <span v-if="unit.notes" class="is-sub">{{ unit.notes }}</span>
                    </td>
                    <td>{{ t(`realEstatePage.unitTypes.${unit.unitType}`) }}</td>
                    <td class="is-num">{{ surface(unit) }}</td>
                    <td class="is-num">{{ num(unit.rooms) }}</td>
                    <td class="is-num">{{ num(unit.floor) }}</td>
                    <td :class="occupancy(unit).tone">{{ occupancy(unit).text }}</td>
                    <td class="is-actions">
                        <RealEstateRowMenu :disabled="store.acting" @edit="panel.openEdit(unit)" @delete="panel.requestDelete(unit)" />
                    </td>
                </tr>
            </tbody>
        </table>
    </RealEstatePanelFrame>

    <RealEstateUnitFormModal v-model="createOpen" :asset-public-id="assetPublicId" />
    <RealEstateUnitFormModal v-model="editOpen" :asset-public-id="assetPublicId" :unit="editTarget" />

    <AppConfirmationModal
        v-model="deleteOpen"
        :title="t('realEstatePage.units.deleteTitle')"
        :message="t('realEstatePage.units.deleteBody')"
        :confirm-label="t('realEstatePage.actions.delete')"
        confirm-color="error"
        :loading="store.acting"
        @confirm="panel.confirmDelete"
    />
</template>
