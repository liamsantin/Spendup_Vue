<script setup lang="ts">
defineProps<{
    active: boolean;
    title: string;
    subtitle?: string;
}>();
</script>

<template>
    <v-overlay
        :model-value="active"
        contained
        persistent
        :close-on-back="false"
        no-click-animation
        class="auth-processing-overlay align-center justify-center"
        scrim="surface"
        opacity="0.72"
    >
        <div class="auth-processing-overlay__card" role="status" aria-live="polite">
            <span class="su-spin" aria-hidden="true" />
            <div class="auth-processing-overlay__title">{{ title }}</div>
            <div v-if="subtitle" class="auth-processing-overlay__subtitle">{{ subtitle }}</div>
        </div>
    </v-overlay>
</template>

<style scoped lang="scss">
.auth-processing-overlay :deep(.v-overlay__scrim) {
    backdrop-filter: blur(8px);
}

.auth-processing-overlay__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-width: 220px;
    padding: 28px 24px;
    border-radius: var(--radius-overlay);
    background: var(--surface-overlay);
    border: 1px solid var(--stroke);
    box-shadow: var(--shadow-overlay);
    text-align: center;
}

.auth-processing-overlay__title {
    margin-top: 6px;
    font-family: var(--font-heading);
    font-size: 16px;
    font-weight: 620;
    letter-spacing: -0.02em;
}

.auth-processing-overlay__subtitle {
    color: var(--ink-muted);
    font-size: 13.5px;
    line-height: 1.45;
}

.auth-processing-overlay__card .su-spin {
    width: 28px;
    height: 28px;
}
</style>
