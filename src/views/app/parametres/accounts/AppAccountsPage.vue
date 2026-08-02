<script setup lang="ts">
import { computed, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { AdjustmentsHorizontalIcon, BellIcon, LockIcon, UserCircleIcon } from 'vue-tabler-icons';
import { AccountTab, NotificationsTab, PreferencesTab, SecurityTab } from '@/features/user-settings';
import TabbedActionShell from '@/components/shared/TabbedActionShell.vue';

type AccountTabExpose = {
    saveProfile: () => Promise<void>;
    resetProfile: () => Promise<void>;
    loading: boolean;
};

type SettingsTabExpose = {
    saveSettings: () => void | Promise<void>;
    resetSettings: () => void;
    loading: boolean;
};

const { t } = useI18n();

const tab = ref('Account');
const accountTabRef = ref<AccountTabExpose | null>(null);
const preferencesTabRef = ref<SettingsTabExpose | null>(null);
const notificationsTabRef = ref<SettingsTabExpose | null>(null);
const securityTabRef = ref<SettingsTabExpose | null>(null);
const profileDirty = ref(false);
const preferencesDirty = ref(false);
const notificationsDirty = ref(false);
const securityDirty = ref(false);

const tabs = computed(() => [
    { value: 'Account', label: t('accounts.tabs.account'), icon: UserCircleIcon },
    { value: 'Preferences', label: t('accounts.tabs.preferences'), icon: AdjustmentsHorizontalIcon },
    { value: 'Notifications', label: t('accounts.tabs.notifications'), icon: BellIcon },
    { value: 'Security', label: t('accounts.tabs.security'), icon: LockIcon }
]);

const isAccountTab = computed(() => tab.value === 'Account');
const isPreferencesTab = computed(() => tab.value === 'Preferences');
const isNotificationsTab = computed(() => tab.value === 'Notifications');
const isSecurityTab = computed(() => tab.value === 'Security');
const isSettingsTab = computed(() => isPreferencesTab.value || isNotificationsTab.value || isSecurityTab.value);

const settingsDirty = computed(() => preferencesDirty.value || notificationsDirty.value || securityDirty.value);
const anyDirty = computed(() => profileDirty.value || settingsDirty.value);

const activeLoading = computed(() => {
    if (isAccountTab.value) return !!accountTabRef.value?.loading;
    if (isPreferencesTab.value) return !!preferencesTabRef.value?.loading;
    if (isNotificationsTab.value) return !!notificationsTabRef.value?.loading;
    if (isSecurityTab.value) return !!securityTabRef.value?.loading;
    return false;
});

const activeDirty = computed(() => {
    if (isAccountTab.value) return profileDirty.value;
    if (isSettingsTab.value) return settingsDirty.value;
    return false;
});

const saveLoading = computed(() => activeLoading.value);
const saveDisabled = computed(() => (!isAccountTab.value && !isSettingsTab.value) || saveLoading.value || !activeDirty.value);
const cancelDisabled = computed(() => (!isAccountTab.value && !isSettingsTab.value) || saveLoading.value || !activeDirty.value);

onBeforeRouteLeave((_to, _from, next) => {
    if (!anyDirty.value) {
        next();
        return;
    }
    const ok = window.confirm(t('accounts.leaveDirtyConfirm'));
    next(ok);
});

function onSave() {
    if (saveLoading.value || !activeDirty.value) return;
    if (isAccountTab.value) {
        void accountTabRef.value?.saveProfile();
        return;
    }
    if (isPreferencesTab.value) {
        void preferencesTabRef.value?.saveSettings();
        return;
    }
    if (isNotificationsTab.value) {
        void notificationsTabRef.value?.saveSettings();
        return;
    }
    if (isSecurityTab.value) {
        void securityTabRef.value?.saveSettings();
    }
}

function onCancel() {
    if (saveLoading.value || !activeDirty.value) return;
    if (isAccountTab.value) {
        void accountTabRef.value?.resetProfile();
        return;
    }
    if (isPreferencesTab.value) {
        preferencesTabRef.value?.resetSettings();
        return;
    }
    if (isNotificationsTab.value) {
        notificationsTabRef.value?.resetSettings();
        return;
    }
    if (isSecurityTab.value) {
        securityTabRef.value?.resetSettings();
    }
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
            <v-window-item value="Preferences">
                <PreferencesTab ref="preferencesTabRef" @dirty="preferencesDirty = $event" />
            </v-window-item>
            <v-window-item value="Notifications">
                <NotificationsTab ref="notificationsTabRef" @dirty="notificationsDirty = $event" />
            </v-window-item>
            <v-window-item value="Security">
                <SecurityTab ref="securityTabRef" @dirty="securityDirty = $event" />
            </v-window-item>
        </v-window>
    </TabbedActionShell>
</template>
