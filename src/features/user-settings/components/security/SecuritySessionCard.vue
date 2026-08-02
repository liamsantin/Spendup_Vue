<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ClockHour4Icon } from 'vue-tabler-icons';

const { t } = useI18n();

/** Exemple local — non branché API / non appliqué. */
const idleEnabled = ref(false);
const idleLogoutMinutes = ref(30);
const trustedDeviceDurationDays = ref(30);
const require2faForSensitiveActions = ref(false);

function onIdleToggle(enabled: boolean | null) {
    idleEnabled.value = !!enabled;
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
                    <h4 class="text-h4 mb-0">{{ t('security.session.example.title') }}</h4>
                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                        {{ t('security.session.example.subtitle') }}
                    </div>
                </div>
            </div>
            <v-row dense class="mt-4">
                <v-col cols="12">
                    <v-switch
                        :model-value="idleEnabled"
                        color="primary"
                        hide-details
                        :label="t('security.session.example.idleLogoutEnabled')"
                        @update:model-value="onIdleToggle"
                    />
                </v-col>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('security.session.example.idleLogoutMinutes') }}</v-label>
                    <v-text-field
                        v-model.number="idleLogoutMinutes"
                        type="number"
                        min="5"
                        max="10080"
                        variant="outlined"
                        hide-details
                        :disabled="!idleEnabled"
                    />
                </v-col>
                <v-col cols="12" md="6">
                    <v-label class="mb-2 font-weight-medium">{{ t('security.session.example.trustedDeviceDurationDays') }}</v-label>
                    <v-text-field
                        v-model.number="trustedDeviceDurationDays"
                        type="number"
                        min="1"
                        max="365"
                        variant="outlined"
                        hide-details
                    />
                </v-col>
                <v-col cols="12">
                    <v-switch
                        v-model="require2faForSensitiveActions"
                        color="primary"
                        hide-details
                        :label="t('security.session.example.require2faForSensitiveActions')"
                    />
                </v-col>
            </v-row>
        </v-card-item>
    </v-card>
</template>
