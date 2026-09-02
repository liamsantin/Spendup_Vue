<script setup lang="ts">
defineOptions({ name: 'FinancesRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon name="finances" :size="size" />
</template>
