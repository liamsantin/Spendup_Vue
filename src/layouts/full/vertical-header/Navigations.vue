<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronDownIcon, HelpIcon } from 'vue-tabler-icons';
import AppsLink from './AppsLink.vue';
import QuickLinks from './QuickLinks.vue';

const { t } = useI18n();
const menuOpen = ref(false);

function closeMenu() {
    menuOpen.value = false;
}
</script>

<template>
    <v-menu v-model="menuOpen" open-on-hover :close-on-content-click="false">
        <template #activator="{ props }">
            <v-btn class="hidden-sm-and-down" rounded="sm" variant="text" color="primary" v-bind="props">
                {{ t('header.appsSidebar.sections.apps') }}
                <ChevronDownIcon size="16" class="mt-1 ml-1" />
            </v-btn>
        </template>
        <v-sheet width="900" height="382" elevation="10" rounded="md" class="pa-4 pb-0">
            <div>
                <v-row>
                    <v-col cols="12" lg="8" class="d-flex py-0">
                        <div class="pa-4 pb-0 pr-0">
                            <AppsLink @select="closeMenu" />
                            <v-divider class="mt-6"></v-divider>
                            <div class="pa-5 pl-0">
                                <div class="d-flex align-center justify-space-between">
                                    <router-link to="/" class="text-decoration-none d-flex align-center" @click="closeMenu">
                                        <HelpIcon size="20" stroke-width="1.5" class="text-hover-primary" />
                                        <h6 class="text-subtitle-1 font-weight-bold text-hover-primary ml-2">
                                            {{ t('header.appsSidebar.faq') }}
                                        </h6>
                                    </router-link>
                                    <v-btn color="primary" variant="flat" to="/" @click="closeMenu">
                                        {{ t('header.appsSidebar.faqAction') }}
                                    </v-btn>
                                </div>
                            </div>
                        </div>

                        <v-divider vertical></v-divider>
                    </v-col>
                    <v-col cols="12" lg="4" class="py-0">
                        <div class="pa-4">
                            <h5 class="text-h5">{{ t('header.appsSidebar.quickLinksTitle') }}</h5>
                            <QuickLinks @select="closeMenu" />
                        </div>
                    </v-col>
                </v-row>
            </div>
        </v-sheet>
    </v-menu>
</template>
