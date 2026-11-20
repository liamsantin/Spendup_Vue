<script setup lang="ts">
/**
 * Sélecteur de compte de placement (`investissement` / `crypto`) quand les onglets ne suffisent plus.
 * `modelValue` = `publicId` du compte courant.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import type { Account } from '@/features/accounts/types';

const props = defineProps<{
    modelValue: string;
    accounts: Pick<Account, 'publicId' | 'name' | 'currency'>[];
    disabled?: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const { t } = useI18n();

const items = computed(() =>
    props.accounts.map((account) => ({ title: `${account.name} · ${account.currency}`, value: account.publicId }))
);

const model = computed({
    get: () => props.modelValue,
    set: (value: string) => {
        if (value && value !== props.modelValue) emit('update:modelValue', value);
    }
});
</script>

<template>
    <div class="investment-account-picker">
        <AppSelect
            v-model="model"
            :items="items"
            :label="t('investmentsPage.accountPicker.label')"
            :search-placeholder="t('investmentsPage.accountPicker.search')"
            :disabled="disabled"
            searchable
            hide-details
        />
    </div>
</template>

<style scoped>
.investment-account-picker {
    width: 260px;
    max-width: 100%;
}

@media (max-width: 767px) {
    .investment-account-picker {
        width: 100%;
    }
}
</style>
