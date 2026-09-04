<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CreditCardIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { formatExpirationDate, formatLastFourDigits } from '@/features/payment-methods/format';
import type { PaymentMethod } from '@/features/payment-methods/types';

const props = defineProps<{
    method: PaymentMethod;
    canWrite: boolean;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [method: PaymentMethod];
    delete: [method: PaymentMethod];
}>();

const { t, locale } = useI18n();

const typeLabel = computed(() => t(`paymentMethodsPage.types.${props.method.type}`));
const lastFour = computed(() => formatLastFourDigits(props.method.lastFourDigits));
const expiration = computed(() => formatExpirationDate(props.method.expirationDate, locale.value));
</script>

<template>
    <v-list-item
        class="payment-method-list-item px-2 py-3"
        rounded="md"
        :class="{ 'opacity-60': !method.isActive }"
        :data-payment-method-id="method.publicId"
    >
        <template #prepend>
            <v-avatar size="46" class="mr-3 bg-lightprimary text-primary" rounded="md">
                <CreditCardIcon size="22" />
            </v-avatar>
        </template>

        <div class="w-100">
            <div class="d-flex align-center justify-space-between ga-2">
                <h6 class="text-subtitle-1 font-weight-bold mb-0 text-truncate min-width-0">{{ method.label }}</h6>
                <v-chip v-if="!method.isActive" size="x-small" color="warning" variant="tonal" class="flex-shrink-0">
                    {{ t('paymentMethodsPage.badges.inactive') }}
                </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis text-truncate">
                {{ typeLabel }}
                <template v-if="lastFour"> · {{ lastFour }}</template>
                <template v-if="expiration"> · {{ t('paymentMethodsPage.list.expires', { date: expiration }) }}</template>
            </div>
            <div v-if="method.reference" class="text-caption text-medium-emphasis text-truncate">
                {{ method.reference }}
            </div>
        </div>

        <template v-if="canWrite" #append>
            <div class="su-person__actions">
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('paymentMethodsPage.actions.edit')"
                    @click.stop="emit('edit', method)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('paymentMethodsPage.actions.delete')"
                    @click.stop="emit('delete', method)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </div>
        </template>
    </v-list-item>
</template>
