<script setup lang="ts">
defineOptions({ name: 'SubscriptionOverviewCard' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CrownIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import { formatSubscriptionDate } from '@/features/subscription/format';
import type { UserSubscription } from '@/features/subscription/types';

const props = defineProps<{
    subscription: UserSubscription;
    disabled?: boolean;
}>();

const emit = defineEmits<{
    changePlan: [];
}>();

const { t, locale } = useI18n();

const statusClass = computed(() => `is-${props.subscription.status}`);
const startedAt = computed(() => formatSubscriptionDate(props.subscription.startedAt, locale.value));
const expiresAt = computed(() => formatSubscriptionDate(props.subscription.expiresAt, locale.value));
const canceledAt = computed(() => formatSubscriptionDate(props.subscription.canceledAt, locale.value));
</script>

<template>
    <AppGlassCard :title="t('subscriptionPage.overview.title')" :subtitle="t('subscriptionPage.overview.subtitle')">
        <template #icon>
            <CrownIcon :size="20" stroke-width="1.5" />
        </template>
        <template #actions>
            <button type="button" class="su-btn su-btn--ink" :disabled="disabled" @click="emit('changePlan')">
                {{ t('subscriptionPage.actions.changePlan') }}
            </button>
        </template>

        <div class="subscription-overview">
            <div class="subscription-overview__plan">
                <p class="subscription-overview__name">{{ subscription.plan.name }}</p>
                <span class="subscription-overview__status" :class="statusClass">
                    {{ t(`subscriptionPage.status.${subscription.status}`) }}
                </span>
            </div>
            <p v-if="subscription.plan.description" class="subscription-overview__description">
                {{ subscription.plan.description }}
            </p>
            <dl class="subscription-overview__dates">
                <div>
                    <dt>{{ t('subscriptionPage.overview.startedAt') }}</dt>
                    <dd>{{ startedAt }}</dd>
                </div>
                <div v-if="expiresAt">
                    <dt>{{ t('subscriptionPage.overview.expiresAt') }}</dt>
                    <dd>{{ expiresAt }}</dd>
                </div>
                <div v-if="canceledAt">
                    <dt>{{ t('subscriptionPage.overview.canceledAt') }}</dt>
                    <dd>{{ canceledAt }}</dd>
                </div>
            </dl>
        </div>
    </AppGlassCard>
</template>

<style scoped>
.subscription-overview {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.subscription-overview__plan {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.subscription-overview__name {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
}

.subscription-overview__status {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    background: var(--hair);
    color: var(--ink-muted);
}

.subscription-overview__status.is-active {
    background: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
}

.subscription-overview__status.is-pending {
    background: rgba(var(--v-theme-warning), 0.14);
    color: rgb(var(--v-theme-warning));
}

.subscription-overview__status.is-canceled,
.subscription-overview__status.is-expired {
    background: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
}

.subscription-overview__description {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.88rem;
}

.subscription-overview__dates {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 28px;
    margin: 6px 0 0;
}

.subscription-overview__dates dt {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-muted);
}

.subscription-overview__dates dd {
    margin: 2px 0 0;
    font-weight: 600;
    font-size: 0.9rem;
}
</style>
