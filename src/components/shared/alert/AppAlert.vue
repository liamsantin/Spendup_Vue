<script setup lang="ts">
/**
 * Alerte Spend.Up : unique style `tonal` + densité `default`.
 * Props : `type`, `closable`, `dismissMs`. Autres attrs / slots de `v-alert` passent telles quelles
 * (sauf `variant`, `density` et `color`, figés / mappés vers `type`).
 */
defineOptions({ name: 'AppAlert', inheritAttrs: false });

import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useSlots, watch } from 'vue';

const ALERT_TYPES = ['error', 'warning', 'info', 'success'] as const;
type AlertType = (typeof ALERT_TYPES)[number];

const ALERT_ICONS: Record<AlertType, string> = {
    error: '$error',
    warning: '$warning',
    info: '$info',
    success: '$success'
};

function isAlertType(value: unknown): value is AlertType {
    return typeof value === 'string' && (ALERT_TYPES as readonly string[]).includes(value);
}

const props = withDefaults(
    defineProps<{
        /** Sémantique de l’alerte. */
        type?: AlertType;
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
        type: undefined,
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

const resolvedType = computed<AlertType | undefined>(() => {
    if (props.type) return props.type;
    if (isAlertType(attrs.type)) return attrs.type;
    if (isAlertType(attrs.color)) return attrs.color;
    return undefined;
});

const alertAttrs = computed(() => {
    const rest: Record<string, unknown> = { ...attrs };
    delete rest.class;
    delete rest.style;
    delete rest.variant;
    delete rest.density;
    delete rest.type;
    delete rest.color;
    return rest;
});

const internalVisible = ref(true);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

const isControlled = computed(() => props.modelValue !== undefined);

const visible = computed(() => (isControlled.value ? props.modelValue !== false : internalVisible.value));

const themeColorKey = computed(() => resolvedType.value ?? 'primary');

const defaultPrependIcon = computed(() => {
    if (slots.prepend) return null;
    const type = resolvedType.value;
    return type ? ALERT_ICONS[type] : null;
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
    <div v-if="visible" class="app-alert-wrap" :class="attrs.class" :style="attrs.style">
        <v-alert variant="tonal" density="default" :type="resolvedType" :closable="closable" v-bind="alertAttrs" @click:close="dismiss">
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
