<script setup lang="ts">
defineOptions({ name: 'SubscriptionQuotasCard' });

import { useI18n } from 'vue-i18n';
import { GaugeIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import type { QuotaUsageRow } from '@/features/subscription/format';

defineProps<{
    rows: QuotaUsageRow[];
}>();

const { t } = useI18n();

function barColor(row: QuotaUsageRow): string {
    if (row.reached) return 'error';
    if ((row.ratio ?? 0) >= 0.8) return 'warning';
    return 'primary';
}
</script>

<template>
    <AppGlassCard :title="t('subscriptionPage.quotas.title')" :subtitle="t('subscriptionPage.quotas.subtitle')">
        <template #icon>
            <GaugeIcon :size="20" stroke-width="1.5" />
        </template>

        <div v-if="!rows.length" class="su-empty">{{ t('subscriptionPage.quotas.empty') }}</div>
        <ul v-else class="subscription-quotas">
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
                            {{ t('subscriptionPage.quotas.usedOfLimit', { used: row.used, limit: row.limit, unit: row.unit }, row.limit) }}
                        </template>
                    </span>
                </div>
                <v-progress-linear
                    v-if="row.ratio != null"
                    :model-value="row.ratio * 100"
                    :color="barColor(row)"
                    height="6"
                    rounded
                    :aria-label="row.name"
                />
            </li>
        </ul>
    </AppGlassCard>
</template>

<style scoped>
.subscription-quotas {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.subscription-quotas__row {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.subscription-quotas__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
}

.subscription-quotas__name {
    font-weight: 600;
    font-size: 0.9rem;
}

.subscription-quotas__value {
    flex: none;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ink-muted);
}

.subscription-quotas__value.is-unlimited {
    color: rgb(var(--v-theme-success));
}

.subscription-quotas__value.is-reached {
    color: rgb(var(--v-theme-error));
}
</style>
