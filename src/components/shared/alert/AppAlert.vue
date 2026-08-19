<script setup lang="ts">
/**
 * Wrapper autour de `v-alert` (Vuetify).
 * Props Spend.Up : `dismissMs` (auto-fermeture + barre basse), `closable`.
 * Autres props / attrs / slots de `v-alert` passent telles quelles.
 */
defineOptions({ name: 'AppAlert', inheritAttrs: false });

import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useSlots, watch } from 'vue';

const ALERT_ICONS: Record<string, string> = {
    error: '$error',
    warning: '$warning',
    info: '$info',
    success: '$success'
};

const props = withDefaults(
    defineProps<{
        /** Densité Vuetify — compact par défaut (formulaires auth, feedback court). */
        density?: 'default' | 'comfortable' | 'compact';
        /** Affiche la croix de fermeture (v-alert closable). */
        closable?: boolean;
        /**
         * Délai en ms avant fermeture automatique.
         * Pendant ce délai, une fine barre basse se remplit progressivement.
         */
        dismissMs?: number;
        /** Visibilité contrôlée (optionnel, utile avec closable / dismissMs). */
        modelValue?: boolean;
    }>(),
    {
        density: 'compact',
        closable: false,
        dismissMs: undefined,
        modelValue: undefined
    }
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    dismiss: [];
}>();

const attrs = useAttrs();
const slots = useSlots();

const alertAttrs = computed(() => {
    const { class: _className, style: _style, ...rest } = attrs;
    return rest;
});

const internalVisible = ref(true);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

const isControlled = computed(() => props.modelValue !== undefined);

const visible = computed(() => (isControlled.value ? props.modelValue !== false : internalVisible.value));

const themeColorKey = computed(() => {
    const color = attrs.color;
    const type = attrs.type;
    if (typeof color === 'string' && color) return color;
    if (typeof type === 'string' && type) return type;
    return 'primary';
});

const defaultPrependIcon = computed(() => {
    if (slots.prepend) return null;
    const variant = attrs.variant;
    if (variant !== 'tonal' && variant !== 'outlined') return null;
    const type = attrs.type;
    const color = attrs.color;
    if (typeof type === 'string' && ALERT_ICONS[type]) return ALERT_ICONS[type];
    if (typeof color === 'string' && ALERT_ICONS[color]) return ALERT_ICONS[color];
    return null;
});

const progressStyle = computed(() => {
    if (!props.dismissMs) return undefined;
    return {
        animationDuration: `${props.dismissMs}ms`,
        backgroundColor: `rgb(var(--v-theme-${themeColorKey.value}))`
    };
});

function clearDismissTimer() {
    if (dismissTimer) {
        clearTimeout(dismissTimer);
        dismissTimer = null;
    }
}

function dismiss() {
    clearDismissTimer();
    if (!isControlled.value) {
        internalVisible.value = false;
    }
    emit('update:modelValue', false);
    emit('dismiss');
}

function startDismissTimer() {
    clearDismissTimer();
    if (!props.dismissMs || props.dismissMs <= 0 || !visible.value) return;
    dismissTimer = setTimeout(() => {
        dismiss();
    }, props.dismissMs);
}

onMounted(() => {
    startDismissTimer();
});

watch(
    () => [props.dismissMs, visible.value] as const,
    () => {
        if (visible.value) {
            if (!isControlled.value) {
                internalVisible.value = true;
            }
            startDismissTimer();
        } else {
            clearDismissTimer();
        }
    }
);

onBeforeUnmount(() => {
    clearDismissTimer();
});
</script>

<template>
    <div v-if="visible" class="app-alert-wrap">
        <v-alert :density="density" :closable="closable" v-bind="alertAttrs" @click:close="dismiss">
            <template v-if="defaultPrependIcon" #prepend>
                <v-icon class="text-24" :icon="defaultPrependIcon" />
            </template>
            <template v-for="(_, name) in $slots" #[name]="slotData">
                <slot :name="name" v-bind="slotData || {}" />
            </template>
        </v-alert>
        <div v-if="dismissMs" class="app-alert-wrap__progress" :style="progressStyle" />
    </div>
</template>

<style scoped>
.app-alert-wrap {
    display: grid;
}

.app-alert-wrap :deep(.v-alert) {
    grid-area: 1 / 1;
    margin-bottom: 0 !important;
    width: 100%;
}

.app-alert-wrap__progress {
    grid-area: 1 / 1;
    align-self: end;
    z-index: 2;
    height: 3px;
    width: 100%;
    transform: scaleX(0);
    transform-origin: left center;
    pointer-events: none;
    animation-name: app-alert-progress;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
}

@keyframes app-alert-progress {
    from {
        transform: scaleX(0);
    }
    to {
        transform: scaleX(1);
    }
}
</style>
