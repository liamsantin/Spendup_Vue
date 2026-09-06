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

function onDoubleClick(event: MouseEvent) {
    if (!props.canWrite || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.method);
}
</script>

<template>
    <div
        class="su-person payment-method-list-item"
        :class="{ 'opacity-60': !method.isActive, 'payment-method-list-item--editable': canWrite && !acting }"
        :data-payment-method-id="method.publicId"
        @dblclick="onDoubleClick"
    >
        <span class="su-person__avatar su-person__avatar--tile">
            <CreditCardIcon size="22" />
        </span>
        <div class="su-person__meta">
            <p class="su-person__name">{{ method.label }}</p>
            <p class="su-person__sub">
                {{ typeLabel }}
                <template v-if="lastFour"> · {{ lastFour }}</template>
                <template v-if="expiration"> · {{ t('paymentMethodsPage.list.expires', { date: expiration }) }}</template>
            </p>
            <p v-if="method.reference" class="su-person__sub">{{ method.reference }}</p>
        </div>
        <div class="su-person__actions">
            <span v-if="!method.isActive" class="su-chip su-btn--warn">{{ t('paymentMethodsPage.badges.inactive') }}</span>
            <template v-if="canWrite">
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
            </template>
        </div>
    </div>
</template>

<style scoped>
.payment-method-list-item {
    cursor: default;
}

.payment-method-list-item--editable {
    cursor: pointer;
}
</style>
