<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { TrashIcon } from 'vue-tabler-icons';

defineEmits<{
    delete: [];
}>();

const { t } = useI18n();
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lighterror">
                    <TrashIcon class="text-error" size="25" />
                </v-avatar>
                <h4 class="text-h4 mb-0">{{ t('accounts.danger.title') }}</h4>
            </div>
            <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                {{ t('accounts.danger.subtitle') }}
            </div>
            <div class="d-flex align-center justify-space-between flex-wrap ga-3 mt-2">
                <div class="text-subtitle-1 text-medium-emphasis text-13 pr-4">
                    {{ t('accounts.danger.warning') }}
                </div>
                <v-btn color="error" flat class="flex-shrink-0" @click="$emit('delete')">{{
                    t('accounts.danger.deleteAccount')
                }}</v-btn>
            </div>
        </v-card-item>
    </v-card>
</template>
