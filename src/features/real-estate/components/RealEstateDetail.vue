<script setup lang="ts">
/**
 * Fiche d’un bien immobilier : caractéristiques, synthèse (`realEstate.summary`) en chiffres clés,
 * onglets Lots · Charges · Travaux · Documents · Baux (query `tab`) avec compteurs.
 */
defineOptions({ name: 'RealEstateDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import AssetFormModal from '@/features/assets/components/modals/AssetFormModal.vue';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import type { Asset } from '@/features/assets/types';
import {
    formatCalendarDate,
    formatRealEstateAmount,
    formatShortNumber,
    formatSignedRealEstateAmount,
    realEstateDetailsOf
} from '@/features/real-estate/format';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';
import RealEstateChargesPanel from '@/features/real-estate/components/panels/RealEstateChargesPanel.vue';
import RealEstateDocumentsPanel from '@/features/real-estate/components/panels/RealEstateDocumentsPanel.vue';
import RealEstateMaintenancePanel from '@/features/real-estate/components/panels/RealEstateMaintenancePanel.vue';
import RealEstateRentalsPanel from '@/features/real-estate/components/panels/RealEstateRentalsPanel.vue';
import RealEstateUnitsPanel from '@/features/real-estate/components/panels/RealEstateUnitsPanel.vue';

/** Onglets de la fiche ; la valeur est aussi celle de la query `tab`. */
export type RealEstateDetailTab = 'lots' | 'charges' | 'travaux' | 'documents' | 'baux';

const TABS: RealEstateDetailTab[] = ['lots', 'charges', 'travaux', 'documents', 'baux'];

const props = defineProps<{
    assetPublicId: string;
}>();

const emit = defineEmits<{
    'not-found': [];
    loaded: [asset: Asset];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const assetsStore = useAssetsStore();
const store = useRealEstateStore();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);

const asset = computed(() => assetsStore.findByPublicId(props.assetPublicId));
const details = computed(() => realEstateDetailsOf(asset.value));
const summary = computed(() => asset.value?.realEstate?.summary ?? null);
const currency = computed(() => asset.value?.currency ?? '');
const empty = computed(() => t('common.emptyValue'));

const activeTab = computed<RealEstateDetailTab>(() => {
    const raw = route.query.tab;
    return typeof raw === 'string' && TABS.includes(raw as RealEstateDetailTab) ? (raw as RealEstateDetailTab) : 'lots';
});

function selectTab(tab: RealEstateDetailTab) {
    if (tab === activeTab.value) return;
    const query = { ...route.query };
    if (tab === 'lots') delete query.tab;
    else query.tab = tab;
    void router.replace({ path: route.path, query });
}

const tabs = computed(() => {
    const s = summary.value;
    return [
        { value: 'lots' as const, label: t('realEstatePage.detail.tabs.units'), count: s?.unitsCount },
        { value: 'charges' as const, label: t('realEstatePage.detail.tabs.charges'), count: s?.chargesCount },
        { value: 'travaux' as const, label: t('realEstatePage.detail.tabs.maintenance'), count: s?.maintenanceCount },
        { value: 'documents' as const, label: t('realEstatePage.detail.tabs.documents'), count: s?.documentsCount },
        { value: 'baux' as const, label: t('realEstatePage.detail.tabs.rentals'), count: s?.rentalsCount }
    ];
});

const money = (amount: number) => formatRealEstateAmount(amount, currency.value, locale.value);

/** Chiffres clés du bien (synthèse serveur). */
const figures = computed(() => {
    const a = asset.value;
    const s = summary.value;
    if (!a) return [];
    const list: { id: string; label: string; value: string; tone?: string; note?: string | null }[] = [
        { id: 'value', label: t('realEstatePage.detail.figs.value'), value: money(a.estimatedValue), note: valueNote.value }
    ];
    if (!s) return list;
    list.push({
        id: 'mortgage',
        label: t('realEstatePage.detail.figs.mortgage'),
        value: s.mortgageRemaining > 0 ? formatSignedRealEstateAmount(-s.mortgageRemaining, a.currency, locale.value) : money(0),
        tone: s.mortgageRemaining > 0 ? 'su-neg' : undefined,
        note: s.mortgageExcludedCount
            ? t('realEstatePage.detail.figs.mortgageExcluded', { count: s.mortgageExcludedCount }, s.mortgageExcludedCount)
            : s.mortgageRemaining > 0
              ? null
              : t('realEstatePage.detail.figs.noMortgage')
    });
    list.push({
        id: 'equity',
        label: t('realEstatePage.detail.figs.equity'),
        value: s.equity < 0 ? formatSignedRealEstateAmount(s.equity, a.currency, locale.value) : money(s.equity),
        tone: s.equity < 0 ? 'su-neg' : undefined
    });
    if (s.isRented) {
        list.push({
            id: 'rent',
            label: t('realEstatePage.detail.figs.rent'),
            value: formatSignedRealEstateAmount(s.monthlyRent, a.currency, locale.value),
            tone: s.monthlyRent > 0 ? 'su-pos' : undefined,
            note: s.monthlyRentalCharges
                ? t('realEstatePage.detail.figs.rentCharges', { amount: money(s.monthlyRentalCharges) })
                : t('realEstatePage.detail.figs.activeRentals', { count: s.activeRentalsCount }, s.activeRentalsCount)
        });
    }
    list.push({
        id: 'charges',
        label: t('realEstatePage.detail.figs.charges'),
        value: money(s.monthlyCharges),
        note: t('realEstatePage.detail.figs.perMonth')
    });
    list.push({
        id: 'maintenance',
        label: t('realEstatePage.detail.figs.maintenance'),
        value: money(s.maintenanceTotal),
        note: t('realEstatePage.detail.figs.maintenanceCount', { count: s.maintenanceCount }, s.maintenanceCount)
    });
    return list;
});

const valueNote = computed(() => {
    const date = asset.value?.lastValuationDate;
    return date ? t('realEstatePage.detail.figs.valuedOn', { date: formatCalendarDate(date, locale.value) }) : null;
});

/** Ligne de caractéristiques : type · surface · pièces · construction · achat. */
const characteristics = computed(() => {
    const d = details.value;
    const a = asset.value;
    if (!d || !a) return [];
    const parts: string[] = [t(`assetsPage.propertyTypes.${d.propertyType}`)];
    const living = formatShortNumber(d.livingAreaM2, locale.value);
    if (living) parts.push(t('realEstatePage.detail.livingArea', { value: living }));
    const land = formatShortNumber(d.landAreaM2, locale.value);
    if (land) parts.push(t('realEstatePage.detail.landArea', { value: land }));
    const rooms = formatShortNumber(d.rooms, locale.value);
    if (rooms) parts.push(t('realEstatePage.detail.rooms', { value: rooms }));
    if (d.constructionYear) parts.push(t('realEstatePage.detail.builtIn', { year: d.constructionYear }));
    if (d.renovationYear) parts.push(t('realEstatePage.detail.renovatedIn', { year: d.renovationYear }));
    if (a.acquisitionDate) {
        parts.push(
            a.acquisitionPrice != null
                ? t('realEstatePage.detail.boughtFor', {
                      date: formatCalendarDate(a.acquisitionDate, locale.value),
                      amount: money(a.acquisitionPrice)
                  })
                : t('realEstatePage.detail.boughtOn', { date: formatCalendarDate(a.acquisitionDate, locale.value) })
        );
    }
    return parts;
});

const amenities = computed(() => {
    const d = details.value;
    if (!d) return [];
    const list: string[] = [];
    if (d.hasElevator) list.push(t('realEstatePage.detail.amenities.elevator'));
    if (d.hasBalcony) list.push(t('realEstatePage.detail.amenities.balcony'));
    if (d.hasCellar) list.push(t('realEstatePage.detail.amenities.cellar'));
    if (d.hasGarage) list.push(t('realEstatePage.detail.amenities.garage'));
    return list;
});

async function loadAsset() {
    const id = props.assetPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await assetsStore.fetchAsset(id, true);
        if (!fresh || fresh.type !== 'immobilier') {
            emit('not-found');
            return;
        }
        emit('loaded', fresh);
        // les lots servent aux autres onglets (nom du lot, sélecteurs)
        void store.loadUnits(id).catch(() => undefined);
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        assetsStore.clearError();
        if (err.status === 404) {
            store.forget(id);
            emit('not-found');
            return;
        }
        localError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    void loadAsset();
    void store.refetchLoaded(props.assetPublicId);
}

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted = assetsStore.subscribeToDeleted((id) => {
        if (id !== props.assetPublicId) return;
        store.forget(id);
        emit('not-found');
    });
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted?.();
});

