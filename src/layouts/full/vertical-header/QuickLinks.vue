<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { quickLink } from '@/data/admin/headerData';

const emit = defineEmits<{ select: [] }>();
const { t } = useI18n();
</script>

<template>
    <div v-for="(item, i) in quickLink" :key="i" class="py-2">
        <router-link
            :to="item.href"
            class="text-decoration-none text-hover-primary font-weight-semibold text-subtitle-1"
            @click="emit('select')"
        >
            {{ t(item.titleKey) }}
        </router-link>
    </div>
</template>
