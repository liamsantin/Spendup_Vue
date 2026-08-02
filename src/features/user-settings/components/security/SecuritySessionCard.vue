<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ClockHour4Icon } from 'vue-tabler-icons';
import type { UserSettings } from '../../types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

const idleEnabled = ref(false);

watch(
    () => draft.value.idleLogoutMinutes,
    (value) => {
        idleEnabled.value = value != null;
    },
    { immediate: true }
);

function onIdleToggle(enabled: boolean | null) {
    const on = !!enabled;
    idleEnabled.value = on;
    draft.value.idleLogoutMinutes = on ? (draft.value.idleLogoutMinutes ?? 30) : null;
}
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lightprimary">
                    <ClockHour4Icon class="text-primary" size="25" />
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
                    <v-label class="mb-2 font-weight-medium">{{ t('userSettings.security.trustedDeviceDurationDays') }}</v-label>
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
</template>
