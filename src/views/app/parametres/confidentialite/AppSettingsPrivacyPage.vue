<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { EyeOffIcon } from 'vue-tabler-icons';
import { PrivacyTab, useSettingsFormPage } from '@/features/user-settings';
import AppSettingsFormPage from '@/views/app/parametres/AppSettingsFormPage.vue';

const { t } = useI18n();
const { tabRef, dirty, loading, onSave, onCancel, onDiscard } = useSettingsFormPage();
</script>

<template>
    <AppSettingsFormPage
        :title="t('accounts.tabs.privacy')"
        :subtitle="t('accounts.pages.privacy.subtitle')"
        :icon="EyeOffIcon"
        :dirty="dirty"
        :loading="loading"
        @save="onSave"
        @cancel="onCancel"
        @discard="onDiscard"
    >
        <PrivacyTab ref="tabRef" @dirty="dirty = $event" />
    </AppSettingsFormPage>
</template>
