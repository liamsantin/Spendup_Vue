<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { DeviceLaptopIcon, DeviceMobileIcon, DotsVerticalIcon } from 'vue-tabler-icons';
import { useAuthStore } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import TwoFactorSetupDialog from './TwoFactorSetupDialog.vue';
import TwoFactorDisableDialog from './TwoFactorDisableDialog.vue';

const auth = useAuthStore();

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
    successMessage.value = 'La double authentification est maintenant activée.';
}

function onDisabled() {
    successMessage.value = 'La double authentification a été désactivée.';
}
</script>

<template>
    <v-card elevation="10">
        <v-row class="ma-sm-n2 ma-n1">
            <v-col cols="12" md="8">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                            <h4 class="text-h4">Authentification à deux facteurs</h4>
                            <v-chip :color="twoFactorEnabled ? 'success' : 'default'" variant="tonal" size="small">
                                {{ twoFactorEnabled ? 'Activée' : 'Désactivée' }}
                            </v-chip>
                        </div>

                        <AppAlert
                            v-if="successMessage"
                            color="success"
                            variant="tonal"
                            density="default"
                            closable
                            :dismiss-ms="5000"
                            class="mt-4"
                            @dismiss="successMessage = null"
                        >
                            <template #prepend>
                                <v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon>
                            </template>
                            <div>{{ successMessage }}</div>
                        </AppAlert>

                        <div class="d-sm-flex justify-space-between mt-4 mb-8">
                            <div class="text-subtitle-1 text-medium-emphasis text-13 pr-5">
                                Ajoutez une couche de sécurité supplémentaire à votre compte en activant l’authentification à deux facteurs
                                via une application (TOTP).
                            </div>
                            <v-btn v-if="!twoFactorEnabled" color="primary" class="mt-sm-0 mt-3" flat @click="openSetup"> Activer </v-btn>
                            <v-btn v-else color="error" class="mt-sm-0 mt-3" variant="outlined" flat @click="openDisable">
                                Désactiver
                            </v-btn>
                        </div>

                        <v-divider></v-divider>

                        <div class="d-flex justify-space-between my-4">
                            <div>
                                <h6 class="text-h6 mb-1">Autre e-mail</h6>
                                <h5 class="text-subtitle-1 text-medium-emphasis">Non disponible pour le moment</h5>
                            </div>
                            <v-btn class="bg-lightprimary text-primary" flat disabled>Bientôt</v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="4">
                <v-card elevation="10">
                    <v-card-item>
                        <v-avatar size="48" class="" rounded="md" color="lightprimary">
                            <DeviceLaptopIcon class="text-primary" size="25" />
                        </v-avatar>
                        <h5 class="text-h5 mt-4">Appareils</h5>
                        <div class="text-subtitle-1 mt-3 text-medium-emphasis text-10">Gérez les appareils connectés à votre compte.</div>
                        <v-btn color="primary" class="mt-4" flat disabled>Déconnecter tous les appareils</v-btn>
                        <div class="mt-sm-8 mt-5">
                            <div class="d-flex align-center my-4">
                                <v-avatar size="30" rounded="md" color="surface">
                                    <DeviceMobileIcon size="25" />
                                </v-avatar>
                                <div class="ml-3 pr-3">
                                    <h6 class="text-h6 mb-1">iPhone 14</h6>
                                    <h5 class="text-subtitle-1 text-medium-emphasis">Paris FR, 23 oct. à 01:15</h5>
                                </div>
                                <v-btn size="30" icon variant="flat" class="lightprimary ml-auto" disabled>
                                    <v-avatar size="20">
                                        <DotsVerticalIcon />
                                    </v-avatar>
                                </v-btn>
                            </div>
                            <v-divider></v-divider>
                            <div class="d-flex align-center my-4">
                                <v-avatar size="30" rounded="md" color="surface">
                                    <DeviceLaptopIcon size="25" />
                                </v-avatar>
                                <div class="ml-3 pr-3">
                                    <h6 class="text-h6 mb-1">MacBook Air</h6>
                                    <h5 class="text-subtitle-1 text-medium-emphasis">Lyon FR, 24 oct. à 03:15</h5>
                                </div>
                                <v-btn size="30" icon variant="flat" class="lightprimary ml-auto" disabled>
                                    <v-avatar size="20">
                                        <DotsVerticalIcon />
                                    </v-avatar>
                                </v-btn>
                            </div>
                        </div>
                        <v-btn class="bg-lightprimary text-primary mt-5" block flat disabled>Besoin d’aide ?</v-btn>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>

        <TwoFactorSetupDialog v-model="setupOpen" @enabled="onEnabled" />
        <TwoFactorDisableDialog v-model="disableOpen" @disabled="onDisabled" />
    </v-card>
</template>
