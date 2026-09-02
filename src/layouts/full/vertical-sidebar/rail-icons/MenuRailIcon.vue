<script setup lang="ts">
defineOptions({ name: 'MenuRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon name="menu" :size="size" />
</template>
