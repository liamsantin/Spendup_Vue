<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { CrownIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { SubscriptionTab } from '@/features/subscription';

const { t } = useI18n();
</script>

<template>
    <AppPageShell :title="t('accounts.tabs.subscription')" :subtitle="t('accounts.pages.subscription.subtitle')" :icon="CrownIcon">
        <SubscriptionTab />
    </AppPageShell>
</template>
