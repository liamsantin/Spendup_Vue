<script setup lang="ts">
defineOptions({ name: 'AppGlassCard' });

withDefaults(
    defineProps<{
        title?: string;
        subtitle?: string;
        danger?: boolean;
        iconPhoto?: boolean;
    }>(),
    {
        title: undefined,
        subtitle: undefined,
        danger: false,
        iconPhoto: false
    }
);
</script>

<template>
    <section class="su-surface su-panel" :class="{ 'su-panel--danger': danger }">
        <header v-if="title || $slots.icon || $slots.actions || $slots.lead" class="su-panel__head">
            <span
                v-if="$slots.icon"
                class="su-panel__icon"
                :class="{ 'su-panel__icon--danger': danger, 'su-panel__icon--photo': iconPhoto }"
            >
                <slot name="icon" />
            </span>
            <div class="min-width-0">
                <slot name="lead">
                    <h2 v-if="title">{{ title }}</h2>
                    <p v-if="subtitle">{{ subtitle }}</p>
                </slot>
            </div>
            <div v-if="$slots.actions" class="su-panel__actions">
                <slot name="actions" />
            </div>
        </header>
        <div v-if="$slots.default" class="su-panel__body">
            <slot />
        </div>
    </section>
</template>
