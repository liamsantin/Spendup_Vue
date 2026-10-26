<script setup lang="ts">
/**
 * Recherche de plateau : champ complet sur grand écran, icône + popover en dessous de 1200px.
 */
defineOptions({ name: 'AppBoardSearch' });

import { nextTick, ref, watch } from 'vue';
import { SearchIcon, XIcon } from 'vue-tabler-icons';

const props = withDefaults(
    defineProps<{
        modelValue: string;
        placeholder: string;
        searchLabel: string;
        clearLabel: string;
        maxlength?: number;
    }>(),
    { maxlength: undefined }
);

const emit = defineEmits<{
    'update:modelValue': [value: string];
    clear: [];
}>();

const popoverOpen = ref(false);
const popoverFieldRef = ref<HTMLInputElement | null>(null);

function onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    emit('update:modelValue', props.maxlength ? value.slice(0, props.maxlength) : value);
}

watch(popoverOpen, (open) => {
    if (!open) return;
    void nextTick(() => popoverFieldRef.value?.focus());
});
</script>

<template>
    <label class="su-search su-search--discover app-board-search app-board-search--full">
        <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
        <input
            class="su-search__input"
            type="search"
            :value="modelValue"
            :maxlength="maxlength"
            :placeholder="placeholder"
            :aria-label="placeholder"
            autocomplete="off"
            @input="onInput"
        />
        <button v-if="modelValue" type="button" class="su-search__orb" :aria-label="clearLabel" @click="emit('clear')">
            <XIcon :size="16" stroke-width="1.8" />
        </button>
    </label>
    <v-menu v-model="popoverOpen" location="bottom start" :close-on-content-click="false" :offset="8" scrim>
        <template #activator="{ props: menuProps }">
            <button
                type="button"
                class="su-btn app-board-search__trigger"
                :class="{ 'is-active': popoverOpen || !!modelValue }"
                v-bind="menuProps"
                :aria-label="searchLabel"
                :aria-expanded="popoverOpen"
            >
                <SearchIcon :size="16" stroke-width="1.6" />
            </button>
        </template>
        <v-sheet elevation="0" class="su-search su-search-pop">
            <SearchIcon class="su-search__icon" :size="18" stroke-width="1.8" />
            <input
                ref="popoverFieldRef"
                class="su-search__input"
                type="search"
                :value="modelValue"
                :maxlength="maxlength"
                :placeholder="placeholder"
                :aria-label="placeholder"
                autocomplete="off"
                @input="onInput"
            />
            <button v-if="modelValue" type="button" class="su-search__orb" :aria-label="clearLabel" @click="emit('clear')">
                <XIcon :size="16" stroke-width="1.8" />
            </button>
        </v-sheet>
    </v-menu>
</template>

<style>
.app-board .app-board-search--full {
    flex: 1 1 220px;
    width: auto;
    max-width: 520px;
    height: 40px;
    margin: 0;
    border-radius: 0;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--line);
    box-shadow: none;
    backdrop-filter: none;
}

.app-board .app-board-search--full:hover {
    border-bottom-color: var(--gray);
}

.app-board .app-board-search__trigger {
    flex: none;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
}

.app-board .app-board-search__trigger.is-active {
    color: var(--ink);
    border-color: var(--ink);
    background: transparent;
    box-shadow: none;
}

@media (max-width: 1199px) {
    .app-board .app-board-search--full {
        display: none;
    }
}

@media (min-width: 1200px) {
    .app-board .app-board-search__trigger {
        display: none;
    }
}

@media (max-width: 767px) {
    .app-board .app-board-search__trigger {
        margin-right: auto;
    }
}
</style>
