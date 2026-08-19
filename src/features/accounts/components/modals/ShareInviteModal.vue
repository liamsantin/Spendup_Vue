<script setup lang="ts">
/**
 * Shell d’invitation au partage : dialog desktop, bottom sheet mobile.
 * Le contenu vit dans `ShareInviteForm`.
 */
defineOptions({ name: 'ShareInviteModal' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { useAccountsStore } from '../stores/accounts-store';
import ShareInviteForm from './forms/ShareInviteForm.vue';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const store = useAccountsStore();
const formRef = ref<{ submit: () => Promise<void> } | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('comptesPage.share.inviteTitle')"
        :subtitle="t('comptesPage.share.inviteSubtitle')"
        :height="smAndDown ? 400 : 600"
        :max-width="520"
        fixed-height
        :scrollable="false"
        :mobile-layout="smAndDown ? 'sheet' : 'dialog'"
    >
        <ShareInviteForm
            ref="formRef"
            :account-public-id="accountPublicId"
            :is-open="open"
            @close="open = false"
        />

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="store.acting" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" flat :loading="store.acting" :disabled="store.acting" @click="formRef?.submit()">
                {{ t('comptesPage.share.invite') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
