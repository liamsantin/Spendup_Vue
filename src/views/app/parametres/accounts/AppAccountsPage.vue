<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AdjustmentsHorizontalIcon, LockIcon, UserCircleIcon } from 'vue-tabler-icons';
import { AccountTab, SecurityTab } from '@/features/settings';
import { UserSettingsTab } from '@/features/user-settings';
import TabbedActionShell from '@/components/shared/TabbedActionShell.vue';

type AccountTabExpose = {
    saveProfile: () => Promise<void>;
    resetProfile: () => Promise<void>;
    loading: boolean;
};

type PreferencesTabExpose = {
    saveSettings: () => void | Promise<void>;
    resetSettings: () => void;
    loading: boolean;
};

const { t } = useI18n();

const tab = ref('Account');
const accountTabRef = ref<AccountTabExpose | null>(null);
const preferencesTabRef = ref<PreferencesTabExpose | null>(null);
const profileDirty = ref(false);
const preferencesDirty = ref(false);

const tabs = computed(() => [
    { value: 'Account', label: t('accounts.tabs.account'), icon: UserCircleIcon },
    { value: 'Preferences', label: t('accounts.tabs.preferences'), icon: AdjustmentsHorizontalIcon },
    { value: 'Security', label: t('accounts.tabs.security'), icon: LockIcon }
]);

const isAccountTab = computed(() => tab.value === 'Account');
const isPreferencesTab = computed(() => tab.value === 'Preferences');

const activeLoading = computed(() => {
    if (isAccountTab.value) return !!accountTabRef.value?.loading;
    if (isPreferencesTab.value) return !!preferencesTabRef.value?.loading;
    return false;
});

const activeDirty = computed(() => {
    if (isAccountTab.value) return profileDirty.value;
    if (isPreferencesTab.value) return preferencesDirty.value;
    return false;
});

const saveLoading = computed(() => activeLoading.value);
const saveDisabled = computed(() => (!isAccountTab.value && !isPreferencesTab.value) || saveLoading.value || !activeDirty.value);
const cancelDisabled = computed(() => (!isAccountTab.value && !isPreferencesTab.value) || saveLoading.value || !activeDirty.value);

function onSave() {
    if (saveLoading.value || !activeDirty.value) return;
    if (isAccountTab.value) {
        void accountTabRef.value?.saveProfile();
        return;
    }
    if (isPreferencesTab.value) {
        void preferencesTabRef.value?.saveSettings();
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
                <UserSettingsTab ref="preferencesTabRef" @dirty="preferencesDirty = $event" />
            </v-window-item>
            <v-window-item value="Security">
                <SecurityTab />
            </v-window-item>
        </v-window>
    </TabbedActionShell>
</template>
