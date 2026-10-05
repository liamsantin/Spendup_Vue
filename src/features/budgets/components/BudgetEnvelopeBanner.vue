<script setup lang="ts">
/**
 * Contexte « enveloppe » sur la page Transactions — mobile first.
 * Scopes empilés / grille 2 colonnes ; fermeture toujours accessible.
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
        <div class="budget-envelope__icon" aria-hidden="true">
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
        <div v-if="canSplit" class="budget-envelope__scopes" role="tablist" :aria-label="t('transactionsPage.envelope.scopeLabel')">
            <button
                type="button"
                class="su-btn"
                :class="scope === 'in' ? 'su-btn--tonal' : 'su-btn--ghost'"
                role="tab"
                :aria-selected="scope === 'in'"
                @click="emit('update:scope', 'in')"
            >
                {{ t('transactionsPage.envelope.scopeIn') }}
            </button>
            <button
                type="button"
                class="su-btn"
                :class="scope === 'out' ? 'su-btn--tonal' : 'su-btn--ghost'"
                role="tab"
                :aria-selected="scope === 'out'"
                @click="emit('update:scope', 'out')"
            >
                {{ t('transactionsPage.envelope.scopeOut') }}
            </button>
        </div>
    </section>
</template>

<style scoped>
.budget-envelope {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 40px;
    grid-template-areas:
        'icon copy close'
        'scopes scopes scopes';
    gap: 8px 10px;
    width: 100%;
    max-width: 100%;
    margin: 0 0 12px;
    padding: 12px;
    border-radius: var(--radius-surface);
    border: 1px solid var(--stroke);
    background: var(--surface-raised);
    box-sizing: border-box;
}

.budget-envelope__icon {
    grid-area: icon;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--surface);
    color: var(--ink);
}

.budget-envelope__copy {
    grid-area: copy;
    min-width: 0;
    align-self: center;
}

.budget-envelope__close {
    grid-area: close;
    justify-self: end;
}

.budget-envelope__name {
    margin: 0;
    font-size: 15px;
    font-weight: 620;
    letter-spacing: -0.02em;
    line-height: 1.25;
}

.budget-envelope__meta {
    margin: 2px 0 0;
    color: var(--ink-muted);
    font-size: 13px;
    line-height: 1.35;
}

.budget-envelope__scopes {
    grid-area: scopes;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    min-width: 0;
}

.budget-envelope__scopes .su-btn {
    flex: 0 0 auto;
    white-space: nowrap;
}

@media (min-width: 960px) {
    .budget-envelope--split {
        grid-template-columns: 40px minmax(0, 1fr) minmax(220px, 320px) 40px;
        grid-template-areas: 'icon copy scopes close';
        align-items: center;
        padding: 10px 12px;
    }
}
</style>
