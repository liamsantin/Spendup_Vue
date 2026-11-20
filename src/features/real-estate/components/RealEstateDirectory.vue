<script setup lang="ts">
/**
 * Liste des biens immobiliers (actifs de type `immobilier`) : filtre `state=active|sold`, recherche `q`.
 * Un clic ouvre la fiche (`realEstateDetailPath`). `openCreate` ouvre `AssetFormModal` verrouillé sur `immobilier`.
 */
defineOptions({ name: 'RealEstateDirectory' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { HomeIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import AssetFormModal from '@/features/assets/components/modals/AssetFormModal.vue';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import type { Asset } from '@/features/assets/types';
import {
    formatRealEstateAddress,
    formatRealEstateAmount,
    formatShortNumber,
    matchesRealEstateSearch,
    realEstateDetailsOf
} from '@/features/real-estate/format';
import { realEstateDetailPath } from '@/features/real-estate/paths';
import { REAL_ESTATE_NAME_MAX } from '@/features/real-estate/types';

export type RealEstateStateFilter = 'active' | 'sold';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const assetsStore = useAssetsStore();

const createOpen = ref(false);
const localError = ref<string | null>(null);

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const stateFilter = computed<RealEstateStateFilter>(() => (queryString('state') === 'sold' ? 'sold' : 'active'));
const search = computed(() => queryString('q')?.slice(0, REAL_ESTATE_NAME_MAX) ?? null);

/** La liste active du store peut appartenir à une autre page : on ne garde que les biens du filtre courant. */
const items = computed(() => {
    const active = stateFilter.value === 'active';
    return assetsStore.items.filter((asset) => asset.type === 'immobilier' && asset.isActive === active);
});

const visibleItems = computed(() => {
    const needle = search.value;
    return needle ? items.value.filter((asset) => matchesRealEstateSearch(asset, needle)) : items.value;
});

const emptyCopy = computed(() => {
    if (search.value) return t('realEstatePage.empty.filtered');
    return stateFilter.value === 'sold' ? t('realEstatePage.empty.sold') : t('realEstatePage.empty.active');
});

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await assetsStore.loadList({ type: 'immobilier', active: stateFilter.value === 'active', force });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        assetsStore.clearError();
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    void loadDirectory(true);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory();
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(stateFilter, () => {
    void loadDirectory();
});

function address(asset: Asset): string {
    return formatRealEstateAddress(realEstateDetailsOf(asset)) || t('realEstatePage.card.noAddress');
}

function typeLabel(asset: Asset): string {
    const type = realEstateDetailsOf(asset)?.propertyType;
    return type ? t(`assetsPage.propertyTypes.${type}`) : t('assetsPage.types.immobilier');
}

function sizeLine(asset: Asset): string {
    const details = realEstateDetailsOf(asset);
    const parts: string[] = [];
    const living = formatShortNumber(details?.livingAreaM2, locale.value);
    if (living) parts.push(t('realEstatePage.detail.livingArea', { value: living }));
    const rooms = formatShortNumber(details?.rooms, locale.value);
    if (rooms) parts.push(t('realEstatePage.detail.rooms', { value: rooms }));
    return parts.join(' · ');
}

function openDetail(asset: Asset) {
    void router.push({ path: realEstateDetailPath(asset.publicId) });
}

function onCreated(asset: Asset) {
    if (asset?.publicId) openDetail(asset);
}

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });
</script>

<template>
    <div>
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <div v-if="assetsStore.loading && !items.length" class="su-loading" :aria-label="t('realEstatePage.loading')">
            <span class="su-spin" />
        </div>
        <div v-else-if="!visibleItems.length" class="su-empty">
            <p>{{ emptyCopy }}</p>
        </div>
        <ul v-else class="re-directory">
            <li v-for="asset in visibleItems" :key="asset.publicId" class="re-directory__item">
                <button type="button" class="re-card" :data-asset-id="asset.publicId" @click="openDetail(asset)">
                    <span class="su-tile su-tile--rose" aria-hidden="true"><HomeIcon :size="18" stroke-width="1.6" /></span>
                    <span class="re-card__meta">
                        <span class="re-card__name">{{ asset.name }}</span>
                        <span class="re-card__address">{{ address(asset) }}</span>
                        <span class="re-card__line">
                            <span class="su-chip su-chip--plain">{{ typeLabel(asset) }}</span>
                            <span v-if="sizeLine(asset)" class="re-card__size">{{ sizeLine(asset) }}</span>
                        </span>
                    </span>
                    <span class="re-card__value">{{ formatRealEstateAmount(asset.estimatedValue, asset.currency, locale) }}</span>
                </button>
            </li>
        </ul>

        <AssetFormModal v-model="createOpen" locked-type="immobilier" @saved="onCreated" />
    </div>
</template>

<style scoped>
/* deux biens par rangée (un sur mobile), séparés par des filets fins */
.re-directory {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 32px;
    margin: 0;
    padding: 8px 0 24px;
    border-top: 2px solid var(--ink);
}

.re-directory__item {
    min-width: 0;
    border-bottom: 1px solid var(--line);
}

.re-card {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: start;
    gap: 14px;
    width: 100%;
    min-height: 88px;
    padding: 18px 4px;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s var(--ease);
}

.re-card:hover,
.re-card:focus-visible {
    background: var(--soft);
}

.re-card__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.re-card__name {
    overflow: hidden;
    font-size: 15px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.re-card__address {
    overflow: hidden;
    color: var(--gray);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.re-card__line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    margin-top: 6px;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.re-card__value {
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

@media (max-width: 1199.98px) {
    .re-directory {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (max-width: 767px) {
    .re-directory {
        padding: 0 0 16px;
    }

    .re-card {
        grid-template-columns: 36px minmax(0, 1fr);
    }

    .re-card__value {
        grid-column: 2;
    }
}
</style>
