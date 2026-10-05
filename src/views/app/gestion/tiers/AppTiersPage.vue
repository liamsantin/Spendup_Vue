<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { PlusIcon, ChevronDownIcon, CheckIcon, LayoutGridIcon, FileExportIcon } from 'vue-tabler-icons';
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
import { TIER_NATURE_ICONS } from '@/features/tiers/natureUi';
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

const natureMenuOpen = ref(false);

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

const natureTabLabel = computed(() => (filterNature.value ? t(`tiersPage.natures.${filterNature.value}`) : t('tiersPage.tabs.all')));

const natureTabIcon = computed(() => (filterNature.value ? TIER_NATURE_ICONS[filterNature.value] : LayoutGridIcon));

function selectNature(value: TierNature | '') {
    filterNature.value = value;
    natureMenuOpen.value = false;
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
    <AppPageShell class="tiers-page" :title="t('tiersPage.title')" :body-scroll="false">
        <AppBoard>
            <template #filters>
                <v-menu v-model="natureMenuOpen" location="bottom start" :offset="8" scrim>
                    <template #activator="{ props: menuProps }">
                        <nav class="tiers-nature-tabs" :aria-label="t('tiersPage.tabs.label')">
                            <button
                                type="button"
                                class="tiers-nature-trigger"
                                v-bind="menuProps"
                                :aria-expanded="natureMenuOpen"
                                :aria-haspopup="true"
                            >
                                <span
                                    class="su-tab is-active tiers-nature-trigger__pill"
                                    :class="filterNature ? `is-${filterNature}` : 'is-all'"
                                >
                                    <span class="su-tab__body">
                                        <component :is="natureTabIcon" :size="16" stroke-width="1.7" />
                                        {{ natureTabLabel }}
                                    </span>
                                </span>
                                <ChevronDownIcon
                                    class="tiers-nature-menu__chevron"
                                    :class="{ 'is-open': natureMenuOpen }"
                                    :size="16"
                                    stroke-width="1.8"
                                />
                            </button>
                        </nav>
                    </template>
                    <v-sheet elevation="0" class="su-menu tiers-nature-menu">
                        <p class="tiers-nature-menu__label">{{ t('tiersPage.tabs.label') }}</p>
                        <button
                            type="button"
                            class="tiers-nature-menu__item is-all"
                            :class="{ 'is-active': !filterNature }"
                            @click="selectNature('')"
                        >
                            <span class="tiers-nature-menu__icon">
                                <LayoutGridIcon :size="18" stroke-width="1.75" />
                            </span>
                            <span class="tiers-nature-menu__name">{{ t('tiersPage.tabs.all') }}</span>
                            <CheckIcon v-if="!filterNature" class="tiers-nature-menu__check" :size="16" stroke-width="2" />
                        </button>
                        <button
                            v-for="nature in TIER_NATURES"
                            :key="nature"
                            type="button"
                            class="tiers-nature-menu__item"
                            :class="[`is-${nature}`, { 'is-active': filterNature === nature }]"
                            @click="selectNature(nature)"
                        >
                            <span class="tiers-nature-menu__icon">
                                <component :is="TIER_NATURE_ICONS[nature]" :size="18" stroke-width="1.75" />
                            </span>
                            <span class="tiers-nature-menu__name">{{ t(`tiersPage.natures.${nature}`) }}</span>
                            <CheckIcon v-if="filterNature === nature" class="tiers-nature-menu__check" :size="16" stroke-width="2" />
                        </button>
                    </v-sheet>
                </v-menu>
                <AppDropdownFilter
                    :label="t('tiersPage.filters.role')"
                    :min-width="260"
                    :count="filterCount"
                    :reset-disabled="!filterRole"
                    close-on-content-click
                    @reset="filterRole = ''"
                >
                    <AppChoiceList v-model="filterRole" :items="roleItems" :label="t('tiersPage.filters.role')" />
                </AppDropdownFilter>
            </template>
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
                    class="su-btn su-btn--ink app-board__primary"
                    :disabled="store.acting"
                    :aria-label="t('tiersPage.actions.create')"
                    @click="onCreate()"
                >
                    <PlusIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('tiersPage.actions.create') }}</span>
                </button>
            </template>

            <TiersDirectory ref="directoryRef" @sort="listSort = $event" />
        </AppBoard>
    </AppPageShell>
</template>

<style scoped>
.tiers-nature-trigger {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    margin: 0;
    padding: 0 14px;
    border: 0;
    border-radius: 17px;
    background: #fff;
    color: inherit;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    box-shadow:
        0 1px 2px rgba(16, 16, 20, 0.06),
        0 0 0 1px rgba(16, 16, 20, 0.05);
}

.tiers-nature-tabs {
    display: flex;
}

.tiers-nature-trigger__pill {
    pointer-events: none;
    height: auto !important;
    padding: 0 !important;
    color: var(--ink) !important;
    background: transparent !important;
    box-shadow: none !important;
}

.tiers-nature-trigger__pill .su-tab__body {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.tiers-nature-menu__chevron {
    flex: none;
    color: var(--ink-mute);
    transition: transform 0.28s var(--ease, ease);
}

.tiers-nature-menu__chevron.is-open {
    transform: rotate(180deg);
}

@media (max-width: 767px) {
    .tiers-nature-trigger {
        padding: 0 10px;
    }
}
</style>

<!-- Menus téléportés hors du scoped. -->
<style>
.tiers-nature-menu.su-menu {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: min(280px, calc(100vw - 24px));
    padding: 10px 8px 8px !important;
}

.tiers-nature-menu__label {
    margin: 2px 10px 8px;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.tiers-nature-menu__item {
    --nature-tint: rgb(var(--v-theme-primary));
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 8px 10px;
    border: 0;
    border-radius: 16px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s var(--ease, ease);
}

.tiers-nature-menu__item.is-person {
    --nature-tint: rgb(var(--v-theme-success));
}

.tiers-nature-menu__item.is-organization {
    --nature-tint: rgb(var(--v-theme-secondary));
}

.tiers-nature-menu__item.is-administration {
    --nature-tint: rgb(var(--v-theme-warning));
}

.tiers-nature-menu__item.is-unknown {
    --nature-tint: var(--ink-muted);
}

.tiers-nature-menu__item:hover,
.tiers-nature-menu__item:focus-visible {
    background: color-mix(in srgb, var(--nature-tint) 10%, transparent);
    outline: none;
}

.tiers-nature-menu__item.is-active {
    background: color-mix(in srgb, var(--nature-tint) 14%, transparent);
}

.tiers-nature-menu__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: color-mix(in srgb, var(--nature-tint) 16%, var(--surface-raised));
    color: var(--nature-tint);
}

.tiers-nature-menu__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.9rem;
    font-weight: 620;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.tiers-nature-menu__check {
    flex: none;
    color: var(--nature-tint);
}
</style>
