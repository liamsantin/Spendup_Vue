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
        opacity="0.85"
    >
        <div class="text-center pa-6" role="status" aria-live="polite">
            <v-progress-circular indeterminate size="48" width="4" color="primary" />
            <div class="text-h6 font-weight-semibold mt-4">{{ title }}</div>
            <div v-if="subtitle" class="text-body-2 text-medium-emphasis mt-1">{{ subtitle }}</div>
        </div>
    </v-overlay>
</template>

<style scoped lang="scss">
.auth-processing-overlay :deep(.v-overlay__scrim) {
    backdrop-filter: blur(2px);
}
</style>
