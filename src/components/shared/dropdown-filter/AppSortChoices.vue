<script setup lang="ts" generic="T extends string">
/**
 * Choix de tri groupés par critère : une ligne par critère (icône + libellé) et, à droite,
 * un sélecteur segmenté pour le sens (« A → Z | Z → A », « Récents | Anciens »…).
 * Plus compact et lisible qu'une pile de boutons : on choisit d'abord *quoi*, puis *comment*.
 */
import type { AppSortGroup } from './sort-choices';

defineOptions({ name: 'AppSortChoices' });

const model = defineModel<T>({ required: true });

defineProps<{
    groups: AppSortGroup<T>[];
    /** Intitulé du groupe de radios (accessibilité). */
    label?: string;
}>();

function isGroupActive(group: AppSortGroup<T>): boolean {
    return group.options.some((option) => option.value === model.value);
}
</script>

<template>
    <div class="app-sort" role="radiogroup" :aria-label="label">
        <div v-for="group in groups" :key="group.id" class="app-sort__row" :class="{ 'is-active': isGroupActive(group) }">
            <span class="app-sort__icon" aria-hidden="true">
                <component :is="group.icon" v-if="group.icon" :size="18" stroke-width="1.7" />
            </span>
            <span class="app-sort__label">{{ group.label }}</span>
            <span class="app-sort__segments">
                <button
                    v-for="option in group.options"
                    :key="option.value"
                    type="button"
                    role="radio"
                    class="app-sort__segment"
                    :class="{ 'is-selected': model === option.value }"
                    :aria-checked="model === option.value"
                    :aria-label="option.ariaLabel ?? `${group.label} : ${option.label}`"
                    @click="model = option.value"
                >
                    {{ option.label }}
                </button>
            </span>
        </div>
    </div>
</template>

<style scoped>
.app-sort {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 2px 2px;
}

.app-sort__row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 6px 6px 6px 8px;
    border-radius: 14px;
    transition: background 0.25s var(--ease, ease);
}

.app-sort__row.is-active {
    background: rgba(var(--v-theme-primary), 0.06);
}

.app-sort__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: var(--hair);
    color: var(--ink-mute);
    transition:
        background 0.25s var(--ease, ease),
        color 0.25s var(--ease, ease);
}

.app-sort__row.is-active .app-sort__icon {
    background: rgba(var(--v-theme-primary), 0.14);
    color: rgb(var(--v-theme-primary));
}

.app-sort__label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink-mute);
    font-size: 0.86rem;
    font-weight: 540;
}

.app-sort__row.is-active .app-sort__label {
    color: var(--ink);
    font-weight: 620;
}

/* sélecteur segmenté du sens */
.app-sort__segments {
    display: inline-flex;
    flex: none;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--hair);
}

.app-sort__segment {
    appearance: none;
    height: 28px;
    min-width: 58px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-mute);
    font: inherit;
    font-size: 0.76rem;
    font-weight: 560;
    white-space: nowrap;
    cursor: pointer;
    transition:
        background 0.2s var(--ease, ease),
        color 0.2s var(--ease, ease),
        box-shadow 0.2s var(--ease, ease);
}

.app-sort__segment:hover:not(.is-selected) {
    color: var(--ink);
    background: rgba(255, 255, 255, 0.7);
}

.app-sort__segment.is-selected {
    background: rgb(var(--v-theme-primary));
    color: #fff;
    box-shadow: 0 6px 14px -8px rgba(var(--v-theme-primary), 0.7);
}

.app-sort__segment:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 1px;
}
</style>
