<script setup lang="ts">
import { LayoutDashboardIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import UiParentCard from '@/components/shared/card/UiParentCard.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { useDashboardModules } from '@/features/dashboard/composables/useDashboardModules';

const { t } = useI18n();
const { modules } = useDashboardModules();
</script>

<template>
    <v-row class="mb-4">
        <v-col cols="12">
            <AppAlert type="info" variant="tonal" border="start" rounded="lg" density="default" class="mb-0">
                <div class="d-flex align-start ga-3">
                    <LayoutDashboardIcon size="28" class="text-primary flex-shrink-0 mt-1" stroke-width="1.5" />
                    <div>
                        <p class="text-subtitle-1 font-weight-semibold textPrimary mb-1">{{ t('dashboard.banner.title') }}</p>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                            {{ t('dashboard.banner.body') }}
                        </p>
                    </div>
                </div>
            </AppAlert>
        </v-col>
    </v-row>

    <v-row>
        <v-col v-for="mod in modules" :key="mod.titleKey" cols="12" sm="6" lg="4">
            <UiParentCard :title="t(mod.titleKey)">
                <div class="d-flex flex-column ga-3">
                    <div class="su-icon-wrap rounded-lg d-inline-flex align-center justify-center" style="width: 48px; height: 48px">
                        <component :is="mod.icon" size="24" class="text-primary" stroke-width="1.5" />
                    </div>
                    <p class="text-body-2 text-medium-emphasis mb-0">{{ t(mod.captionKey) }}</p>
                    <v-btn
                        :to="mod.disabled ? undefined : mod.to"
                        :disabled="mod.disabled"
                        color="primary"
                        variant="tonal"
                        class="text-none align-self-start"
                        size="small"
                    >
                        {{ mod.disabled ? t('dashboard.actions.comingSoon') : t('dashboard.actions.open') }}
                    </v-btn>
                </div>
            </UiParentCard>
        </v-col>
    </v-row>
</template>
