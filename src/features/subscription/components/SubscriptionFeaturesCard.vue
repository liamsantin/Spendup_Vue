<script setup lang="ts">
defineOptions({ name: 'SubscriptionFeaturesCard' });

import { useI18n } from 'vue-i18n';
import { CheckIcon } from 'vue-tabler-icons';
import type { SubscriptionFeature } from '@/features/subscription/types';

defineProps<{
    features: SubscriptionFeature[];
}>();

const { t } = useI18n();
</script>

<template>
    <section class="su-settings subscription-features">
        <div class="su-settings__lead">
            <h2>{{ t('subscriptionPage.features.title') }}</h2>
            <p>{{ t('subscriptionPage.features.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div v-if="!features.length" class="is-full su-empty">{{ t('subscriptionPage.features.empty') }}</div>
            <!-- Liste sur filets fins : coche bleue, nom 700, description grise. -->
            <ul v-else class="is-full subscription-features__list" :aria-label="t('subscriptionPage.features.title')">
                <li v-for="feature in features" :key="feature.code" class="subscription-features__row">
                    <span class="subscription-features__mark" aria-hidden="true">
                        <CheckIcon :size="16" stroke-width="2.2" />
                    </span>
                    <div class="subscription-features__text">
                        <p class="subscription-features__name">{{ feature.name }}</p>
                        <p v-if="feature.description" class="subscription-features__description">{{ feature.description }}</p>
                    </div>
                </li>
            </ul>
        </div>
    </section>
</template>

<style scoped>
.subscription-features__list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.subscription-features__row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.subscription-features__row:first-child {
    border-top: 0;
    padding-top: 0;
}

.subscription-features__mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 20px;
    height: 20px;
    color: var(--blue-ink);
}

.subscription-features__text {
    min-width: 0;
}

.subscription-features__name {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
}

.subscription-features__description {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}
</style>