watch(
    () => props.assetPublicId,
    () => {
        void loadAsset();
    },
    { immediate: true }
);

function openEdit() {
    if (!asset.value) return;
    editOpen.value = true;
}

defineExpose({ openEdit, reload: loadAsset });
</script>

<template>
    <div class="re-detail">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link re-detail__retry" @click="loadAsset">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!asset && loading" class="su-loading" :aria-label="t('realEstatePage.loading')">
            <span class="su-spin" />
        </div>

        <template v-else-if="asset">
            <!-- ── caractéristiques ── -->
            <div class="re-detail__head">
                <p v-if="!asset.isActive" class="re-detail__sold">
                    <span class="su-sq" aria-hidden="true" />
                    {{ t('realEstatePage.detail.sold') }}
                </p>
                <p v-if="characteristics.length" class="re-detail__meta">{{ characteristics.join(' · ') }}</p>
                <p v-if="amenities.length" class="re-detail__meta re-detail__meta--soft">{{ amenities.join(' · ') }}</p>
                <p v-if="details?.taxValue != null" class="re-detail__meta re-detail__meta--soft">
                    {{ t('realEstatePage.detail.taxValue', { amount: money(details.taxValue) }) }}
                </p>
            </div>

            <!-- ── chiffres clés ── -->
            <div class="su-figs re-detail__figs" role="group" :aria-label="t('realEstatePage.detail.figs.label')">
                <div v-for="fig in figures" :key="fig.id" class="su-fig">
                    <p class="su-fig__label">{{ fig.label }}</p>
                    <p class="su-fig__num" :class="[fig.tone, { 'is-loading': loading }]">{{ fig.value }}</p>
                    <p v-if="fig.note" class="su-fig__note">{{ fig.note }}</p>
                </div>
                <div v-if="!summary" class="su-fig">
                    <p class="su-fig__label">{{ t('realEstatePage.detail.figs.summary') }}</p>
                    <p class="su-fig__num is-loading">{{ empty }}</p>
                </div>
            </div>

            <!-- ── onglets ── -->
            <nav class="su-tabs su-tabs--links re-detail__tabs" :aria-label="t('realEstatePage.detail.tabs.label')">
                <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': activeTab === tab.value }"
                    :aria-current="activeTab === tab.value ? 'page' : undefined"
                    @click="selectTab(tab.value)"
                >
                    <span class="su-tab__label" :data-label="tab.label">{{ tab.label }}</span>
                    <span v-if="tab.count != null" class="re-detail__tab-count">{{ tab.count }}</span>
                </button>
            </nav>

            <div class="re-detail__panel">
                <RealEstateUnitsPanel v-if="activeTab === 'lots'" :asset-public-id="assetPublicId" />
                <RealEstateChargesPanel v-else-if="activeTab === 'charges'" :asset-public-id="assetPublicId" :currency="currency" />
                <RealEstateMaintenancePanel v-else-if="activeTab === 'travaux'" :asset-public-id="assetPublicId" :currency="currency" />
                <RealEstateDocumentsPanel v-else-if="activeTab === 'documents'" :asset-public-id="assetPublicId" />
                <RealEstateRentalsPanel v-else :asset-public-id="assetPublicId" :currency="currency" />
            </div>

            <AssetFormModal v-model="editOpen" :asset="asset" locked-type="immobilier" @saved="loadAsset" />
        </template>
    </div>
