<script setup lang="ts">
defineOptions({ name: 'SubscriptionFeaturesCard' });

import { useI18n } from 'vue-i18n';
import { ListCheckIcon } from 'vue-tabler-icons';
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import type { SubscriptionFeature } from '@/features/subscription/types';

defineProps<{
    features: SubscriptionFeature[];
}>();

const { t } = useI18n();
</script>

<template>
    <AppGlassCard :title="t('subscriptionPage.features.title')" :subtitle="t('subscriptionPage.features.subtitle')">
        <template #icon>
            <ListCheckIcon :size="20" stroke-width="1.5" />
        </template>

        <div v-if="!features.length" class="su-empty">{{ t('subscriptionPage.features.empty') }}</div>
        <ul v-else class="subscription-features" :aria-label="t('subscriptionPage.features.title')">
            <li v-for="feature in features" :key="feature.code" class="subscription-features__row">
                <AppCheckbox :model-value="true" disabled density="compact" class="subscription-features__check" :aria-hidden="true" />
                <div class="min-width-0">
                    <p class="subscription-features__name">{{ feature.name }}</p>
                    <p v-if="feature.description" class="subscription-features__description">{{ feature.description }}</p>
                </div>
            </li>
        </ul>
    </AppGlassCard>
</template>

<style scoped>
.subscription-features {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.subscription-features__row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
}

.subscription-features__check {
    flex: none;
    pointer-events: none;
}

.subscription-features__check :deep(.v-selection-control--disabled) {
    opacity: 1;
}

.subscription-features__name {
    margin: 6px 0 0;
    font-weight: 600;
    font-size: 0.9rem;
}

.subscription-features__description {
    margin: 1px 0 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
}
</style>
