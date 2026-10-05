<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserCircleIcon } from 'vue-tabler-icons';
import { AccountTab } from '@/features/user-settings';
import AppSettingsFormPage from '@/views/app/parametres/AppSettingsFormPage.vue';

type AccountTabExpose = {
    saveProfile: () => Promise<void>;
    resetProfile: () => Promise<void>;
    loading: boolean;
};

const { t } = useI18n();
const accountTabRef = ref<AccountTabExpose | null>(null);
const dirty = ref(false);

const loading = computed(() => !!accountTabRef.value?.loading);

function onSave() {
    if (loading.value || !dirty.value) return;
    void accountTabRef.value?.saveProfile();
}

function onCancel() {
    if (loading.value || !dirty.value) return;
    void accountTabRef.value?.resetProfile();
}
</script>

<template>
    <AppSettingsFormPage
        :title="t('accounts.tabs.account')"
        :subtitle="t('accounts.pages.account.subtitle')"
        :icon="UserCircleIcon"
        :dirty="dirty"
        :loading="loading"
        @save="onSave"
        @cancel="onCancel"
    >
        <AccountTab ref="accountTabRef" @dirty="dirty = $event" />
    </AppSettingsFormPage>
</template>