</template>

<style scoped>
.re-detail {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
    padding: 8px 0 24px;
}

.re-detail__head {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.re-detail__meta {
    margin: 0;
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
}

.re-detail__meta--soft {
    color: var(--gray);
    font-size: 13px;
}

/* bien cédé : carré violet 7 px + texte (jamais la couleur seule) */
.re-detail__sold {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px;
    color: var(--violet-ink);
    font-size: 13px;
    font-weight: 700;
    --sq-color: var(--violet);
}

/* colonnes assez larges pour un montant à 6 chiffres ; au-delà, la rangée passe sur deux lignes */
.re-detail__figs {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

/* chiffre clé jamais tronqué : il passe à la ligne si la colonne reste étroite */
.re-detail__figs .su-fig__num {
    font-size: 26px;
    white-space: normal;
    overflow-wrap: anywhere;
}

.re-detail__figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.re-detail__tabs {
    border-bottom: 2px solid var(--ink);
    flex-wrap: wrap;
}

.re-detail__tab-count {
    margin-left: 4px;
    color: var(--gray);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
}

.re-detail__panel {
    min-width: 0;
    margin-top: -8px;
}

.re-detail__retry {
    margin-left: 8px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

@media (max-width: 767px) {
    .re-detail {
        gap: 24px;
        padding: 0 0 16px;
    }

    .re-detail__figs .su-fig__num {
        font-size: 18px;
        overflow: visible;
        white-space: normal;
    }

    .re-detail__tabs {
        overflow-x: auto;
        flex-wrap: nowrap;
    }
}
</style>
