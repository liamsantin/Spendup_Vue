<script setup lang="ts">
/**
 * Carte d’un plan public dans le sélecteur : features cochées / non incluses et quotas comparés.
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
    <article
        class="plan-card"
        :class="{ 'plan-card--current': plan.isCurrent, 'plan-card--highlighted': highlighted && !plan.isCurrent }"
        :data-plan-code="plan.code"
    >
        <header class="plan-card__head">
            <div class="plan-card__title">
                <h3>{{ plan.name }}</h3>
                <span v-if="plan.isCurrent" class="plan-card__badge plan-card__badge--current">{{
                    t('subscriptionPage.selector.current')
                }}</span>
                <span v-else-if="highlighted" class="plan-card__badge">{{ t('subscriptionPage.selector.recommended') }}</span>
            </div>
            <p v-if="plan.description" class="plan-card__description">{{ plan.description }}</p>
        </header>

        <section class="plan-card__section">
            <p class="plan-card__section-title">{{ t('subscriptionPage.selector.features') }}</p>
            <ul class="plan-card__list">
                <li v-for="feature in features" :key="feature.code" class="plan-card__row" :class="{ 'is-off': !feature.included }">
                    <span class="plan-card__mark" :class="{ 'is-on': feature.included }">
                        <CheckIcon v-if="feature.included" :size="13" stroke-width="2.6" />
                        <MinusIcon v-else :size="13" stroke-width="2.2" />
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
    gap: 14px;
    min-width: 0;
    padding: 18px 16px 16px;
    border-radius: var(--radius-surface, 18px);
    background: var(--surface);
    border: 1px solid var(--stroke);
    box-shadow: var(--shadow-rest);
    transition:
        border-color 0.25s ease,
        box-shadow 0.25s ease,
        transform 0.35s var(--spring, ease);
}

.plan-card--current {
    border-color: rgba(var(--v-theme-primary), 0.45);
    background: rgba(var(--v-theme-primary), 0.04);
}

.plan-card--highlighted {
    border-color: rgba(var(--v-theme-primary), 0.55);
    box-shadow:
        0 0 0 3px rgba(var(--v-theme-primary), 0.1),
        var(--shadow-rest);
}

.plan-card__head {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plan-card__title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.plan-card__title h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.02em;
}

.plan-card__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
}

.plan-card__badge--current {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.plan-card__description {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.45;
    color: var(--ink-muted);
}

.plan-card__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plan-card__section-title {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.plan-card__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.plan-card__row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 0.84rem;
}

.plan-card__row.is-off {
    color: var(--ink-muted);
}

.plan-card__row--quota {
    justify-content: space-between;
}

.plan-card__row--quota strong {
    flex: none;
    font-weight: 650;
}

.plan-card__mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--hair);
    color: var(--ink-muted);
}

.plan-card__mark.is-on {
    background: rgba(var(--v-theme-success), 0.14);
    color: rgb(var(--v-theme-success));
}

.plan-card__foot {
    margin-top: auto;
    padding-top: 4px;
}

.plan-card__foot .su-btn {
    width: 100%;
    justify-content: center;
}
</style>
