<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { BellRingingIcon } from 'vue-tabler-icons';
import { notifications } from '@/data/admin/headerData';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const { t } = useI18n();
</script>

<template>
    <v-menu :close-on-content-click="false">
        <template #activator="{ props }">
            <v-btn icon variant="text" color="primary" class="custom-hover-primary" v-bind="props">
                <v-badge :content="notifications.length" color="primary">
                    <BellRingingIcon stroke-width="1.5" size="22" />
                </v-badge>
            </v-btn>
        </template>
        <v-sheet rounded="md" width="360" elevation="10">
            <div class="px-8 pb-4 pt-6">
                <div class="d-flex align-center justify-space-between">
                    <h6 class="text-h5">{{ t('header.notifications.title') }}</h6>
                    <v-chip color="primary" variant="flat" size="small" class="text-white">
                        {{ t('header.notifications.newCount', { count: notifications.length }) }}
                    </v-chip>
                </div>
            </div>
            <perfect-scrollbar style="height: 280px" :options="PERFECT_SCROLLBAR_OPTIONS">
                <v-list class="py-0 theme-list" lines="two">
                    <v-list-item v-for="item in notifications" :key="item.titleKey" :value="item" color="primary" class="py-4 px-8">
                        <template #prepend>
                            <v-avatar size="48" class="mr-3">
                                <v-img :src="item.avatar" width="48" :alt="t(item.titleKey)" />
                            </v-avatar>
                        </template>
                        <div>
                            <h6 class="text-subtitle-1 font-weight-bold mb-1">{{ t(item.titleKey) }}</h6>
                        </div>
                        <p class="text-subtitle-1 font-weight-regular textSecondary">{{ t(item.subtitleKey) }}</p>
                    </v-list-item>
                </v-list>
            </perfect-scrollbar>
            <div class="py-4 px-6 text-center">
                <v-btn color="primary" variant="outlined" block>{{ t('header.notifications.viewAll') }}</v-btn>
            </div>
        </v-sheet>
    </v-menu>
</template>
