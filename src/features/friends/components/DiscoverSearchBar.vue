<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFriendsStore } from '../stores/friends-store';

const { t } = useI18n();
const store = useFriendsStore();

watch(
    () => store.searchQuery,
    (value) => {
        if (value.trim().length < 2) {
            store.clearSearch();
        }
    }
);
</script>

<template>
    <v-text-field
        v-model="store.searchQuery"
        class="mt-2 mb-1"
        :label="t('friendsPage.discover.searchLabel')"
        :hint="t('friendsPage.discover.searchHint')"
        persistent-hint
        prepend-inner-icon="mdi-magnify"
        @update:model-value="store.searchUsers(String($event || ''))"
    />
</template>
