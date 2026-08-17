<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ColorPickerIcon, XIcon } from 'vue-tabler-icons';

const props = withDefaults(
    defineProps<{
        modelValue?: string | null;
        colors?: readonly string[];
        label?: string;
        clearLabel?: string;
        doneLabel?: string;
        disabled?: boolean;
    }>(),
    {
        modelValue: null,
        colors: () => [],
        label: 'Couleur',
        clearLabel: 'Aucune couleur',
        doneLabel: 'Terminé',
        disabled: false
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: string | null];
}>();

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

function hsvToHex(h: number, s: number, v: number) {
    const f = (n: number) => {
        const k = (n + h / 60) % 6;
        const channel = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
        return Math.round(channel * 255)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(5)}${f(3)}${f(1)}`.toUpperCase();
}

function hexToHsv(hex: string) {
    const raw = hex.replace('#', '');
    const full =
        raw.length === 3
            ? raw
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : raw;
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === r) h = 60 * (((g - b) / delta) % 6);
        else if (max === g) h = 60 * ((b - r) / delta + 2);
        else h = 60 * ((r - g) / delta + 4);
    }

    return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

const hue = ref(240);
const saturation = ref(0.8);
const value = ref(0.9);
const isOpen = ref(false);
const hexInput = ref('');
const areaEl = ref<HTMLElement | null>(null);
const hueEl = ref<HTMLElement | null>(null);
const dragging = ref<'area' | 'hue' | null>(null);

const currentHex = computed(() => hsvToHex(hue.value, saturation.value, value.value));
const hueHex = computed(() => hsvToHex(hue.value, 1, 1));
const previewColor = computed(() => props.modelValue ?? null);

/** Un texte sombre reste lisible sur les couleurs claires (luminance perçue). */
const isLightColor = computed(() => {
    const { s, v } = hexToHsv(currentHex.value);
    return v > 0.7 && s < 0.6;
});

watch(
    () => props.modelValue,
    (next) => {
        if (!next || !HEX_RE.test(next)) {
            hexInput.value = '';
            return;
        }
        if (next.toUpperCase() === currentHex.value) {
            hexInput.value = currentHex.value.slice(1);
            return;
        }
        const hsv = hexToHsv(next);
        hue.value = hsv.h;
        saturation.value = hsv.s;
        value.value = hsv.v;
        hexInput.value = next.replace('#', '').toUpperCase();
    },
    { immediate: true }
);

function commit() {
    hexInput.value = currentHex.value.slice(1);
    emit('update:modelValue', currentHex.value);
}

function openPicker() {
    if (!props.disabled) isOpen.value = true;
}

function updateArea(event: PointerEvent) {
    const rect = areaEl.value?.getBoundingClientRect();
    if (!rect) return;
    saturation.value = clamp((event.clientX - rect.left) / rect.width);
    value.value = 1 - clamp((event.clientY - rect.top) / rect.height);
    commit();
}

function updateHue(event: PointerEvent) {
    const rect = hueEl.value?.getBoundingClientRect();
    if (!rect) return;
    hue.value = clamp((event.clientX - rect.left) / rect.width) * 360;
    commit();
}

function startDrag(target: 'area' | 'hue', event: PointerEvent) {
    dragging.value = target;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    if (target === 'area') updateArea(event);
    else updateHue(event);
}

function onDragMove(event: PointerEvent) {
    if (dragging.value === 'area') updateArea(event);
    else if (dragging.value === 'hue') updateHue(event);
}

function endDrag(event: PointerEvent) {
    dragging.value = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
}

function nudgeHue(delta: number) {
    hue.value = (hue.value + delta + 360) % 360;
    commit();
}

function onHexInput(raw: string) {
    hexInput.value = String(raw ?? '')
        .replace(/[^0-9a-f]/gi, '')
        .slice(0, 6);

    if (!hexInput.value) {
        emit('update:modelValue', null);
        return;
    }

    if (!HEX_RE.test(hexInput.value)) return;

    const hsv = hexToHsv(hexInput.value);
    hue.value = hsv.h;
    saturation.value = hsv.s;
    value.value = hsv.v;
    emit('update:modelValue', currentHex.value);
}

function onHexBlur() {
    hexInput.value = props.modelValue ? props.modelValue.replace('#', '').toUpperCase() : '';
}

function selectPreset(color: string) {
    const hsv = hexToHsv(color);
    hue.value = hsv.h;
    saturation.value = hsv.s;
    value.value = hsv.v;
    commit();
}

function clearColor() {
    hexInput.value = '';
    emit('update:modelValue', null);
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') isOpen.value = false;
}

watch(isOpen, (open) => {
    if (open) document.addEventListener('keydown', onKeydown);
    else document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = open ? 'hidden' : '';
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
});
</script>

<template>
    <div class="app-color-picker" :class="{ 'app-color-picker--disabled': disabled }">
        <v-text-field
            :model-value="hexInput"
            :label="label"
            :disabled="disabled"
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

<style scoped>
.app-color-picker {
    width: 100%;
}

.app-color-picker__field :deep(input) {
    font-family: 'Courier New', monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.app-color-picker__swatch-preview {
    display: inline-block;
    width: 18px;
    height: 18px;
    margin-inline-end: 4px;
    border: 1px solid rgba(var(--v-border-color), 0.4);
    border-radius: 50%;
}

.app-color-picker__swatch-preview--empty {
    background:
        linear-gradient(45deg, transparent 46%, rgba(var(--v-theme-error), 0.75) 47% 53%, transparent 54%),
        rgba(var(--v-theme-on-surface), 0.08);
}

.app-color-picker__icon-btn {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    color: rgba(var(--v-theme-on-surface), 0.55);
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition:
        color 160ms ease,
        background-color 160ms ease,
        transform 160ms ease;
}

.app-color-picker__icon-btn:hover:not(:disabled),
.app-color-picker__icon-btn--active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.1);
}

.app-color-picker__icon-btn:hover:not(:disabled) {
    transform: scale(1.08);
}

.app-color-picker__icon-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.app-color-picker__overlay {
    position: fixed;
    z-index: 2500;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
}

.app-color-picker__panel {
    width: 100%;
    max-width: 340px;
    padding: 18px;
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
}

.app-color-picker__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.app-color-picker__title {
    color: rgb(var(--v-theme-on-surface));
    font-size: 1rem;
    font-weight: 600;
}

.app-color-picker__close {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    color: rgba(var(--v-theme-on-surface), 0.6);
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    transition:
        background-color 160ms ease,
        color 160ms ease;
}

.app-color-picker__close:hover {
    color: rgb(var(--v-theme-on-surface));
    background: rgba(var(--v-theme-on-surface), 0.08);
}

.app-color-picker__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
}

.app-color-picker__done {
    padding: 9px 20px;
    color: rgb(var(--v-theme-on-primary));
    background: rgb(var(--v-theme-primary));
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition:
        filter 160ms ease,
        transform 160ms ease;
}

.app-color-picker__done:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
}

.app-color-picker__area {
    position: relative;
    height: 148px;
    border-radius: 10px;
    cursor: crosshair;
    touch-action: none;
    overflow: hidden;
}

.app-color-picker__area::before,
.app-color-picker__area::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
}

.app-color-picker__area::before {
    background: linear-gradient(to right, #fff, transparent);
}

.app-color-picker__area::after {
    background: linear-gradient(to top, #000, transparent);
}

.app-color-picker__area-handle {
    position: absolute;
    z-index: 1;
    width: 18px;
    height: 18px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
    transform: translate(-50%, -50%);
    transition: box-shadow 160ms ease;
    pointer-events: none;
}

.app-color-picker__area-handle--light {
    border-color: rgba(0, 0, 0, 0.55);
}

.app-color-picker__hue {
    position: relative;
    height: 14px;
    margin-top: 14px;
    border-radius: 999px;
    background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
    cursor: pointer;
    touch-action: none;
}

.app-color-picker__hue:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 3px;
}

.app-color-picker__hue-handle {
    position: absolute;
    top: 50%;
    width: 18px;
    height: 18px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.35);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.app-color-picker__row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
}

.app-color-picker__hex {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 4px;
    padding: 7px 10px;
    background: rgba(var(--v-theme-on-surface), 0.04);
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 8px;
    transition: border-color 160ms ease;
}

.app-color-picker__hex:focus-within {
    border-color: rgb(var(--v-theme-primary));
}

.app-color-picker__hex-prefix {
    color: rgba(var(--v-theme-on-surface), 0.5);
    font-size: 0.9rem;
}

.app-color-picker__hex-input {
    width: 100%;
    color: rgb(var(--v-theme-on-surface));
    background: transparent;
    border: none;
    outline: none;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.app-color-picker__clear {
    padding: 8px 12px;
    color: rgba(var(--v-theme-on-surface), 0.7);
    background: transparent;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    transition:
        background-color 160ms ease,
        color 160ms ease;
}

.app-color-picker__clear:hover {
    color: rgb(var(--v-theme-error));
    background: rgba(var(--v-theme-error), 0.08);
}

.app-color-picker__presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(var(--v-border-color), 0.35);
}

.app-color-picker__swatch {
    width: 26px;
    height: 26px;
    border: 2px solid rgb(var(--v-theme-surface));
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(var(--v-border-color), 0.28);
    cursor: pointer;
    animation: swatch-in 260ms both;
    animation-delay: var(--delay);
    transition:
        transform 160ms ease,
        box-shadow 160ms ease;
}

.app-color-picker__swatch:hover {
    transform: translateY(-2px) scale(1.1);
}

.app-color-picker__swatch--selected {
    box-shadow:
        0 0 0 2px rgb(var(--v-theme-surface)),
        0 0 0 4px rgb(var(--v-theme-primary));
}

.app-color-picker--disabled {
    opacity: 0.5;
}

.picker-enter-active,
.picker-leave-active {
    transition: opacity 180ms ease;
}

.picker-enter-active .app-color-picker__panel,
.picker-leave-active .app-color-picker__panel {
    transition: transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.picker-enter-from,
.picker-leave-to {
    opacity: 0;
}

.picker-enter-from .app-color-picker__panel,
.picker-leave-to .app-color-picker__panel {
    transform: translateY(-10px) scale(0.94);
}

@keyframes swatch-in {
    from {
        opacity: 0;
        transform: scale(0.6);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .app-color-picker *,
    .picker-enter-active,
    .picker-leave-active {
        animation: none !important;
        transition: none !important;
    }
}
</style>
