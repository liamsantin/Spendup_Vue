<script setup lang="ts">
import { ColorPickerIcon, XIcon } from 'vue-tabler-icons';
import { useAppColorPicker } from './useAppColorPicker';

const props = withDefaults(
    defineProps<{
        modelValue?: string | null;
        colors?: readonly string[];
        label?: string;
        clearLabel?: string;
        doneLabel?: string;
        disabled?: boolean;
        hideLabel?: boolean;
    }>(),
    {
        modelValue: null,
        colors: () => [],
        label: 'Couleur',
        clearLabel: 'Aucune couleur',
        doneLabel: 'Terminé',
        disabled: false,
        hideLabel: false
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string | null];
}>();

const {
    hue,
    saturation,
    value,
    isOpen,
    hexInput,
    areaEl,
    hueEl,
    currentHex,
    hueHex,
    previewColor,
    isLightColor,
    openPicker,
    startDrag,
    onDragMove,
    endDrag,
    nudgeHue,
    onHexInput,
    onHexBlur,
    selectPreset,
    clearColor
} = useAppColorPicker({
    modelValue: () => props.modelValue,
    disabled: () => props.disabled,
    emit: (value) => emit('update:modelValue', value)
});
</script>

<template>
    <div class="app-color-picker" :class="{ 'app-color-picker--disabled': disabled }">
        <v-text-field
            :model-value="hexInput"
            :label="hideLabel ? undefined : label"
            :disabled="disabled"
            color="primary"
            variant="outlined"
            hide-details="auto"
            prefix="#"
            maxlength="6"
            placeholder="RRGGBB"
            spellcheck="false"
            autocomplete="off"
            class="app-color-picker__field"
            @update:model-value="onHexInput"
            @blur="onHexBlur"
        >
            <template #prepend-inner>
                <span
                    class="app-color-picker__swatch-preview"
                    :class="{ 'app-color-picker__swatch-preview--empty': !previewColor }"
                    :style="previewColor ? { backgroundColor: previewColor } : undefined"
                    aria-hidden="true"
                />
            </template>
            <template #append-inner>
                <button
                    type="button"
                    class="app-color-picker__icon-btn"
                    :class="{ 'app-color-picker__icon-btn--active': isOpen }"
                    :disabled="disabled"
                    :aria-label="label"
                    :aria-expanded="isOpen"
                    @click.stop.prevent="openPicker"
                >
                    <ColorPickerIcon :size="20" />
                </button>
            </template>
        </v-text-field>

        <Teleport to="body">
            <Transition name="picker">
                <div v-if="isOpen" class="app-color-picker__overlay" role="dialog" aria-modal="true" @click.self="isOpen = false">
                    <div class="app-color-picker__panel">
                        <header class="app-color-picker__header">
                            <span class="app-color-picker__title">{{ label }}</span>
                            <button type="button" class="app-color-picker__close" aria-label="Fermer" @click="isOpen = false">
                                <XIcon :size="18" />
                            </button>
                        </header>

                        <div
                            ref="areaEl"
                            class="app-color-picker__area"
                            :style="{ backgroundColor: hueHex }"
                            @pointerdown="startDrag('area', $event)"
                            @pointermove="onDragMove"
                            @pointerup="endDrag"
                            @pointercancel="endDrag"
                        >
                            <span
                                class="app-color-picker__area-handle"
                                :class="{ 'app-color-picker__area-handle--light': isLightColor }"
                                :style="{
                                    left: `${saturation * 100}%`,
                                    top: `${(1 - value) * 100}%`,
                                    backgroundColor: currentHex
                                }"
                            />
                        </div>

                        <div
                            ref="hueEl"
                            class="app-color-picker__hue"
                            role="slider"
                            tabindex="0"
                            aria-label="Teinte"
                            :aria-valuenow="Math.round(hue)"
                            aria-valuemin="0"
                            aria-valuemax="360"
                            @pointerdown="startDrag('hue', $event)"
                            @pointermove="onDragMove"
                            @pointerup="endDrag"
                            @pointercancel="endDrag"
                            @keydown.left.prevent="nudgeHue(-5)"
                            @keydown.right.prevent="nudgeHue(5)"
                        >
                            <span
                                class="app-color-picker__hue-handle"
                                :style="{ left: `${(hue / 360) * 100}%`, backgroundColor: hueHex }"
                            />
                        </div>

                        <div class="app-color-picker__row">
                            <div class="app-color-picker__hex">
                                <span class="app-color-picker__hex-prefix">#</span>
                                <input
                                    :value="hexInput"
                                    class="app-color-picker__hex-input"
                                    spellcheck="false"
                                    maxlength="6"
                                    placeholder="RRGGBB"
                                    aria-label="Code hexadécimal"
                                    @input="onHexInput(($event.target as HTMLInputElement).value)"
                                    @blur="onHexBlur"
                                />
                            </div>
                            <button type="button" class="app-color-picker__clear" @click="clearColor">
                                {{ clearLabel }}
                            </button>
                        </div>

                        <div v-if="colors.length" class="app-color-picker__presets">
                            <button
                                v-for="(preset, index) in colors"
                                :key="preset"
                                type="button"
                                class="app-color-picker__swatch"
                                :class="{ 'app-color-picker__swatch--selected': previewColor?.toUpperCase() === preset.toUpperCase() }"
                                :style="{ backgroundColor: preset, '--delay': `${index * 30}ms` }"
                                :aria-label="preset"
                                @click="selectPreset(preset)"
                            />
                        </div>

                        <footer class="app-color-picker__footer">
                            <button type="button" class="app-color-picker__done" @click="isOpen = false">
                                {{ doneLabel }}
                            </button>
                        </footer>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
