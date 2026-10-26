<script setup lang="ts">
/**
 * Settings > Abonnement — lecture seule : plan courant, features incluses, quotas.
 * Le changement de plan passe par `PlanSelectorModal` (host global, `openPlanSelector`).
 */
defineOptions({ name: 'SubscriptionTab' });

import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useSubscriptionStore } from '@/features/subscription/stores/subscription-store';
import SubscriptionOverviewCard from '@/features/subscription/components/SubscriptionOverviewCard.vue';
import SubscriptionFeaturesCard from '@/features/subscription/components/SubscriptionFeaturesCard.vue';
import SubscriptionQuotasCard from '@/features/subscription/components/SubscriptionQuotasCard.vue';

const { t } = useI18n();
const store = useSubscriptionStore();

const localError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const loading = computed(() => store.loading && !store.subscription);

async function load(force = false) {
    localError.value = null;
    try {
        await store.loadSubscription(force);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

onMounted(() => {
    void load();
});

function openSelector() {
    successMessage.value = null;
    store.openPlanSelector();
}

/** Retour du sélecteur (host global) : le plan courant a changé → confirmation visible sur Settings. */
watch(
    () => store.subscription?.plan.code ?? null,
    (code, previous) => {
        if (!code || !previous || code === previous) return;
        successMessage.value = t('subscriptionPage.changed', { name: store.subscription?.plan.name ?? code });
    }
);

defineExpose({ reload: load });
</script>

<template>
    <div class="subscription-tab">
        <div class="subscription-tab__sections">
            <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
                {{ localError }}
            </AppAlert>
            <AppAlert v-if="successMessage" type="success" class="su-alert" closable :dismiss-ms="6000" @dismiss="successMessage = null">
                {{ successMessage }}
            </AppAlert>

            <div v-if="loading" class="su-loading"><span class="su-spin" /></div>

            <template v-else-if="store.subscription">
                <SubscriptionOverviewCard :subscription="store.subscription" :disabled="store.changing" @change-plan="openSelector" />
                <SubscriptionFeaturesCard :features="store.subscription.plan.features" />
                <SubscriptionQuotasCard :rows="store.quotaRows" />
            </template>

            <div v-else class="su-empty">
                <p class="mb-3">{{ t('subscriptionPage.empty') }}</p>
                <button type="button" class="su-btn su-btn--ghost" @click="load(true)">{{ t('common.retry') }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.subscription-tab {
    max-width: 100%;
    overflow-x: hidden;
}

/* Les sections s’enchaînent sur leurs filets 2 px ; pas de grille Vuetify. */
.subscription-tab__sections {
    display: flex;
    flex-direction: column;
}
</style>
