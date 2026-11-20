<script setup lang="ts">
/**
 * Bloc d’un plan public dans le sélecteur : features cochées / non incluses et quotas comparés.
 * Pas de prix pour l’instant (le schéma backend n’en a pas).
 */
defineOptions({ name: 'PlanCard' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, MinusIcon } from 'vue-tabler-icons';
import { planHasFeature, planQuotaLimit } from '@/features/subscription/format';
import type { SubscriptionPlan } from '@/features/subscription/types';

const props = withDefaults(
    defineProps<{
        plan: SubscriptionPlan;
        /** Lignes communes à tous les plans (union), pour aligner le comparatif. */
        featureRows: { code: string; name: string }[];
        quotaRows: { code: string; name: string; unit: string }[];
        /** Plan mis en avant par l’upsell (ex. plan minimum requis). */
        highlighted?: boolean;
        disabled?: boolean;
    }>(),
    {
        highlighted: false,
        disabled: false
    }
);

const emit = defineEmits<{
    choose: [plan: SubscriptionPlan];
}>();

const { t } = useI18n();

const features = computed(() => props.featureRows.map((row) => ({ ...row, included: planHasFeature(props.plan, row.code) })));

const quotas = computed(() =>
    props.quotaRows.map((row) => {
        const limit = planQuotaLimit(props.plan, row.code);
        let label: string;
        if (limit === undefined) label = t('subscriptionPage.quotas.notApplicable');
        else if (limit == null) label = t('subscriptionPage.quotas.unlimited');
        else label = t('subscriptionPage.quotas.limitValue', { count: limit, unit: row.unit }, limit);
        return { ...row, label, none: limit === 0 || limit === undefined };
    })
);
</script>

<template>
    <!-- Bloc à filet 2 px (bleu pour le plan recommandé) : nom 30 px 700, listes sur filets fins, bouton principal. -->
    <article
        class="plan-card"
        :class="{ 'plan-card--current': plan.isCurrent, 'plan-card--highlighted': highlighted && !plan.isCurrent }"
        :data-plan-code="plan.code"
    >
        <header class="plan-card__head">
            <p v-if="plan.isCurrent" class="su-chip plan-card__badge" style="--chip-color: var(--blue)">
                {{ t('subscriptionPage.selector.current') }}
            </p>
            <p v-else-if="highlighted" class="su-chip plan-card__badge" style="--chip-color: var(--violet)">
                {{ t('subscriptionPage.selector.recommended') }}
            </p>
            <p v-else class="su-chip su-chip--plain plan-card__badge" aria-hidden="true">&nbsp;</p>
            <h3 class="plan-card__name">{{ plan.name }}</h3>
            <p v-if="plan.description" class="plan-card__description">{{ plan.description }}</p>
        </header>

        <section class="plan-card__section">
            <p class="plan-card__section-title">{{ t('subscriptionPage.selector.features') }}</p>
            <ul class="plan-card__list">
                <li v-for="feature in features" :key="feature.code" class="plan-card__row" :class="{ 'is-off': !feature.included }">
                    <span class="plan-card__mark" :class="{ 'is-on': feature.included }" aria-hidden="true">
                        <CheckIcon v-if="feature.included" :size="15" stroke-width="2.4" />
                        <MinusIcon v-else :size="15" stroke-width="2" />
                    </span>
                    <span class="text-truncate">{{ feature.name }}</span>
                </li>
            </ul>
        </section>

        <section class="plan-card__section">
            <p class="plan-card__section-title">{{ t('subscriptionPage.selector.quotas') }}</p>
            <ul class="plan-card__list">
                <li
                    v-for="quota in quotas"
                    :key="quota.code"
                    class="plan-card__row plan-card__row--quota"
                    :class="{ 'is-off': quota.none }"
                >
                    <span class="text-truncate">{{ quota.name }}</span>
                    <strong>{{ quota.label }}</strong>
                </li>
            </ul>
        </section>

        <footer class="plan-card__foot">
            <button v-if="plan.isCurrent" type="button" class="su-btn su-btn--ghost" disabled>
                {{ t('subscriptionPage.selector.currentAction') }}
            </button>
            <button v-else type="button" class="su-btn su-btn--ink" :disabled="disabled" @click="emit('choose', plan)">
                {{ t('subscriptionPage.selector.choose') }}
            </button>
        </footer>
    </article>
</template>

<style scoped>
.plan-card {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
    padding: 12px 0 0;
    border-top: 1px solid var(--line);
    background: transparent;
}

.plan-card--highlighted {
    border-top-color: var(--blue);
}

.plan-card--highlighted .plan-card__name {
    color: var(--blue-ink);
}

.plan-card__head {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.plan-card__badge {
    margin: 0;
    height: 20px;
}

.plan-card__name {
    margin: 2px 0 0;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1.1;
}

.plan-card__description {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.45;
}

.plan-card__section {
    display: flex;
    flex-direction: column;
}

.plan-card__section-title {
    margin: 0 0 4px;
    color: var(--gray);
    font-size: 13px;
}

.plan-card__list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.plan-card__row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 8px 0;
    border-top: 1px solid var(--line);
    font-size: 14px;
}

.plan-card__row.is-off {
    color: var(--gray);
}

.plan-card__row--quota {
    justify-content: space-between;
}

.plan-card__row--quota strong {
    flex: none;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

/* coche bleue (inclus) ou tiret gris (non inclus), sans pastille */
.plan-card__mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 18px;
    height: 18px;
    color: var(--gray);
}

.plan-card__mark.is-on {
    color: var(--blue-ink);
}

.plan-card__foot {
    margin-top: auto;
}

.plan-card__foot .su-btn {
    width: 100%;
    justify-content: center;
}
</style>
