<script setup lang="ts" generic="T extends string">
/**
 * Choix de tri en boutons arrondis (même langage que `.su-btn`).
 */
defineOptions({ name: 'AppSortChoices' });

const model = defineModel<T>({ required: true });

defineProps<{
    items: readonly T[];
    labelFor: (value: T) => string;
}>();
</script>

<template>
    <div class="app-sort-choices">
        <button
            v-for="value in items"
            :key="value"
            type="button"
            class="su-btn app-sort-choices__btn"
            :class="{ 'su-btn--ink': model === value }"
            @click="model = value"
        >
            {{ labelFor(value) }}
        </button>
    </div>
</template>

<style scoped>
.app-sort-choices {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 2px 2px;
}

.app-sort-choices__btn {
    width: 100%;
    justify-content: center;
    border-radius: 999px;
}
</style>
