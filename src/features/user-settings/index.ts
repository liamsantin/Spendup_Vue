export { userSettingsApi } from '@/features/user-settings/api';
export { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';
export {
    SETTINGS_PATHS,
    isLegacySettingsPath,
    rewriteLegacySettingsLink,
    resolveLegacySettingsRedirect
} from '@/features/user-settings/settings-paths';
export type { UserSettings, UserSettingsPatch } from '@/features/user-settings/types';
export { localeToAppLocale, applyUserSettingsToRuntime, normalizeSecuritySettings, diffSettings } from '@/features/user-settings/mappers';
export {
    USER_SETTINGS_DEFAULTS,
    IDLE_LOGOUT_MINUTES_MIN,
    IDLE_LOGOUT_MINUTES_MAX,
    IDLE_LOGOUT_MINUTES_DEFAULT,
    TRUSTED_DEVICE_DAYS_MIN,
    TRUSTED_DEVICE_DAYS_MAX
} from '@/features/user-settings/types';

export { default as AccountTab } from '@/features/user-settings/components/AccountTab.vue';
export { default as PreferencesTab } from '@/features/user-settings/components/PreferencesTab.vue';
export { default as NotificationsTab } from '@/features/user-settings/components/NotificationsTab.vue';
export { default as SecurityTab } from '@/features/user-settings/components/SecurityTab.vue';
export { default as TwoFactorSetupDialog } from '@/features/user-settings/components/security/TwoFactorSetupDialog.vue';
export { default as TwoFactorDisableDialog } from '@/features/user-settings/components/security/TwoFactorDisableDialog.vue';
export { useSettingsFormPage } from '@/features/user-settings/composables/useSettingsFormPage';
