<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserCircleIcon, BellIcon, LockIcon } from 'vue-tabler-icons';
import { AccountTab, NotificationTab, SecurityTab } from '@/features/settings';
import TabbedActionShell from '@/components/shared/TabbedActionShell.vue';

type AccountTabExpose = {
    saveProfile: () => Promise<void>;
    resetProfile: () => Promise<void>;
    loading: boolean;
};

const tab = ref('Account');
const accountTabRef = ref<AccountTabExpose | null>(null);
const profileDirty = ref(false);
const { t } = useI18n();

const tabs = computed(() => [
    { value: 'Account', label: t('accounts.tabs.account'), icon: UserCircleIcon },
    { value: 'Notification', label: t('accounts.tabs.notification'), icon: BellIcon },
    { value: 'Security', label: t('accounts.tabs.security'), icon: LockIcon }
]);

const isAccountTab = computed(() => tab.value === 'Account');
const saveLoading = computed(() => !!accountTabRef.value?.loading);
const saveDisabled = computed(() => !isAccountTab.value || saveLoading.value || !profileDirty.value);
const cancelDisabled = computed(() => !isAccountTab.value || saveLoading.value || !profileDirty.value);

function onSave() {
    if (!isAccountTab.value || !accountTabRef.value || saveLoading.value) return;
    accountTabRef.value.saveProfile();
}

function onCancel() {
    if (!isAccountTab.value || !accountTabRef.value || saveLoading.value) return;
    accountTabRef.value.resetProfile();
}
</script>

<template>
    <TabbedActionShell
        v-model="tab"
        :tabs="tabs"
        :save-disabled="saveDisabled"
        :cancel-disabled="cancelDisabled"
        :save-loading="saveLoading"
        @save="onSave"
        @cancel="onCancel"
    >
        <v-window v-model="tab">
            <v-window-item value="Account">
                <AccountTab ref="accountTabRef" @dirty="profileDirty = $event" />
            </v-window-item>
            <v-window-item value="Notification">
                <NotificationTab />
            </v-window-item>
            <v-window-item value="Security">
                <SecurityTab />
            </v-window-item>
        </v-window>
    </TabbedActionShell>
</template>
