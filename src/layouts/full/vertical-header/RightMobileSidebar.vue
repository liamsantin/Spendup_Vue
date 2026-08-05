<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AppsIcon, CalendarIcon, MailIcon, MessagesIcon } from 'vue-tabler-icons';
import AppsLink from './AppsLink.vue';
import QuickLinks from './QuickLinks.vue';

const { t } = useI18n();
const open = ref(['Apps']);
</script>

<template>
    <div class="pt-6">
        <h5 class="text-h5 mb-4 px-5">{{ t('header.appsSidebar.navigation') }}</h5>
        <v-list v-model:opened="open" class="right-sidebar">
            <v-list-group value="Apps">
                <template #activator="{ props }">
                    <v-list-item v-bind="props">
                        <template #prepend>
                            <AppsIcon width="21" stroke-width="1.5" />
                        </template>
                        <h5 class="text-subtitle-1 ml-2">{{ t('header.appsSidebar.sections.apps') }}</h5>
                    </v-list-item>
                </template>
                <v-list-item class="pl-6 pb-6">
                    <div>
                        <AppsLink />
                    </div>
                </v-list-item>
            </v-list-group>
            <v-list-item>
                <template #prepend>
                    <MessagesIcon width="21" stroke-width="1.5" />
                </template>
                <h5 class="text-subtitle-1 ml-2">{{ t('header.appsSidebar.sections.chats') }}</h5>
            </v-list-item>
            <v-list-item>
                <template #prepend>
                    <CalendarIcon width="21" stroke-width="1.5" />
                </template>
                <h5 class="text-subtitle-1 ml-2">{{ t('header.appsSidebar.sections.calendar') }}</h5>
            </v-list-item>
            <v-list-item>
                <template #prepend>
                    <MailIcon width="21" stroke-width="1.5" />
                </template>
                <h5 class="text-subtitle-1 ml-2">{{ t('header.appsSidebar.sections.mail') }}</h5>
            </v-list-item>
        </v-list>
        <div class="px-5">
            <h5 class="text-h5 my-4">{{ t('header.appsSidebar.quickLinksTitle') }}</h5>
            <QuickLinks />
        </div>
    </div>
</template>

<style scoped>
.right-sidebar .v-list-group__items .v-list-item {
    padding-inline-start: 26px !important;
}
</style>
