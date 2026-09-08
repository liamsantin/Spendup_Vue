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
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-2">
                <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
                    {{ localError }}
                </AppAlert>
                <AppAlert v-if="successMessage" type="success" class="mb-4" closable :dismiss-ms="6000" @dismiss="successMessage = null">
                    {{ successMessage }}
                </AppAlert>
            </v-col>

            <v-col v-if="loading" cols="12" md="9">
                <div class="su-loading"><span class="su-spin" /></div>
            </v-col>

            <template v-else-if="store.subscription">
                <v-col cols="12" md="9" class="pb-4">
                    <SubscriptionOverviewCard :subscription="store.subscription" :disabled="store.changing" @change-plan="openSelector" />
                </v-col>
                <v-col cols="12" md="9" class="pb-4">
                    <SubscriptionFeaturesCard :features="store.subscription.plan.features" />
                </v-col>
                <v-col cols="12" md="9">
                    <SubscriptionQuotasCard :rows="store.quotaRows" />
                </v-col>
            </template>

            <v-col v-else cols="12" md="9">
                <div class="su-empty">
                    <p class="mb-3">{{ t('subscriptionPage.empty') }}</p>
                    <button type="button" class="su-btn su-btn--ghost" @click="load(true)">{{ t('common.retry') }}</button>
                </div>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.subscription-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
