<script setup lang="ts">
/**
 * Fiche d’un bien immobilier. L’onglet Informations (défaut) porte la synthèse et les
 * caractéristiques. Lots · Charges · Travaux · Documents · Baux · Transactions sont les autres valeurs de `tab`.
 * La barre d’onglets est rendue par la page, sous le titre.
 */
defineOptions({ name: 'RealEstateDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import AssetFormModal from '@/features/assets/components/modals/AssetFormModal.vue';
import { useAssetsStore } from '@/features/assets/stores/assets-store';
import type { Asset } from '@/features/assets/types';
import {
    activeRealEstateDetailTab,
    formatCalendarDate,
    formatRealEstateAddress,
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
import AssetTransactionsPanel from '@/features/transactions/components/AssetTransactionsPanel.vue';
import RealEstateUnitsPanel from '@/features/real-estate/components/panels/RealEstateUnitsPanel.vue';

const props = defineProps<{
    assetPublicId: string;
}>();

const emit = defineEmits<{
    'not-found': [];
    loaded: [asset: Asset];
}>();

const { t, locale } = useI18n();
const route = useRoute();
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

const activeTab = computed(() => activeRealEstateDetailTab(route.query.tab));

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

type PropertyFact = { id: string; label: string; value: string };

/** Caractéristiques en lignes libellé / valeur. Les chiffres de synthèse restent dans `figures`. */
const facts = computed<PropertyFact[]>(() => {
    const d = details.value;
    const current = asset.value;
    if (!d || !current) return [];
    const list: PropertyFact[] = [];
    const add = (id: string, label: string, value: string | number | null | undefined) => {
        if (value == null) return;
        const text = String(value).trim();
        if (!text) return;
        list.push({ id, label, value: text });
    };
    const field = (key: string) => t(`assetsPage.form.fields.${key}`);
    const num = (value: number | null) => formatShortNumber(value, locale.value);

    add('propertyType', field('propertyType'), t(`assetsPage.propertyTypes.${d.propertyType}`));
    add('address', field('addressLine1'), formatRealEstateAddress(d));
    add('addressLine2', field('addressLine2'), d.addressLine2);
    add('country', field('country'), d.country);
    add('livingArea', field('livingAreaM2'), num(d.livingAreaM2));
    add('landArea', field('landAreaM2'), num(d.landAreaM2));
    add('rooms', field('rooms'), num(d.rooms));
    add('bedrooms', field('bedrooms'), num(d.bedrooms));
    add('bathrooms', field('bathrooms'), num(d.bathrooms));
    add('floor', field('floor'), num(d.floor));
    add('constructionYear', field('constructionYear'), d.constructionYear);
    add('renovationYear', field('renovationYear'), d.renovationYear);
    if (d.hasElevator) add('elevator', field('hasElevator'), t('common.yes'));
    if (d.hasBalcony) add('balcony', field('hasBalcony'), t('common.yes'));
    if (d.hasCellar) add('cellar', field('hasCellar'), t('common.yes'));
    if (d.hasGarage) add('garage', field('hasGarage'), t('common.yes'));
    if (current.acquisitionDate) {
        add('acquisitionDate', field('acquisitionDate'), formatCalendarDate(current.acquisitionDate, locale.value));
    }
    if (current.acquisitionPrice != null) add('acquisitionPrice', field('acquisitionPrice'), money(current.acquisitionPrice));
    if (d.taxValue != null) add('taxValue', field('taxValue'), money(d.taxValue));
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
            <div v-if="activeTab === 'informations'" class="re-detail__info">
                <p v-if="!asset.isActive" class="re-detail__sold">
                    <span class="su-sq" aria-hidden="true" />
                    {{ t('realEstatePage.detail.sold') }}
                </p>

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

                <div v-if="facts.length" class="re-detail__sheet">
                    <div v-for="fact in facts" :key="fact.id" class="su-kv">
                        <span>{{ fact.label }}</span>
                        <span>{{ fact.value }}</span>
                    </div>
                </div>

                <p v-if="asset.description" class="re-detail__text">{{ asset.description }}</p>
                <p v-if="asset.notes" class="re-detail__text re-detail__text--soft">{{ asset.notes }}</p>
            </div>

            <div v-else class="re-detail__panel">
                <RealEstateUnitsPanel v-if="activeTab === 'lots'" :asset-public-id="assetPublicId" />
                <RealEstateChargesPanel v-else-if="activeTab === 'charges'" :asset-public-id="assetPublicId" :currency="currency" />
                <RealEstateMaintenancePanel v-else-if="activeTab === 'travaux'" :asset-public-id="assetPublicId" :currency="currency" />
                <RealEstateDocumentsPanel v-else-if="activeTab === 'documents'" :asset-public-id="assetPublicId" />
                <RealEstateRentalsPanel v-else-if="activeTab === 'baux'" :asset-public-id="assetPublicId" :currency="currency" />
                <AssetTransactionsPanel v-else-if="activeTab === 'transactions'" :asset-public-id="assetPublicId" />
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

.re-detail__info {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
}

.re-detail__sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 64px;
}

.re-detail__sheet .su-kv:nth-child(-n + 2) {
    border-top: 0;
    padding-top: 0;
}

.re-detail__text {
    margin: 8px 0 0;
    color: var(--ink);
    font-size: 14px;
    white-space: pre-wrap;
}

.re-detail__text--soft {
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

.re-detail__panel {
    min-width: 0;
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

    .re-detail__sheet {
        grid-template-columns: minmax(0, 1fr);
    }

    .re-detail__sheet .su-kv:nth-child(2) {
        border-top: 1px solid var(--line);
        padding-top: 12px;
    }

    .re-detail__figs .su-fig__num {
        font-size: 18px;
        overflow: visible;
        white-space: normal;
    }
}
</style>
