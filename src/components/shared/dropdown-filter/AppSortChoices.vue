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
    padding: 6px 4px;
    border-radius: 0;
    border-top: 1px solid var(--line);
    transition: background 0.15s var(--ease, ease);
}

.app-sort__row:first-child {
    border-top: 0;
}

.app-sort__row.is-active {
    background: transparent;
}

.app-sort__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 0;
    background: var(--t-gray-bg);
    color: var(--t-gray-ink);
    transition:
        background 0.15s var(--ease, ease),
        color 0.15s var(--ease, ease);
}

.app-sort__row.is-active .app-sort__icon {
    background: var(--t-blue-bg);
    color: var(--t-blue-ink);
}

.app-sort__label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--gray);
    font-size: 14px;
    font-weight: 400;
}

.app-sort__row.is-active .app-sort__label {
    color: var(--ink);
    font-weight: 700;
}

/* sélecteur segmenté du sens */
.app-sort__segments {
    display: inline-flex;
    flex: none;
    gap: 0;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
}

.app-sort__segment {
    appearance: none;
    height: 30px;
    min-width: 58px;
    padding: 0 10px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    font-size: 12.5px;
    font-weight: 400;
    white-space: nowrap;
    cursor: pointer;
    transition:
        background 0.15s var(--ease, ease),
        color 0.15s var(--ease, ease);
}

.app-sort__segment + .app-sort__segment {
    border-left: 1px solid var(--line);
}

.app-sort__segment:hover:not(.is-selected) {
    color: var(--ink);
    background: var(--soft);
}

.app-sort__segment.is-selected {
    background: var(--ink);
    color: var(--bg);
    font-weight: 700;
}

.app-sort__segment:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 1px;
}
</style>
