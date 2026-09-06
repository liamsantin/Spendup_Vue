<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { EyeIcon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
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
    <AppGlassCard :title="t('userSettings.privacy.title')" :subtitle="t('userSettings.privacy.subtitle')">
        <template #icon>
            <EyeIcon :size="20" stroke-width="1.5" />
        </template>
        <v-row>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.privacy.profileVisibility') }}</v-label>
                <AppSelect
                    v-model="draft.profileVisibility"
                    :items="visibilityItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.privacy.profileVisibility')"
                    hide-details
                />
            </v-col>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.privacy.profilePictureVisibility') }}</v-label>
                <AppSelect
                    v-model="draft.profilePictureVisibility"
                    :items="visibilityItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.privacy.profilePictureVisibility')"
                    hide-details
                />
            </v-col>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('userSettings.privacy.friendRequestsFrom') }}</v-label>
                <AppSelect
                    v-model="draft.friendRequestsFrom"
                    :items="friendRequestItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.privacy.friendRequestsFrom')"
                    hide-details
                />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-end">
                <v-switch
                    v-model="draft.discoverableInSearch"
                    color="primary"
                    hide-details
                    :label="t('userSettings.privacy.discoverableInSearch')"
                />
            </v-col>
        </v-row>
    </AppGlassCard>
</template>
