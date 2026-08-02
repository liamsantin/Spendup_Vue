<script setup lang="ts">
export interface SpendupExpansionPanelItem {
    key: string | number;
    disabled?: boolean;
}

withDefaults(
    defineProps<{
        items: SpendupExpansionPanelItem[];
        multiple?: boolean;
        panelElevation?: number;
        titleClass?: string;
        textClass?: string;
        panelsClass?: string;
    }>(),
    {
        multiple: false,
        panelElevation: 10,
        titleClass: 'text-h6',
        textClass: 'text-subtitle-1 text-medium-emphasis',
        panelsClass: ''
    }
);
</script>

<template>
    <!-- Même structure que FAQ.vue + ui-components/expansionpanel/Basic.vue -->
    <div class="lp-faq spendup-expansion-panels">
        <v-expansion-panels elevation="0" :multiple="multiple" :class="panelsClass">
            <v-expansion-panel
                v-for="(item, index) in items"
                :key="item.key"
                :elevation="panelElevation"
                :disabled="item.disabled"
                class="mb-4"
            >
                <v-expansion-panel-title :class="titleClass" collapse-icon="$minus" expand-icon="$plus">
                    <slot name="title" :item="item" :index="index" />
                </v-expansion-panel-title>
                <v-expansion-panel-text :class="textClass">
                    <slot name="text" :item="item" :index="index" />
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/home/expansion-panels';
</style>
