<script setup lang="ts">
defineOptions({ name: 'SettingsRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon name="settings" :size="size" />
</template>
