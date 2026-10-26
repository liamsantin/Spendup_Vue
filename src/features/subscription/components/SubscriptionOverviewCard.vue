<script setup lang="ts">
defineOptions({ name: 'SubscriptionOverviewCard' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
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
    <section class="su-settings subscription-overview">
        <div class="su-settings__lead">
            <h2>{{ t('subscriptionPage.overview.title') }}</h2>
            <p>{{ t('subscriptionPage.overview.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <!-- Bloc plan : nom en chiffre clé 30 px 700, état en petit carré + texte, dates en lignes libellé / valeur. -->
            <div class="is-full subscription-overview__plan">
                <div class="su-fig subscription-overview__fig">
                    <p class="su-fig__label">{{ t('subscriptionPage.overview.title') }}</p>
                    <p class="su-fig__num">{{ subscription.plan.name }}</p>
                    <p class="su-fig__note">
                        <span class="su-chip subscription-overview__status" :class="statusClass">
                            {{ t(`subscriptionPage.status.${subscription.status}`) }}
                        </span>
                    </p>
                </div>
                <button type="button" class="su-btn su-btn--ink" :disabled="disabled" @click="emit('changePlan')">
                    {{ t('subscriptionPage.actions.changePlan') }}
                </button>
            </div>
            <p v-if="subscription.plan.description" class="is-full subscription-overview__description">
                {{ subscription.plan.description }}
            </p>
            <dl class="is-full subscription-overview__dates">
                <div class="su-kv">
                    <dt>{{ t('subscriptionPage.overview.startedAt') }}</dt>
                    <dd>{{ startedAt }}</dd>
                </div>
                <div v-if="expiresAt" class="su-kv">
                    <dt>{{ t('subscriptionPage.overview.expiresAt') }}</dt>
                    <dd>{{ expiresAt }}</dd>
                </div>
                <div v-if="canceledAt" class="su-kv">
                    <dt>{{ t('subscriptionPage.overview.canceledAt') }}</dt>
                    <dd>{{ canceledAt }}</dd>
                </div>
            </dl>
        </div>
    </section>
</template>

<style scoped>
.subscription-overview__plan {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px 24px;
}

.subscription-overview__fig {
    flex: 1 1 16ch;
    border-top: 0;
    padding-top: 0;
}

.subscription-overview__fig .su-fig__label {
    color: var(--gray);
}

.subscription-overview__fig .su-fig__num {
    white-space: normal;
}

/* état : bleu actif, violet en attente, rouge résilié / expiré — toujours accompagné du texte */
.subscription-overview__status {
    --chip-color: var(--gray);
}

.subscription-overview__status.is-active {
    --chip-color: var(--blue);
}

.subscription-overview__status.is-pending {
    --chip-color: var(--violet);
}

.subscription-overview__status.is-canceled,
.subscription-overview__status.is-expired {
    --chip-color: var(--danger);
}

.subscription-overview__description {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.45;
}

.subscription-overview__dates {
    margin: 0;
}

.subscription-overview__dates dt,
.subscription-overview__dates dd {
    margin: 0;
}
</style>
