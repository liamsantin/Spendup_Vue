<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useUserSettingsStore } from '../stores/user-settings-store';
import SecurityTwoFactorCard from './security/SecurityTwoFactorCard.vue';
import SecuritySessionCard from './security/SecuritySessionCard.vue';
import SecurityDevicesCard from './security/SecurityDevicesCard.vue';
import TwoFactorSetupDialog from './security/TwoFactorSetupDialog.vue';
import TwoFactorDisableDialog from './security/TwoFactorDisableDialog.vue';

const auth = useAuthStore();
const store = useUserSettingsStore();
const { draft, isDirty, draftReady, saving } = storeToRefs(store);
const { t } = useI18n();

const setupOpen = ref(false);
const disableOpen = ref(false);
const successMessage = ref<string | null>(null);
const localError = ref<string | null>(null);

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

const twoFactorEnabled = computed(() => !!auth.user?.twoFactorEnabled);
const loading = computed(() => !draftReady.value);

watch(isDirty, (value) => emit('dirty', value), { immediate: true });

async function bootstrap() {
    if (!auth.user) {
        await auth.fetchMe();
    }
    try {
        await store.ensureLoaded();
        localError.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
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
        await store.saveDraft();
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function resetSettings() {
    if (saving.value || !isDirty.value) return;
    store.resetDraft();
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
        <v-row class="justify-center py-1" no-gutters>
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
                <div v-if="loading" class="d-flex justify-center py-6">
                    <v-progress-circular indeterminate color="primary" size="28" />
                </div>
                <SecuritySessionCard v-else v-model="draft" :two-factor-enabled="twoFactorEnabled" />
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
