<script setup lang="ts">
defineProps({
    title: String
});
</script>

<template>
    <section class="su-surface su-panel">
        <header v-if="title || $slots.action" class="su-panel__head">
            <h2>{{ title }}</h2>
            <div v-if="$slots.action" class="su-panel__actions">
                <slot name="action" />
            </div>
        </header>
        <div class="su-panel__body">
            <slot />
        </div>
    </section>
</template>
