<script setup lang="ts">
/**
 * Fiche d’un actif (hors immobilier). Onglets : Informations (caractéristiques), Valorisations
 * (sauf épargne adossée à un compte) et, pour un véhicule, Relevés · Entretiens.
 * La modification du formulaire reste dans `AssetFormModal` (`formOnly`).
 */
defineOptions({ name: 'AssetDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import AssetFormModal from '@/features/assets/components/modals/AssetFormModal.vue';
import AssetValuationsPanel from '@/features/assets/components/panels/AssetValuationsPanel.vue';
import VehicleMaintenancesPanel from '@/features/assets/components/panels/VehicleMaintenancesPanel.vue';
import VehicleMileagesPanel from '@/features/assets/components/panels/VehicleMileagesPanel.vue';
import {
    activeAssetDetailTab,
    assetDetailTabs,
    formatAssetInteger,
    formatAssetValue,
    formatCalendarDate,
    formatCryptoQuantity
} from '@/features/assets/format';
import { useAssetsStore } from '@/features/assets/stores/assets-store';

const props = defineProps<{
    assetPublicId: string;
}>();

const emit = defineEmits<{
    'not-found': [];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const assetsStore = useAssetsStore();
const accountsStore = useAccountsStore();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);

const asset = computed(() => {
    const found = assetsStore.findByPublicId(props.assetPublicId);
    if (!found || found.type === 'immobilier') return null;
    return found;
});

const currency = computed(() => asset.value?.currency ?? '');
const money = (amount: number) => formatAssetValue(amount, currency.value, locale.value);

const linkedAccountName = computed(() => {
    const id = asset.value?.savingsAccount?.accountPublicId;
    if (!id) return null;
    return accountsStore.accounts.find((item) => item.publicId === id)?.name ?? null;
});

const activeTab = computed(() => {
    const current = asset.value;
    if (!current) return null;
    return activeAssetDetailTab(route.query.tab, assetDetailTabs(current));
});

const valueNote = computed(() => {
    const current = asset.value;
    if (!current) return null;
    if (current.isValueFromAccount) return t('assetsPage.detail.figs.valueFromAccount');
    if (!current.lastValuationDate) return t('assetsPage.detail.figs.noValuation');
    return t('assetsPage.detail.figs.valuedOn', { date: formatCalendarDate(current.lastValuationDate, locale.value) });
});

const figures = computed(() => {
    const current = asset.value;
    if (!current) return [];
    return [{ id: 'value', label: t('assetsPage.detail.figs.value'), value: money(current.estimatedValue), note: valueNote.value }];
});

type AssetFact = { id: string; label: string; value: string };

/** Chiffres qui tiennent dans la rangée du haut. Le reste va dans la fiche. */
const HIGHLIGHT_IDS = new Set(['mileage', 'quantity', 'averagePrice', 'insuredValue', 'interest', 'acquisitionPrice']);

/** Caractéristiques selon le type, puis l’acquisition. */
const facts = computed<AssetFact[]>(() => {
    const current = asset.value;
    if (!current) return [];
    const list: AssetFact[] = [];
    const add = (id: string, label: string, value: string | number | null | undefined) => {
        if (value == null) return;
        const text = String(value).trim();
        if (!text) return;
        list.push({ id, label, value: text });
    };
    const field = (key: string) => t(`assetsPage.form.fields.${key}`);

    const vehicle = current.vehicle;
    if (vehicle) {
        add('vehicleType', field('vehicleType'), t(`assetsPage.vehicleTypes.${vehicle.vehicleType}`));
        add('brand', field('brand'), vehicle.brand);
        add('model', field('model'), vehicle.model);
        if (vehicle.fuel) add('fuel', field('fuel'), t(`assetsPage.fuels.${vehicle.fuel}`));
        add('year', field('firstRegistrationYear'), vehicle.firstRegistrationYear);
        add('plate', field('plate'), vehicle.plate);
        if (vehicle.currentMileage != null) {
            add(
                'mileage',
                field('currentMileage'),
                t('assetsPage.mileages.km', { value: formatAssetInteger(vehicle.currentMileage, locale.value) })
            );
        }
    }
    const crypto = current.crypto;
    if (crypto) {
        if (crypto.name && crypto.name !== current.name) add('cryptoName', field('cryptoName'), crypto.name);
        add('symbol', field('symbol'), crypto.symbol);
        add('quantity', field('quantity'), formatCryptoQuantity(crypto.quantity, locale.value));
        add('platform', field('platform'), crypto.platform);
        if (crypto.averagePurchasePrice != null) add('averagePrice', field('averagePurchasePrice'), money(crypto.averagePurchasePrice));
    }
    const item = current.valuableItem;
    if (item) {
        add('itemType', field('itemType'), t(`assetsPage.valuableItemTypes.${item.itemType}`));
        add('brand', field('brand'), item.brand);
        add('model', field('model'), item.model);
        add('insured', field('isInsured'), item.isInsured ? t('common.yes') : t('common.no'));
        if (item.insuredValue != null) add('insuredValue', field('insuredValue'), money(item.insuredValue));
    }
    const savings = current.savingsAccount;
    if (savings) {
        add('savingsType', field('savingsType'), t(`assetsPage.savingsTypes.${savings.savingsType}`));
        add('account', field('account'), linkedAccountName.value);
        if (savings.interestRate != null) {
            add(
                'interest',
                field('interestRate'),
                new Intl.NumberFormat(locale.value || 'fr-CH', { maximumFractionDigits: 2 }).format(savings.interestRate)
            );
        }
        if (savings.isBlocked) add('blocked', field('isBlocked'), t('common.yes'));
        if (savings.releaseDate) add('release', field('releaseDate'), formatCalendarDate(savings.releaseDate, locale.value));
    }
    if (current.other?.customType) add('customType', field('customType'), current.other.customType);
    if (current.acquisitionDate) {
        add('acquisitionDate', field('acquisitionDate'), formatCalendarDate(current.acquisitionDate, locale.value));
    }
    if (current.acquisitionPrice != null) add('acquisitionPrice', field('acquisitionPrice'), money(current.acquisitionPrice));
    return list;
});

const highlights = computed(() => facts.value.filter((fact) => HIGHLIGHT_IDS.has(fact.id)));
const details = computed(() => facts.value.filter((fact) => !HIGHLIGHT_IDS.has(fact.id)));

async function loadAsset() {
    const id = props.assetPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await assetsStore.fetchAsset(id, true);
        if (!fresh || fresh.type === 'immobilier') {
            emit('not-found');
            return;
        }
        const accountId = fresh.savingsAccount?.accountPublicId;
        if (accountId && !accountsStore.initialized) {
            void accountsStore.loadAccounts().catch(() => undefined);
        }
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        assetsStore.clearError();
        if (err.status === 404) {
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
}

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted = assetsStore.subscribeToDeleted((id) => {
        if (id !== props.assetPublicId) return;
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
        editOpen.value = false;
        void loadAsset();
    },
    { immediate: true }
);

watch(
    () => [asset.value?.publicId, route.query.edit] as const,
    ([id, edit]) => {
        if (edit !== '1' || !id) return;
        editOpen.value = true;
        const query = { ...route.query };
        delete query.edit;
        void router.replace({ path: route.path, query });
    }
);

function openEdit() {
    if (!asset.value) return;
    editOpen.value = true;
}

defineExpose({ openEdit, reload: loadAsset });
</script>

<template>
    <div class="asset-detail">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link asset-detail__retry" @click="loadAsset">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!asset && loading" class="su-loading" :aria-label="t('assetsPage.loading')">
            <span class="su-spin" />
        </div>

        <template v-else-if="asset">
            <div v-if="activeTab === 'informations'" class="asset-detail__info">
                <p v-if="!asset.isActive" class="asset-detail__sold">
                    <span class="su-sq" aria-hidden="true" />
                    {{ t('assetsPage.detail.sold') }}
                </p>

                <div class="su-figs asset-detail__figs" role="group" :aria-label="t('assetsPage.detail.figs.label')">
                    <div v-for="fig in figures" :key="fig.id" class="su-fig">
                        <p class="su-fig__label">{{ fig.label }}</p>
                        <p class="su-fig__num" :class="{ 'is-loading': loading }">{{ fig.value }}</p>
                        <p v-if="fig.note" class="su-fig__note">{{ fig.note }}</p>
                    </div>
                    <div v-for="fact in highlights" :key="fact.id" class="su-fig">
                        <p class="su-fig__label">{{ fact.label }}</p>
                        <p class="su-fig__num">{{ fact.value }}</p>
                    </div>
                </div>

                <div v-if="details.length" class="asset-detail__sheet">
                    <div v-for="fact in details" :key="fact.id" class="su-kv">
                        <span>{{ fact.label }}</span>
                        <span>{{ fact.value }}</span>
                    </div>
                </div>

                <p v-if="asset.description" class="asset-detail__text">{{ asset.description }}</p>
                <p v-if="asset.notes" class="asset-detail__text asset-detail__text--soft">{{ asset.notes }}</p>
            </div>

            <div v-else-if="activeTab" class="asset-detail__panel">
                <AssetValuationsPanel v-if="activeTab === 'valuations'" :asset="asset" />
                <VehicleMileagesPanel v-else-if="activeTab === 'mileages'" :asset="asset" />
                <VehicleMaintenancesPanel v-else :asset="asset" />
            </div>

            <AssetFormModal v-model="editOpen" :asset="asset" form-only @saved="loadAsset" />
        </template>
    </div>
</template>

<style scoped>
.asset-detail {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
    padding: 8px 0 24px;
}

.asset-detail__info {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
}

/* une seule rangée de chiffres, comme le tableau de bord */
.asset-detail__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.asset-detail__figs .su-fig__num {
    font-size: 26px;
    white-space: normal;
    overflow-wrap: anywhere;
}

.asset-detail__figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.asset-detail__sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 64px;
}

.asset-detail__sheet .su-kv:nth-child(-n + 2) {
    border-top: 0;
    padding-top: 0;
}

.asset-detail__text {
    margin: 8px 0 0;
    color: var(--ink);
    font-size: 14px;
    white-space: pre-wrap;
}

.asset-detail__text--soft {
    color: var(--gray);
    font-size: 13px;
}

.asset-detail__sold {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px;
    color: var(--violet-ink);
    font-size: 13px;
    font-weight: 700;
    --sq-color: var(--violet);
}

.asset-detail__panel {
    min-width: 0;
}

.asset-detail__retry {
    margin-left: 8px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

@media (max-width: 767px) {
    .asset-detail {
        gap: 24px;
        padding: 0 0 16px;
    }

    .asset-detail__figs,
    .asset-detail__sheet {
        grid-template-columns: minmax(0, 1fr);
    }

    .asset-detail__sheet .su-kv:nth-child(2) {
        border-top: 1px solid var(--line);
        padding-top: 12px;
    }

    .asset-detail__figs .su-fig__num {
        font-size: 22px;
    }
}
</style>
