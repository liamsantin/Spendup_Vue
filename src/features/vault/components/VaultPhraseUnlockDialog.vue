<script setup lang="ts">
/**
 * Connexion Google sur un appareil sans clé : la phrase de Coffre déballe la DEK. « Plus tard » laisse
 * l’application fonctionner en clair (champs chiffrés affichés « illisible »).
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue';
import { useVaultStore } from '@/features/vault/stores/vault-store';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; unlocked: [] }>();

const { t } = useI18n();
const vault = useVaultStore();

const phrase = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) return;
        phrase.value = '';
        error.value = null;
        loading.value = false;
    }
);

async function unlock() {
    error.value = null;
    if (!phrase.value) {
        error.value = t('vault.unlock.errors.required');
        return;
    }
    if (loading.value) return;
    loading.value = true;
    try {
        const outcome = await vault.unlockWithPassword(phrase.value);
        if (outcome === 'unlocked' || outcome === 'already') {
            phrase.value = '';
            vault.startBackgroundMigration();
            emit('unlocked');
            open.value = false;
            return;
        }
        error.value = t(outcome === 'failed' ? 'vault.unlock.errors.wrongPhrase' : 'vault.unlock.errors.unavailable');
    } finally {
        loading.value = false;
    }
}

function later() {
    open.value = false;
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('vault.unlock.title')"
        :subtitle="t('vault.unlock.subtitle')"
        :max-width="480"
        :scrollable="false"
    >
        <form class="vault-unlock" @submit.prevent="unlock">
            <AuthPasswordField v-model="phrase" :label="t('vault.secret.phrase')" autocomplete="off" data-test="vault-unlock-phrase" />
            <AppAlert v-if="error" type="error" class="mt-4">{{ error }}</AppAlert>
        </form>

        <template #footer>
            <button type="button" class="su-btn su-btn--ghost" :disabled="loading" data-test="vault-unlock-later" @click="later">
                {{ t('vault.unlock.later') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="loading" data-test="vault-unlock-submit" @click="unlock">
                <span v-if="loading" class="su-spin" aria-hidden="true" />
                {{ t('vault.unlock.submit') }}
            </button>
        </template>
    </AppModalBase>
</template>
