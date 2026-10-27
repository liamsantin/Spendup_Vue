<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { FileExportIcon, PlusIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import AppBoardSearch from '@/components/shared/board/AppBoardSearch.vue';
import { useBoardSearch } from '@/components/shared/board/useBoardSearch';
import AppChoiceList from '@/components/shared/dropdown-filter/AppChoiceList.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import {
    TIER_NATURES,
    TIER_ROLES,
    TIER_SEARCH_MAX,
    TIER_SORT_DEFAULT,
    TiersDirectory,
    isTierNature,
    isTierRole,
    isTierSort,
    matchesTierSearch,
    parseTierSort,
    useTiersStore
} from '@/features/tiers';
import type { TierNature } from '@/features/tiers/types';
import TierCreateMenu from '@/features/tiers/components/TierCreateMenu.vue';
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTiersStore();
const { width: viewportWidth } = useDisplay();
const compactNotch = computed(() => viewportWidth.value < 768);
const directoryRef = ref<{ openCreate: (nature?: TierNature | null) => void; exportCsv: () => void } | null>(null);

const roleItems = computed(() => [
    { title: t('tiersPage.filters.allRoles'), value: '' },
    ...TIER_ROLES.map((value) => ({ title: t(`tiersPage.roles.${value}`), value }))
]);

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

const filterNature = computed({
    get: (): TierNature | '' => {
        const nature = queryString('nature');
        return isTierNature(nature) ? nature : '';
    },
    set: (value: string) => patchQuery({ nature: value || undefined })
});

const filterRole = computed({
    get: () => (isTierRole(queryString('role')) ? queryString('role') : ''),
    set: (value: string) => patchQuery({ role: value || undefined })
});

const listSort = computed({
    get: () => parseTierSort(queryString('sort')),
    set: (value: string) => patchQuery({ sort: value === TIER_SORT_DEFAULT ? undefined : value })
});

const visibleCount = computed(() => {
    const needle = queryString('q').trim();
    if (!needle) return store.totalCount;
    return store.items.filter((tier) => matchesTierSearch(tier, needle)).length;
});

const filterCount = computed(() => (filterRole.value ? 1 : 0));

/** « Rôle · Tous » / « Rôle · Banque » : le filtre discret porte sa valeur. */
const roleFilterLabel = computed(() => {
    const value = filterRole.value ? t(`tiersPage.roles.${filterRole.value}`) : t('tiersPage.tabs.all');
    return `${t('tiersPage.filters.role')} · ${value}`;
});

/* ── chiffres clés : tiers connus (toutes listes chargées), comptés par nature ── */
const knownTiers = computed(() => store.allKnownItems());

const natureCounts = computed(() => {
    const counts: Record<TierNature, number> = { person: 0, company: 0, organization: 0, administration: 0, unknown: 0 };
    for (const tier of knownTiers.value) counts[tier.nature] += 1;
    return counts;
});

/** Total : compteur serveur de la liste « Tous » quand elle n’est pas entièrement chargée, sinon les tiers connus. */
const tiersTotal = computed(() => {
    const known = knownTiers.value.length;
    if (!filterNature.value && !filterRole.value && !queryString('q') && store.totalCount > known) return store.totalCount;
    return known;
});

const figures = computed(() => [
    { key: 'all', label: t('tiersPage.naturesPlural.all'), value: tiersTotal.value },
    ...TIER_NATURES.filter((nature) => natureCounts.value[nature] > 0).map((nature) => ({
        key: nature,
        label: t(`tiersPage.naturesPlural.${nature}`),
        value: natureCounts.value[nature]
    }))
]);

const showFigures = computed(() => store.initialized && tiersTotal.value > 0);

function selectNature(value: TierNature | '') {
    filterNature.value = value;
}

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const q = 'q' in patch ? patch.q : queryString('q') || undefined;
    const nature = 'nature' in patch ? patch.nature : queryString('nature') || undefined;
    const role = 'role' in patch ? patch.role : queryString('role') || undefined;
    const sort = 'sort' in patch ? patch.sort : queryString('sort') || undefined;
    if (q) next.q = q.slice(0, TIER_SEARCH_MAX);
    if (nature && isTierNature(nature)) next.nature = nature;
    if (role && isTierRole(role)) next.role = role;
    if (sort && isTierSort(sort) && sort !== TIER_SORT_DEFAULT) next.sort = sort;
    void router.replace({ path: '/app/gestion/tiers', query: next });
}

const search = useBoardSearch({
    read: () => queryString('q'),
    commit: (value) => patchQuery({ q: value }),
    max: TIER_SEARCH_MAX
});

function onCreate(nature?: TierNature) {
    if (store.acting) return;
    const resolved = nature ?? (isTierNature(filterNature.value) ? filterNature.value : null);
    directoryRef.value?.openCreate(resolved);
}
</script>

