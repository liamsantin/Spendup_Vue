<script setup lang="ts">
/**
 * Wrapper autour de `v-alert` (Vuetify).
 * Props Spend.Up : `dismissMs` (auto-fermeture + barre basse), `closable`.
 * Autres props / attrs / slots de `v-alert` passent telles quelles.
 */
defineOptions({ name: 'AppAlert', inheritAttrs: false });

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

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

const internalVisible = ref(true);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

const isControlled = computed(() => props.modelValue !== undefined);

const visible = computed(() => (isControlled.value ? props.modelValue !== false : internalVisible.value));

const progressStyle = computed(() =>
    props.dismissMs
        ? {
              animationDuration: `${props.dismissMs}ms`
          }
        : undefined
);

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
        <v-alert :density="density" :closable="closable" v-bind="$attrs" @click:close="dismiss">
            <template v-for="(_, name) in $slots" #[name]="slotData">
                <slot :name="name" v-bind="slotData || {}" />
            </template>
        </v-alert>
        <div v-if="dismissMs" class="app-alert-wrap__progress" :style="progressStyle" />
    </div>
</template>

<style scoped>
.app-alert-wrap {
    position: relative;
    overflow: hidden;
    border-radius: inherit;
}

.app-alert-wrap :deep(.v-alert) {
    margin-bottom: 0;
}

.app-alert-wrap__progress {
    position: absolute;
    left: 0;
    bottom: 0;
    z-index: 1;
    height: 2px;
    width: 100%;
    transform: scaleX(0);
    transform-origin: left center;
    background-color: rgba(var(--v-theme-on-surface), 0.28);
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
