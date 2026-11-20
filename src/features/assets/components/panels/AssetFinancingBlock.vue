<script setup lang="ts">
/**
 * Bloc « Financement » de la fiche d’un actif : les dettes actives qui le financent (leasing, crédit, hypothèque),
 * leur restant dû, et la valeur nette (valeur estimée moins restant dû, dans la devise de l’actif).
 * Rien n’est affiché si aucune dette n’est liée.
 */
defineOptions({ name: 'AssetFinancingBlock' });

import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatAssetValue } from '@/features/assets/format';
import type { Asset } from '@/features/assets/types';
import { formatLiabilityAmount } from '@/features/liabilities/format';
import { liabilityDetailPath } from '@/features/liabilities/paths';
import { useLiabilitiesStore } from '@/features/liabilities/stores/liabilities-store';

const props = defineProps<{
    asset: Asset;
}>();

const { t, locale } = useI18n();
const liabilitiesStore = useLiabilitiesStore();

/** Dettes actives liées à cet actif. */
const debts = computed(() =>
    liabilitiesStore.allKnownItems().filter((item) => item.assetPublicId === props.asset.publicId && item.status === 'active')
);

/** Seules les dettes dans la devise de l’actif entrent dans les totaux. */
const sameCurrency = computed(() => debts.value.filter((item) => item.currency === props.asset.currency));
const excludedCount = computed(() => debts.value.length - sameCurrency.value.length);
const remainingTotal = computed(() => sameCurrency.value.reduce((sum, item) => sum + item.remainingAmount, 0));
const netValue = computed(() => props.asset.estimatedValue - remainingTotal.value);

const money = (amount: number) => formatAssetValue(amount, props.asset.currency, locale.value);

onMounted(() => {
    if (!liabilitiesStore.initialized) void liabilitiesStore.loadList().catch(() => undefined);
});
</script>

<template>
    <section v-if="debts.length" class="asset-financing">
        <h2 class="asset-financing__title">{{ t('assetsPage.detail.financing.title') }}</h2>

        <div class="su-figs asset-financing__figs">
            <div class="su-fig">
                <p class="su-fig__label">{{ t('assetsPage.detail.financing.remaining') }}</p>
                <p class="su-fig__num">{{ money(remainingTotal) }}</p>
            </div>
            <div class="su-fig">
                <p class="su-fig__label">{{ t('assetsPage.detail.financing.netValue') }}</p>
                <p class="su-fig__num" :class="netValue < 0 ? 'su-over' : 'su-pos'">{{ money(netValue) }}</p>
                <p class="su-fig__note">{{ t('assetsPage.detail.financing.netValueNote') }}</p>
            </div>
        </div>

        <ul class="asset-financing__list">
            <li v-for="debt in debts" :key="debt.publicId" class="asset-financing__row">
                <span class="asset-financing__meta">
                    <RouterLink :to="liabilityDetailPath(debt.publicId)" class="su-link asset-financing__name">{{ debt.name }}</RouterLink>
                    <span class="asset-financing__sub">
                        {{ t(`liabilitiesPage.types.${debt.type}`) }}
                        <template v-if="debt.residualValue != null">
                            ·
                            {{
                                t('assetsPage.detail.financing.residual', {
                                    amount: formatLiabilityAmount(debt.residualValue, debt.currency, locale)
                                })
                            }}
                        </template>
                        <template v-if="debt.recurringExpenseName"> · {{ debt.recurringExpenseName }}</template>
                    </span>
                </span>
                <span class="asset-financing__amount su-neg">{{ formatLiabilityAmount(debt.remainingAmount, debt.currency, locale) }}</span>
            </li>
        </ul>

        <p v-if="excludedCount" class="asset-financing__note">
            {{ t('assetsPage.detail.financing.excluded', { count: excludedCount }, excludedCount) }}
        </p>
    </section>
</template>

<style scoped>
.asset-financing {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
}

/* titre de section : 16 px 700 sur filet 2 px */
.asset-financing__title {
    margin: 0;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--ink);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.asset-financing__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.asset-financing__figs .su-fig__num {
    font-size: 26px;
}

/* une ligne par dette : nom cliquable + type, restant dû à droite, filet fin */
.asset-financing__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.asset-financing__row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.asset-financing__meta {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.asset-financing__name {
    font-weight: 700;
}

.asset-financing__sub,
.asset-financing__note {
    color: var(--gray);
    font-size: 13px;
}

.asset-financing__note {
    margin: 0;
}

.asset-financing__amount {
    flex: none;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 767px) {
    .asset-financing__figs {
        grid-template-columns: minmax(0, 1fr);
    }

    .asset-financing__figs .su-fig__num {
        font-size: 22px;
    }
}
</style>
