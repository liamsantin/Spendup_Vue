<script setup lang="ts">
/**
 * Menu d’une ligne de sous-liste : Modifier / Supprimer (libellé de suppression surchargeable, ex. « Délier »).
 */
defineOptions({ name: 'RealEstateRowMenu' });

import { useI18n } from 'vue-i18n';
import { DotsIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';

withDefaults(
    defineProps<{
        disabled?: boolean;
        deleteLabel?: string | null;
    }>(),
    {
        disabled: false,
        deleteLabel: null
    }
);

const emit = defineEmits<{
    edit: [];
    delete: [];
}>();

const { t } = useI18n();
</script>

<template>
    <v-menu location="bottom end" :offset="4">
        <template #activator="{ props: menuProps }">
            <button v-bind="menuProps" type="button" class="su-orb" :disabled="disabled" :aria-label="t('common.more')">
                <DotsIcon :size="18" stroke-width="1.75" />
            </button>
        </template>
        <v-sheet class="su-menu">
            <button type="button" class="su-menu-item" :disabled="disabled" @click="emit('edit')">
                <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                <span class="su-menu-item__title">{{ t('realEstatePage.actions.edit') }}</span>
            </button>
            <button type="button" class="su-menu-item" :disabled="disabled" @click="emit('delete')">
                <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                <span class="su-menu-item__title">{{ deleteLabel || t('realEstatePage.actions.delete') }}</span>
            </button>
        </v-sheet>
    </v-menu>
</template>