<template>
    <AppPageShell class="tiers-page" :title="t('tiersPage.title')" :subtitle="t('tiersPage.subtitle')" :body-scroll="false">
        <!-- onglets par nature en haut à droite du titre -->
        <template #tabs>
            <nav class="su-tabs" :aria-label="t('tiersPage.tabs.label')">
                <button
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': !filterNature }"
                    :aria-pressed="!filterNature"
                    @click="selectNature('')"
                >
                    <span class="su-tab__label" :data-label="t('tiersPage.tabs.all')">{{ t('tiersPage.tabs.all') }}</span>
                </button>
                <button
                    v-for="nature in TIER_NATURES"
                    :key="nature"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': filterNature === nature }"
                    :aria-pressed="filterNature === nature"
                    @click="selectNature(nature)"
                >
                    <span class="su-tab__label" :data-label="t(`tiersPage.naturesPlural.${nature}`)">{{
                        t(`tiersPage.naturesPlural.${nature}`)
                    }}</span>
                </button>
            </nav>
        </template>

        <!-- chiffres clés : court filet 2 px, libellé 13 px, nombre 30 px 700 -->
        <div v-if="showFigures" class="tiers-figs" role="list">
            <div v-for="figure in figures" :key="figure.key" class="su-fig tiers-figs__item" role="listitem">
                <p class="su-fig__label">{{ figure.label }}</p>
                <p class="su-fig__num">{{ figure.value }}</p>
            </div>
        </div>

        <AppBoard>
            <template #bar>
                <AppBoardSearch
                    :model-value="search.input.value"
                    :maxlength="TIER_SEARCH_MAX"
                    :placeholder="t('tiersPage.searchPlaceholder')"
                    :search-label="t('tiersPage.actions.search')"
                    :clear-label="t('tiersPage.actions.clearSearch')"
                    @update:model-value="search.onInput"
                    @clear="search.clear"
                />
                <span v-if="store.initialized && visibleCount" class="su-toolbar__count app-board__count">
                    {{ t('tiersPage.count', { count: visibleCount }, visibleCount) }}
                </span>
                <div class="tiers-role-filter">
                    <AppDropdownFilter
                        :label="roleFilterLabel"
                        :min-width="260"
                        :count="filterCount"
                        :reset-disabled="!filterRole"
                        close-on-content-click
                        @reset="filterRole = ''"
                    >
                        <AppChoiceList v-model="filterRole" :items="roleItems" :label="t('tiersPage.filters.role')" />
                    </AppDropdownFilter>
                </div>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="!store.items.length"
                    :aria-label="t('tiersPage.actions.export')"
                    @click="directoryRef?.exportCsv()"
                >
                    <FileExportIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('tiersPage.actions.export') }}</span>
                </button>
                <TierCreateMenu
                    v-if="!filterNature"
                    :compact="compactNotch"
                    :label="t('tiersPage.actions.create')"
                    :disabled="store.acting"
                    @select="onCreate"
                />
                <button
                    v-else
                    type="button"
                    class="su-btn su-btn--ink app-board__primary tiers-page__create"
                    :class="{ 'tiers-page__create--compact': compactNotch }"
                    :disabled="store.acting"
                    :aria-label="t('tiersPage.actions.create')"
                    @click="onCreate()"
                >
                    <PlusIcon :size="16" stroke-width="1.8" />
                    <span v-if="!compactNotch">{{ t('tiersPage.actions.create') }}</span>
                </button>
            </template>

            <TiersDirectory ref="directoryRef" @sort="listSort = $event" />
        </AppBoard>
    </AppPageShell>
</template>

<style scoped>
/* ── compteurs : une carte légère, cases séparées par des filets fins ── */
.tiers-figs {
    flex: none;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    margin: 0 0 32px;
    border: 1px solid var(--line);
}

.tiers-figs__item {
    border-top: 0;
    padding: 16px 20px;
    min-width: 0;
    box-shadow: -1px 0 0 var(--line);
}

.tiers-figs__item .su-fig__num {
    font-size: 24px;
}

/* filtre « Rôle · Tous » : bouton discret (bordure fine grise, texte gris) */
.tiers-role-filter {
    margin-left: auto;
}

.tiers-role-filter :deep(.su-btn) {
    border-color: var(--line);
    color: var(--gray);
    font-weight: 400;
}

.tiers-role-filter :deep(.su-btn:hover:not(:disabled)),
.tiers-role-filter :deep(.su-btn[aria-expanded='true']) {
    border-color: var(--ink);
    color: var(--ink);
}

.tiers-role-filter :deep(.su-btn > svg) {
    display: none;
}

.tiers-page__create--compact {
    width: 40px;
    padding: 0;
}

@media (max-width: 767px) {
    /* une seule rangée qui défile horizontalement : la liste reste visible sans défiler */
    .tiers-figs {
        grid-template-columns: none;
        grid-auto-flow: column;
        grid-auto-columns: minmax(96px, max-content);
        overflow-x: auto;
        scrollbar-width: none;
        margin-bottom: 20px;
    }

    .tiers-figs::-webkit-scrollbar {
        display: none;
    }

    .tiers-figs__item {
        padding: 10px 14px;
    }

    .tiers-figs__item .su-fig__num {
        font-size: 18px;
    }

    .tiers-role-filter {
        margin-left: 0;
    }
}
</style>
