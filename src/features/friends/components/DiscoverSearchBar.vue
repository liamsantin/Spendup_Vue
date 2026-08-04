<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useFriendsStore } from '../stores/friends-store';

const { t } = useI18n();
const store = useFriendsStore();
</script>

<template>
    <v-text-field
        v-model="store.searchQuery"
        class="mt-2 mb-1"
        :label="t('friendsPage.discover.searchLabel')"
        :hint="t('friendsPage.discover.searchHint')"
        persistent-hint
        prepend-inner-icon="mdi-magnify"
        clearable
        @update:model-value="store.searchUsers(String($event || ''))"
        @click:clear="store.clearSearch()"
    />
</template>
