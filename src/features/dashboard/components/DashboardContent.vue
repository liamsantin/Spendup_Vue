<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { LayoutDashboardIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import { useDashboardModules } from '@/features/dashboard/composables/useDashboardModules';

const { t } = useI18n();
const { modules } = useDashboardModules();
</script>

<template>
    <section class="su-surface su-banner">
        <span class="su-panel__icon">
            <LayoutDashboardIcon :size="20" stroke-width="1.5" />
        </span>
        <div>
            <h2>{{ t('dashboard.banner.title') }}</h2>
            <p>{{ t('dashboard.banner.body') }}</p>
        </div>
    </section>

    <div class="su-grid">
        <article v-for="(mod, i) in modules" :key="mod.titleKey" class="su-card" :style="{ '--i': i }">
            <span class="su-panel__icon">
                <component :is="mod.icon" :size="20" stroke-width="1.5" />
            </span>
            <h2>{{ t(mod.titleKey) }}</h2>
            <p>{{ t(mod.captionKey) }}</p>
            <RouterLink v-if="!mod.disabled" :to="mod.to" class="su-btn su-btn--ink">
                {{ t('dashboard.actions.open') }}
            </RouterLink>
            <button v-else type="button" class="su-btn" disabled>
                {{ t('dashboard.actions.comingSoon') }}
            </button>
        </article>
    </div>
</template>
