<script setup lang="ts">
/**
 * Host global du sélecteur de plan (monté une fois dans `FullLayout`).
 * Toute feature peut appeler `useSubscriptionStore().openPlanSelector(reason?)`.
 * Le retour « plan mis à jour » est porté par le store (`subscription`) : Settings > Abonnement réagit au changement.
 */
defineOptions({ name: 'PlanSelectorHost' });

import PlanSelectorModal from '@/features/subscription/components/PlanSelectorModal.vue';
</script>

<template>
    <PlanSelectorModal />
</template>
