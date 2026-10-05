<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { LockIcon } from 'vue-tabler-icons';
import { SecurityTab, useSettingsFormPage } from '@/features/user-settings';
import AppSettingsFormPage from '@/views/app/parametres/AppSettingsFormPage.vue';

const { t } = useI18n();
const { tabRef, dirty, loading, onSave, onCancel, onDiscard } = useSettingsFormPage();
</script>

<template>
    <AppSettingsFormPage
        :title="t('accounts.tabs.security')"
        :subtitle="t('accounts.pages.security.subtitle')"
        :icon="LockIcon"
        :dirty="dirty"
        :loading="loading"
        @save="onSave"
        @cancel="onCancel"
        @discard="onDiscard"
    >
        <SecurityTab ref="tabRef" @dirty="dirty = $event" />
    </AppSettingsFormPage>
</template>
