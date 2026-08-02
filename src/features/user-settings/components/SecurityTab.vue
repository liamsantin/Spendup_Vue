<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { USER_SETTINGS_DEFAULTS, type UserSettings } from '../types';
import { cloneSettings, settingsEqualKeys, USER_SETTINGS_SECURITY_KEYS, withSecurityFrom } from '../mappers';
import { useUserSettingsStore } from '../stores/user-settings-store';
import SecurityTwoFactorCard from './security/SecurityTwoFactorCard.vue';
import SecuritySessionCard from './security/SecuritySessionCard.vue';
import SecurityDevicesCard from './security/SecurityDevicesCard.vue';
import TwoFactorSetupDialog from './security/TwoFactorSetupDialog.vue';
import TwoFactorDisableDialog from './security/TwoFactorDisableDialog.vue';

const auth = useAuthStore();
const store = useUserSettingsStore();
const { t } = useI18n();

const setupOpen = ref(false);
const disableOpen = ref(false);
const successMessage = ref<string | null>(null);
const localError = ref<string | null>(null);

const draft = ref<UserSettings>(cloneSettings(USER_SETTINGS_DEFAULTS));
const baseline = ref<UserSettings | null>(null);

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

const twoFactorEnabled = computed(() => !!auth.user?.twoFactorEnabled);
const isDirty = computed(() => {
    if (!baseline.value) return false;
    return !settingsEqualKeys(draft.value, baseline.value, USER_SETTINGS_SECURITY_KEYS);
});
const saving = computed(() => store.saving);
const loading = computed(() => store.loading && !baseline.value);

watch(isDirty, (value) => emit('dirty', value), { immediate: true });

function hydrateFromStore() {
    const source = store.settings ? cloneSettings(store.settings) : cloneSettings(USER_SETTINGS_DEFAULTS);
    draft.value = source;
    baseline.value = cloneSettings(source);
    localError.value = null;
}

async function bootstrap() {
    if (!auth.user) {
        await auth.fetchMe();
    }
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

function openSetup() {
    successMessage.value = null;
    setupOpen.value = true;
}

function openDisable() {
    successMessage.value = null;
    disableOpen.value = true;
}

function onEnabled() {
    successMessage.value = t('security.twoFactor.success.enabled');
}

function onDisabled() {
    successMessage.value = t('security.twoFactor.success.disabled');
}

function onDevicesSuccess(message: string) {
    successMessage.value = message;
}

async function saveSettings() {
    if (saving.value || !isDirty.value) return;
    localError.value = null;
    try {
        const base = store.settings ? cloneSettings(store.settings) : cloneSettings(USER_SETTINGS_DEFAULTS);
        await store.save(withSecurityFrom(base, draft.value));
        hydrateFromStore();
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function resetSettings() {
    if (!baseline.value || saving.value) return;
    draft.value = withSecurityFrom(draft.value, baseline.value);
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
    <div class="security-tab">
        <div v-if="loading" class="d-flex justify-center py-10">
            <v-progress-circular indeterminate color="primary" size="36" />
        </div>

        <v-row v-else class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-2">
                <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
                    {{ localError }}
                </AppAlert>
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <SecurityTwoFactorCard
                    :enabled="twoFactorEnabled"
                    :success-message="successMessage"
                    @enable="openSetup"
                    @disable="openDisable"
                    @dismiss-success="successMessage = null"
                />
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <SecurityDevicesCard @success="onDevicesSuccess" />
            </v-col>

            <v-col cols="12" md="9">
                <SecuritySessionCard v-model="draft" />
            </v-col>
        </v-row>

        <TwoFactorSetupDialog v-model="setupOpen" @enabled="onEnabled" />
        <TwoFactorDisableDialog v-model="disableOpen" @disabled="onDisabled" />
    </div>
</template>

<style scoped>
.security-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
