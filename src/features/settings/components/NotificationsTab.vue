<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BellIcon } from 'vue-tabler-icons';

const { t } = useI18n();

/** Exemple local — non branché API. */
const emailDigestEnabled = ref(true);
</script>

<template>
    <div class="notifications-tab">
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <BellIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div>
                                <h4 class="text-h4 mb-0">{{ t('accounts.notifications.example.title') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('accounts.notifications.example.subtitle') }}
                                </div>
                            </div>
                        </div>

                        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mt-6">
                            <div class="pr-4">
                                <h6 class="text-h6 mb-1">{{ t('accounts.notifications.example.itemTitle') }}</h6>
                                <div class="text-subtitle-1 text-medium-emphasis">
                                    {{ t('accounts.notifications.example.itemSubtitle') }}
                                </div>
                            </div>
                            <v-switch v-model="emailDigestEnabled" color="primary" hide-details class="flex-shrink-0" />
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.notifications-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
