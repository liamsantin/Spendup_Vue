<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import SecurityTwoFactorCard from './security/SecurityTwoFactorCard.vue';
import SecuritySessionCard from './security/SecuritySessionCard.vue';
import SecurityDevicesCard from './security/SecurityDevicesCard.vue';
import TwoFactorSetupDialog from './security/TwoFactorSetupDialog.vue';
import TwoFactorDisableDialog from './security/TwoFactorDisableDialog.vue';

const auth = useAuthStore();
const { t } = useI18n();

const setupOpen = ref(false);
const disableOpen = ref(false);
const successMessage = ref<string | null>(null);

const twoFactorEnabled = computed(() => !!auth.user?.twoFactorEnabled);

onMounted(async () => {
    if (!auth.user) {
        await auth.fetchMe();
    }
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
</script>

<template>
    <div class="security-tab">
        <v-row class="justify-center py-1" no-gutters>
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
                <SecuritySessionCard />
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
