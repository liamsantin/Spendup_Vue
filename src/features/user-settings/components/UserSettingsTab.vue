<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { BellIcon, CheckIcon, LayoutDashboardIcon, LockIcon, PaletteIcon, ShieldLockIcon, WorldIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { CURRENCY_OPTIONS, LOCALE_OPTIONS, TIMEZONE_OPTIONS, USER_SETTINGS_DEFAULTS, type UserSettings } from '../types';
import { cloneSettings, settingsEqual } from '../mappers';
import { useUserSettingsStore } from '../stores/user-settings-store';
import { DAY_THEME_COLORS, NIGHT_THEME_COLORS, normalizeHex } from '../themeColorOptions';

const { t } = useI18n();
const store = useUserSettingsStore();

const draft = ref<UserSettings>(cloneSettings(USER_SETTINGS_DEFAULTS));
const baseline = ref<UserSettings | null>(null);
const localError = ref<string | null>(null);
const idleEnabled = ref(false);

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

const isDirty = computed(() => {
    if (!baseline.value) return false;
    return !settingsEqual(draft.value, baseline.value);
});

const saving = computed(() => store.saving);
const loading = computed(() => store.loading && !baseline.value);

watch(isDirty, (value) => emit('dirty', value), { immediate: true });

watch(
    () => draft.value.idleLogoutMinutes,
    (value) => {
        idleEnabled.value = value != null;
    }
);

const visibilityItems = computed(() => [
    { title: t('userSettings.privacy.visibility.public'), value: 'public' },
    { title: t('userSettings.privacy.visibility.friends'), value: 'friends' },
    { title: t('userSettings.privacy.visibility.private'), value: 'private' }
]);

const friendRequestItems = computed(() => [
    { title: t('userSettings.privacy.friendRequests.everyone'), value: 'everyone' },
    { title: t('userSettings.privacy.friendRequests.friendsOfFriends'), value: 'friends_of_friends' },
    { title: t('userSettings.privacy.friendRequests.friends'), value: 'friends' },
    { title: t('userSettings.privacy.friendRequests.nobody'), value: 'nobody' }
]);

const digestItems = computed(() => [
    { title: t('userSettings.notifications.digest.off'), value: 'off' },
    { title: t('userSettings.notifications.digest.daily'), value: 'daily' },
    { title: t('userSettings.notifications.digest.weekly'), value: 'weekly' }
]);

const localeItems = computed(() => LOCALE_OPTIONS.map((item) => ({ title: t(item.labelKey), value: item.value })));

const currencyItems = computed(() => CURRENCY_OPTIONS.map((value) => ({ title: value, value })));

const firstDayItems = computed(() =>
    [0, 1, 2, 3, 4, 5, 6].map((value) => ({
        title: t(`userSettings.regional.firstDay.${value}`),
        value
    }))
);

const dashboardViewItems = computed(() => [
    { title: t('userSettings.dashboard.views.overview'), value: 'overview' },
    { title: t('userSettings.dashboard.views.budget'), value: 'budget' },
    { title: t('userSettings.dashboard.views.transactions'), value: 'transactions' }
]);

function hydrateFromStore() {
    const source = store.settings ? cloneSettings(store.settings) : cloneSettings(USER_SETTINGS_DEFAULTS);
    draft.value = source;
    baseline.value = cloneSettings(source);
    idleEnabled.value = source.idleLogoutMinutes != null;
    localError.value = null;
}

async function bootstrap() {
    try {
        await store.ensureLoaded();
        hydrateFromStore();
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        hydrateFromStore();
    }
}

onMounted(() => {
    void bootstrap();
});

function onIdleToggle(enabled: boolean | null) {
    const on = !!enabled;
    idleEnabled.value = on;
    draft.value.idleLogoutMinutes = on ? (draft.value.idleLogoutMinutes ?? 30) : null;
}

async function saveSettings() {
    if (saving.value || !isDirty.value) return;
    localError.value = null;
    try {
        await store.save(cloneSettings(draft.value));
        hydrateFromStore();
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function resetSettings() {
    if (!baseline.value || saving.value) return;
    draft.value = cloneSettings(baseline.value);
    idleEnabled.value = baseline.value.idleLogoutMinutes != null;
    localError.value = null;
}

defineExpose({
    saveSettings,
    resetSettings,
    get loading() {
        return saving.value || loading.value;
    },
    get isDirty() {
        return isDirty.value;
    }
});
</script>

<template>
    <div class="user-settings-tab">
        <div v-if="loading" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate color="primary" size="36" />
        </div>

        <v-row v-else class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-2">
                <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
                    {{ localError }}
                </AppAlert>
            </v-col>

            <!-- Privacy -->
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <ShieldLockIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div>
                                <h4 class="text-h4 mb-0">{{ t('userSettings.privacy.title') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('userSettings.privacy.subtitle') }}
                                </div>
                            </div>
                        </div>
                        <v-row dense class="mt-4">
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.privacy.profileVisibility') }}</v-label>
                                <v-select
                                    v-model="draft.profileVisibility"
                                    :items="visibilityItems"
                                    item-title="title"
                                    item-value="value"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.privacy.profilePictureVisibility') }}</v-label>
                                <v-select
                                    v-model="draft.profilePictureVisibility"
                                    :items="visibilityItems"
                                    item-title="title"
                                    item-value="value"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.privacy.friendRequestsFrom') }}</v-label>
                                <v-select
                                    v-model="draft.friendRequestsFrom"
                                    :items="friendRequestItems"
                                    item-title="title"
                                    item-value="value"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12" md="6" class="d-flex align-center">
                                <v-switch
                                    v-model="draft.discoverableInSearch"
                                    color="primary"
                                    hide-details
                                    :label="t('userSettings.privacy.discoverableInSearch')"
                                />
                            </v-col>
                        </v-row>
                    </v-card-item>
                </v-card>
            </v-col>

            <!-- Notifications -->
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <BellIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div>
                                <h4 class="text-h4 mb-0">{{ t('userSettings.notifications.title') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('userSettings.notifications.subtitle') }}
                                </div>
                            </div>
                        </div>
                        <div class="mt-4">
                            <h6 class="text-h6 mb-2">{{ t('userSettings.notifications.emailSection') }}</h6>
                            <v-switch
                                v-model="draft.emailSecurityAlerts"
                                color="primary"
                                hide-details
                                class="mb-2"
                                :label="t('userSettings.notifications.emailSecurityAlerts')"
                            />
                            <v-switch
                                v-model="draft.emailFriendRequest"
                                color="primary"
                                hide-details
                                class="mb-2"
                                :label="t('userSettings.notifications.emailFriendRequest')"
                            />
                            <v-switch
                                v-model="draft.emailFinancialAlerts"
                                color="primary"
                                hide-details
                                class="mb-4"
                                :label="t('userSettings.notifications.emailFinancialAlerts')"
                            />

                            <h6 class="text-h6 mb-2">{{ t('userSettings.notifications.pushSection') }}</h6>
                            <v-switch
                                v-model="draft.pushNotifications"
                                color="primary"
                                hide-details
                                class="mb-2"
                                :label="t('userSettings.notifications.pushNotifications')"
                            />
                            <v-switch
                                v-model="draft.pushSecurityAlerts"
                                color="primary"
                                hide-details
                                class="mb-2"
                                :label="t('userSettings.notifications.pushSecurityAlerts')"
                            />
                            <v-switch
                                v-model="draft.pushFriendRequest"
                                color="primary"
                                hide-details
                                class="mb-2"
                                :label="t('userSettings.notifications.pushFriendRequest')"
                            />
                            <v-switch
                                v-model="draft.pushFinancialAlerts"
                                color="primary"
                                hide-details
                                class="mb-4"
                                :label="t('userSettings.notifications.pushFinancialAlerts')"
                            />

                            <v-label class="mb-2 font-weight-medium">{{ t('userSettings.notifications.digestFrequency') }}</v-label>
                            <v-select
                                v-model="draft.notificationDigestFrequency"
                                :items="digestItems"
                                item-title="title"
                                item-value="value"
                                variant="outlined"
                                hide-details
                            />
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <!-- Security -->
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <LockIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div>
                                <h4 class="text-h4 mb-0">{{ t('userSettings.security.title') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('userSettings.security.subtitle') }}
                                </div>
                            </div>
                        </div>
                        <v-row dense class="mt-4">
                            <v-col cols="12">
                                <v-switch
                                    :model-value="idleEnabled"
                                    color="primary"
                                    hide-details
                                    :label="t('userSettings.security.idleLogoutEnabled')"
                                    @update:model-value="onIdleToggle"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.security.idleLogoutMinutes') }}</v-label>
                                <v-text-field
                                    v-model.number="draft.idleLogoutMinutes"
                                    type="number"
                                    min="5"
                                    max="10080"
                                    variant="outlined"
                                    hide-details
                                    :disabled="!idleEnabled"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{
                                    t('userSettings.security.trustedDeviceDurationDays')
                                }}</v-label>
                                <v-text-field
                                    v-model.number="draft.trustedDeviceDurationDays"
                                    type="number"
                                    min="1"
                                    max="365"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-switch
                                    v-model="draft.require2faForSensitiveActions"
                                    color="primary"
                                    hide-details
                                    :label="t('userSettings.security.require2faForSensitiveActions')"
                                />
                            </v-col>
                        </v-row>
                    </v-card-item>
                </v-card>
            </v-col>

            <!-- Regional -->
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <WorldIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div>
                                <h4 class="text-h4 mb-0">{{ t('userSettings.regional.title') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('userSettings.regional.subtitle') }}
                                </div>
                            </div>
                        </div>
                        <v-row dense class="mt-4">
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.locale') }}</v-label>
                                <v-select
                                    v-model="draft.locale"
                                    :items="localeItems"
                                    item-title="title"
                                    item-value="value"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.timezone') }}</v-label>
                                <v-select v-model="draft.timezone" :items="TIMEZONE_OPTIONS" variant="outlined" hide-details />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.defaultCurrency') }}</v-label>
                                <v-select
                                    v-model="draft.defaultCurrency"
                                    :items="currencyItems"
                                    item-title="title"
                                    item-value="value"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.regional.firstDayOfWeek') }}</v-label>
                                <v-select
                                    v-model="draft.firstDayOfWeek"
                                    :items="firstDayItems"
                                    item-title="title"
                                    item-value="value"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                        </v-row>
                    </v-card-item>
                </v-card>
            </v-col>

            <!-- Theme colors (day / night) — presets only -->
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <PaletteIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div>
                                <h4 class="text-h4 mb-0">{{ t('userSettings.themeColors.title') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('userSettings.themeColors.subtitle') }}
                                </div>
                            </div>
                        </div>

                        <h6 class="text-h6 mt-4 mb-5">{{ t('userSettings.themeColors.day') }}</h6>
                        <v-item-group
                            :model-value="normalizeHex(draft.themeColor)"
                            mandatory
                            class="ml-n2 v-row"
                            @update:model-value="draft.themeColor = String($event)"
                        >
                            <v-col v-for="color in DAY_THEME_COLORS" :key="color.id" cols="4" sm="2" class="pa-2">
                                <v-item v-slot="{ isSelected, toggle }" :value="normalizeHex(color.hex)">
                                    <v-sheet
                                        rounded="md"
                                        class="border cursor-pointer d-block text-center px-5 py-4 hover-btns"
                                        elevation="9"
                                        @click="toggle"
                                    >
                                        <v-avatar :class="color.bg" size="25">
                                            <CheckIcon v-if="isSelected" color="white" size="18" />
                                        </v-avatar>
                                    </v-sheet>
                                </v-item>
                            </v-col>
                        </v-item-group>

                        <h6 class="text-h6 mt-8 mb-5">{{ t('userSettings.themeColors.night') }}</h6>
                        <v-item-group
                            :model-value="normalizeHex(draft.themeDarkColor)"
                            mandatory
                            class="ml-n2 v-row"
                            @update:model-value="draft.themeDarkColor = String($event)"
                        >
                            <v-col v-for="color in NIGHT_THEME_COLORS" :key="color.id" cols="4" sm="2" class="pa-2">
                                <v-item v-slot="{ isSelected, toggle }" :value="normalizeHex(color.hex)">
                                    <v-sheet
                                        rounded="md"
                                        class="border cursor-pointer d-block text-center px-5 py-4 hover-btns"
                                        elevation="9"
                                        @click="toggle"
                                    >
                                        <v-avatar :class="color.bg" size="25">
                                            <CheckIcon v-if="isSelected" color="white" size="18" />
                                        </v-avatar>
                                    </v-sheet>
                                </v-item>
                            </v-col>
                        </v-item-group>
                    </v-card-item>
                </v-card>
            </v-col>

            <!-- Dashboard -->
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <LayoutDashboardIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div>
                                <h4 class="text-h4 mb-0">{{ t('userSettings.dashboard.title') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('userSettings.dashboard.subtitle') }}
                                </div>
                            </div>
                        </div>
                        <v-row dense class="mt-4">
                            <v-col cols="12" md="6">
                                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.dashboard.defaultView') }}</v-label>
                                <v-select
                                    v-model="draft.defaultDashboardView"
                                    :items="dashboardViewItems"
                                    item-title="title"
                                    item-value="value"
                                    variant="outlined"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12" md="6" class="d-flex flex-column justify-center">
                                <v-switch
                                    v-model="draft.showBalanceOnDashboard"
                                    color="primary"
                                    hide-details
                                    class="mb-2"
                                    :label="t('userSettings.dashboard.showBalance')"
                                />
                                <v-switch
                                    v-model="draft.hideSensitiveAmounts"
                                    color="primary"
                                    hide-details
                                    :label="t('userSettings.dashboard.hideSensitiveAmounts')"
                                />
                            </v-col>
                        </v-row>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.user-settings-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
