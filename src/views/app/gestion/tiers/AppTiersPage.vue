<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon } from 'vue-tabler-icons';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { TIER_NATURES, TIER_ROLES, TiersDirectory, isTierNature, isTierRole, useTiersStore } from '@/features/tiers';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTiersStore();
const directoryRef = ref<{ openCreate: () => void } | null>(null);

const natureItems = computed(() => [
    { title: t('tiersPage.filters.allNatures'), value: '' },
    ...TIER_NATURES.map((value) => ({ title: t(`tiersPage.natures.${value}`), value }))
]);

const roleItems = computed(() => [
    { title: t('tiersPage.filters.allRoles'), value: '' },
    ...TIER_ROLES.map((value) => ({ title: t(`tiersPage.roles.${value}`), value }))
]);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const filterNature = computed({
    get: () => (isTierNature(queryString('nature')) ? queryString('nature') : ''),
    set: (value: string) => patchQuery({ nature: value || undefined })
});

const filterRole = computed({
    get: () => (isTierRole(queryString('role')) ? queryString('role') : ''),
    set: (value: string) => patchQuery({ role: value || undefined })
});

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = queryString('q') || undefined;
    const nature = 'nature' in patch ? patch.nature : queryString('nature') || undefined;
    const role = 'role' in patch ? patch.role : queryString('role') || undefined;
    if (q) next.q = q;
    if (nature && isTierNature(nature)) next.nature = nature;
    if (role && isTierRole(role)) next.role = role;
    void router.replace({ path: '/app/gestion/tiers', query: next });
}

function onCreate() {
    if (store.acting) return;
    directoryRef.value?.openCreate();
}
</script>

<template>
    <AppPageShell :title="t('tiersPage.title')" :subtitle="t('tiersPage.subtitle')">
        <template #actions>
            <AppDropdownFilter :label="t('tiersPage.actions.filter')" :min-width="280">
                <div class="pa-3 d-flex flex-column ga-3">
                    <AppSelect v-model="filterNature" :items="natureItems" :label="t('tiersPage.filters.nature')" hide-details />
                    <AppSelect v-model="filterRole" :items="roleItems" :label="t('tiersPage.filters.role')" hide-details />
                </div>
            </AppDropdownFilter>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreate">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('tiersPage.actions.create') }}
            </button>
        </template>

        <TiersDirectory ref="directoryRef" />
    </AppPageShell>
</template>
