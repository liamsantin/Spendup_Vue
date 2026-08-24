<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { EyeIcon } from 'vue-tabler-icons';
import type { UserSettings } from '@/features/user-settings/types';

const draft = defineModel<UserSettings>({ required: true });
const { t } = useI18n();

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
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lightprimary">
                    <EyeIcon class="text-primary" size="25" />
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
</template>
