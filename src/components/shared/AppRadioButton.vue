<script setup lang="ts">
/**
 * Wrapper autour de `v-radio-group` / `v-radio` (Vuetify).
 * Fournit un rendu simple base sur une liste d'options, avec les
 * conventions Spend.Up / Modernize pour les formulaires.
 */
defineOptions({ name: 'AppRadioButton', inheritAttrs: false });

type RadioItem = {
    title: string;
    value: string | number | boolean;
    disabled?: boolean;
};

const props = withDefaults(
    defineProps<{
        items?: RadioItem[];
        color?: string;
        inline?: boolean;
        hideDetails?: boolean | 'auto';
        density?: 'default' | 'comfortable' | 'compact';
        disabled?: boolean;
    }>(),
    {
        items: () => [],
        color: 'primary',
        inline: false,
        hideDetails: true,
        density: 'default',
        disabled: false
    }
);

const model = defineModel<string | number | boolean | null>({ default: null });
</script>

<template>
    <v-radio-group
        v-model="model"
        :color="color"
        :inline="inline"
        :hide-details="hideDetails"
        :density="density"
        :disabled="disabled"
        v-bind="$attrs"
    >
        <template v-for="item in items" :key="String(item.value)">
            <v-radio :label="item.title" :value="item.value" :disabled="disabled || item.disabled" />
        </template>

        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </v-radio-group>
</template>
