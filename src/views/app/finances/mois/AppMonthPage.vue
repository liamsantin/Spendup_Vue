<script setup lang="ts">
/** Page « Mon mois » : reste à dépenser d’un mois en détail. Le mois vit dans l’adresse (`?m=YYYY-MM`). */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import MonthOverviewContent from '@/features/dashboard/components/MonthOverviewContent.vue';
import { monthPageLocation, parseMonthQuery } from '@/features/dashboard/month-page';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';
import TaxProvisionNote from '@/features/tax/components/TaxProvisionNote.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const categories = useCategoriesStore();
const settings = useUserSettingsStore();

const month = computed(() => parseMonthQuery(route.query.m));
const hideAmounts = computed(() => settings.current.hideSensitiveAmounts);

function setMonth(next: string) {
    const { query } = monthPageLocation(next);
    const rest = { ...route.query };
    delete rest.m;
    void router.push({ path: route.path, query: { ...rest, ...query } });
}

function findCategory(publicId: string) {
    return categories.findByPublicId(publicId);
}

onMounted(() => {
    void categories.bootstrap().catch(() => undefined);
});
</script>

<template>
    <AppPageShell :title="t('monthPage.title')" :subtitle="t('monthPage.subtitle')">
        <MonthOverviewContent :month="month" :hide-amounts="hideAmounts" :find-category="findCategory" @update:month="setMonth" />
        <TaxProvisionNote />
    </AppPageShell>
</template>
