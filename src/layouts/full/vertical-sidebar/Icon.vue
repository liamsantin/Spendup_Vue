<script setup>
defineOptions({ name: 'NavIcon' });

defineProps({ item: Object, level: Number });
</script>

<template>
    <template v-if="level > 0">
        <component :is="item" :size="14" class="iconClass" />
    </template>
    <template v-else>
        <component :is="item" :size="20" class="iconClass" />
    </template>
</template>
