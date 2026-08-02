<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ShieldCheckIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';

defineProps<{
    enabled: boolean;
    successMessage: string | null;
}>();

const emit = defineEmits<{
    enable: [];
    disable: [];
    dismissSuccess: [];
}>();

const { t } = useI18n();
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                <div class="d-flex align-center ga-3 flex-wrap">
                    <v-avatar size="48" rounded="md" color="lightprimary">
                        <ShieldCheckIcon class="text-primary" size="25" />
                    </v-avatar>
                    <h4 class="text-h4 mb-0">{{ t('security.twoFactor.title') }}</h4>
                </div>
                <v-chip :color="enabled ? 'success' : 'default'" variant="tonal" size="small">
                    {{ enabled ? t('security.twoFactor.status.enabled') : t('security.twoFactor.status.disabled') }}
                </v-chip>
            </div>
            <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                {{ t('security.twoFactor.subtitle') }}
            </div>

            <AppAlert
                v-if="successMessage"
                color="success"
                variant="tonal"
                density="default"
                closable
                :dismiss-ms="5000"
                class="mt-4"
                @dismiss="emit('dismissSuccess')"
            >
                <template #prepend>
                    <v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon>
                </template>
                <div>{{ successMessage }}</div>
            </AppAlert>

            <div class="d-sm-flex justify-space-between align-sm-center mt-4 mb-8">
                <div class="text-subtitle-1 text-medium-emphasis text-13 pr-5">
                    {{ t('security.twoFactor.description') }}
                </div>
                <v-btn v-if="!enabled" color="primary" class="mt-sm-0 mt-3" flat @click="emit('enable')">
                    {{ t('security.twoFactor.enable') }}
                </v-btn>
                <v-btn v-else color="error" class="mt-sm-0 mt-3" variant="outlined" flat @click="emit('disable')">
                    {{ t('security.twoFactor.disable') }}
                </v-btn>
            </div>

            <v-divider />

            <div class="d-flex justify-space-between align-center flex-wrap ga-3 my-4">
                <div>
                    <h6 class="text-h6 mb-1">{{ t('security.twoFactor.otherEmail.title') }}</h6>
                    <h5 class="text-subtitle-1 text-medium-emphasis">{{ t('security.twoFactor.otherEmail.subtitle') }}</h5>
                </div>
                <v-btn class="bg-lightprimary text-primary" flat disabled>{{ t('security.twoFactor.otherEmail.soon') }}</v-btn>
            </div>
        </v-card-item>
    </v-card>
</template>
