<script setup lang="ts">
defineOptions({ name: 'SubscriptionQuotasCard' });

import { useI18n } from 'vue-i18n';
import type { QuotaUsageRow } from '@/features/subscription/format';

defineProps<{
    rows: QuotaUsageRow[];
}>();

const { t } = useI18n();

function fillWidth(row: QuotaUsageRow): string {
    return `${Math.min(100, Math.max(0, (row.ratio ?? 0) * 100))}%`;
}
</script>

<template>
    <section class="su-settings subscription-quotas">
        <div class="su-settings__lead">
            <h2>{{ t('subscriptionPage.quotas.title') }}</h2>
            <p>{{ t('subscriptionPage.quotas.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div v-if="!rows.length" class="is-full su-empty">{{ t('subscriptionPage.quotas.empty') }}</div>
            <!-- Une ligne par quota : nom 700, valeur à droite, jauge carrée 6 px (violet quand la limite est atteinte). -->
            <ul v-else class="is-full subscription-quotas__list">
                <li v-for="row in rows" :key="row.code" class="subscription-quotas__row" :data-quota-code="row.code">
                    <div class="subscription-quotas__head">
                        <span class="subscription-quotas__name">{{ row.name }}</span>
                        <span class="subscription-quotas__value" :class="{ 'is-reached': row.reached, 'is-unlimited': row.limit == null }">
                            <template v-if="row.limit == null">
                                {{ t('subscriptionPage.quotas.usedUnlimited', { used: row.used, unit: row.unit }, row.used) }}
                            </template>
                            <template v-else-if="row.limit === 0">
                                {{ t('subscriptionPage.quotas.notIncluded') }}
                            </template>
                            <template v-else>
                                {{
                                    t(
                                        'subscriptionPage.quotas.usedOfLimit',
                                        { used: row.used, limit: row.limit, unit: row.unit },
                                        row.limit
                                    )
                                }}
                            </template>
                        </span>
                    </div>
                    <span
                        v-if="row.ratio != null"
                        class="su-gauge"
                        role="progressbar"
                        :aria-label="row.name"
                        :aria-valuemin="0"
                        :aria-valuemax="100"
                        :aria-valuenow="Math.round(row.ratio * 100)"
                    >
                        <span
                            class="su-gauge__fill"
                            :class="row.reached ? 'su-gauge__fill--over' : 'su-gauge__fill--blue'"
                            :style="{ width: fillWidth(row) }"
                        />
                    </span>
                </li>
            </ul>
        </div>
    </section>
</template>

<style scoped>
.subscription-quotas__list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.subscription-quotas__row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.subscription-quotas__row:first-child {
    border-top: 0;
    padding-top: 0;
}

.subscription-quotas__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
}

.subscription-quotas__name {
    font-size: 14px;
    font-weight: 700;
}

.subscription-quotas__value {
    flex: none;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.subscription-quotas__value.is-unlimited {
    color: var(--blue-ink);
}

/* limite atteinte = violet (dépassement), jamais de rouge décoratif */
.subscription-quotas__value.is-reached {
    color: var(--violet-ink);
    font-weight: 700;
}
</style>
