<script setup lang="ts">
/**
 * Contexte « enveloppe » sur la page Transactions : bloc sur filet 2 px, sans fond.
 * Scopes en onglets texte ; fermeture toujours accessible.
 */
defineOptions({ name: 'BudgetEnvelopeBanner' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { WalletIcon, XIcon } from 'vue-tabler-icons';
import { formatCalendarDate } from '@/features/budgets/format';
import type { Budget } from '@/features/budgets/types';

const props = defineProps<{
    budget: Budget;
    scope: 'in' | 'out';
}>();

const emit = defineEmits<{
    'update:scope': [value: 'in' | 'out'];
    dismiss: [];
}>();

const { t, locale } = useI18n();

const canSplit = computed(() => !!props.budget.categoryPublicId);

const windowLabel = computed(() =>
    t('transactionsPage.envelope.window', {
        start: formatCalendarDate(props.budget.periodStart, locale.value),
        end: formatCalendarDate(props.budget.periodEnd, locale.value)
    })
);
</script>

<template>
    <section class="budget-envelope" :class="{ 'budget-envelope--split': canSplit }" :aria-label="t('transactionsPage.envelope.title')">
        <div class="su-tile su-tile--blue budget-envelope__icon" aria-hidden="true">
            <WalletIcon :size="18" stroke-width="1.7" />
        </div>
        <div class="budget-envelope__copy">
            <p class="budget-envelope__name">{{ budget.name }}</p>
            <p class="budget-envelope__meta">{{ windowLabel }}</p>
        </div>
        <button
            type="button"
            class="su-orb budget-envelope__close"
            :aria-label="t('transactionsPage.envelope.dismiss')"
            @click="emit('dismiss')"
        >
            <XIcon :size="18" stroke-width="1.8" />
        </button>
        <div v-if="canSplit" class="su-tabs budget-envelope__scopes" role="tablist" :aria-label="t('transactionsPage.envelope.scopeLabel')">
            <button
                type="button"
                class="su-tab"
                :class="{ 'is-active': scope === 'in' }"
                role="tab"
                :aria-selected="scope === 'in'"
                @click="emit('update:scope', 'in')"
            >
                <span class="su-tab__label" :data-label="t('transactionsPage.envelope.scopeIn')">{{
                    t('transactionsPage.envelope.scopeIn')
                }}</span>
            </button>
            <button
                type="button"
                class="su-tab"
                :class="{ 'is-active': scope === 'out' }"
                role="tab"
                :aria-selected="scope === 'out'"
                @click="emit('update:scope', 'out')"
            >
                <span class="su-tab__label" :data-label="t('transactionsPage.envelope.scopeOut')">{{
                    t('transactionsPage.envelope.scopeOut')
                }}</span>
            </button>
        </div>
    </section>
</template>

<style scoped>
.budget-envelope {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) 40px;
    grid-template-areas:
        'icon copy close'
        'scopes scopes scopes';
    align-items: center;
    gap: 8px 14px;
    width: 100%;
    max-width: 100%;
    margin: 0 0 16px;
    padding: 12px 0 8px;
    border-top: 1px solid var(--line);
    box-sizing: border-box;
}

.budget-envelope__icon {
    grid-area: icon;
}

.budget-envelope__copy {
    grid-area: copy;
    min-width: 0;
}

.budget-envelope__close {
    grid-area: close;
    justify-self: end;
}

.budget-envelope__name {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.25;
}

.budget-envelope__meta {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.35;
}

.budget-envelope__scopes {
    grid-area: scopes;
    margin: 0;
    min-width: 0;
}

@media (min-width: 960px) {
    .budget-envelope--split {
        grid-template-columns: 36px minmax(0, 1fr) auto 40px;
        grid-template-areas: 'icon copy scopes close';
    }
}
</style>
