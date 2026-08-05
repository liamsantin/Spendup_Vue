<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { appsLink } from '@/data/admin/headerData';

const { t } = useI18n();
</script>
<template>
    <v-row>
        <v-col v-for="(item, i) in appsLink" :key="i" cols="12" lg="6">
            <router-link :to="item.href" class="text-decoration-none custom-text-primary">
                <div class="d-flex align-center">
                    <v-avatar size="45" color="grey100" rounded="md">
                        <img :src="item.avatar" width="24" height="24" :alt="t(item.titleKey)" />
                    </v-avatar>
                    <div class="ml-3">
                        <h6 class="text-subtitle-1 mb-1 textPrimary font-weight-semibold custom-title">{{ t(item.titleKey) }}</h6>
                        <p class="text-subtitle-2 textSecondary">{{ t(item.subtitleKey) }}</p>
                    </div>
                </div>
            </router-link>
        </v-col>
    </v-row>
</template>
