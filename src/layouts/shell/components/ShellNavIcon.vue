<script setup lang="ts">
import { computed } from 'vue';
import BaseIcon from './BaseIcon.vue';
import type { IconName, NavIcon } from '../types/navigation';

const props = withDefaults(
    defineProps<{
        icon: NavIcon;
        size?: number;
    }>(),
    { size: 22 }
);

const iconName = computed(() => (typeof props.icon === 'string' ? (props.icon as IconName) : null));
const iconComponent = computed(() => (typeof props.icon === 'string' ? null : props.icon));
</script>

<template>
    <BaseIcon v-if="iconName" :name="iconName" :size="size" />
    <component v-else :is="iconComponent" :size="size" stroke-width="1.5" />
</template>
