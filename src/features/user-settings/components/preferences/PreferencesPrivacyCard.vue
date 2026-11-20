<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
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
    <section class="su-settings">
        <div class="su-settings__lead">
            <h2>{{ t('userSettings.privacy.title') }}</h2>
            <p>{{ t('userSettings.privacy.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div class="su-field">
                <label class="su-field__label" for="pref-profile-visibility">{{ t('userSettings.privacy.profileVisibility') }}</label>
                <AppSelect
                    id="pref-profile-visibility"
                    v-model="draft.profileVisibility"
                    :items="visibilityItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.privacy.profileVisibility')"
                    hide-details
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="pref-picture-visibility">{{
                    t('userSettings.privacy.profilePictureVisibility')
                }}</label>
                <AppSelect
                    id="pref-picture-visibility"
                    v-model="draft.profilePictureVisibility"
                    :items="visibilityItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.privacy.profilePictureVisibility')"
                    hide-details
                />
            </div>
            <div class="su-field">
                <label class="su-field__label" for="pref-friend-requests">{{ t('userSettings.privacy.friendRequestsFrom') }}</label>
                <AppSelect
                    id="pref-friend-requests"
                    v-model="draft.friendRequestsFrom"
                    :items="friendRequestItems"
                    item-title="title"
                    item-value="value"
                    :label="t('userSettings.privacy.friendRequestsFrom')"
                    hide-details
                />
            </div>
            <div class="is-full">
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" for="pref-discoverable">{{
                            t('userSettings.privacy.discoverableInSearch')
                        }}</label>
                    </div>
                    <AppSwitch id="pref-discoverable" v-model="draft.discoverableInSearch" />
                </div>
            </div>
        </div>
    </section>
</template>
