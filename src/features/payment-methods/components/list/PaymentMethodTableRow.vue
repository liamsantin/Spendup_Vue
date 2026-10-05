<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CreditCardIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { formatExpirationDate, formatLastFourDigits, isExpirationStrictlyBeforeTodayUtc } from '@/features/payment-methods/format';
import type { PaymentMethod } from '@/features/payment-methods/types';

const props = defineProps<{
    method: PaymentMethod;
    accountName: string;
    canWrite: boolean;
    acting?: boolean;
}>();

const emit = defineEmits<{
    edit: [method: PaymentMethod];
    delete: [method: PaymentMethod];
}>();

const { t, locale } = useI18n();

const lastFour = computed(() => formatLastFourDigits(props.method.lastFourDigits));
const expiration = computed(() => formatExpirationDate(props.method.expirationDate, locale.value));
const expired = computed(() => isExpirationStrictlyBeforeTodayUtc(props.method.expirationDate));
const statusLabel = computed(() =>
    props.method.isActive ? t('paymentMethodsPage.badges.active') : t('paymentMethodsPage.badges.inactive')
);

function onDoubleClick(event: MouseEvent) {
    if (!props.canWrite || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('edit', props.method);
}
</script>

<template>
    <tr
        class="app-data-table__row"
        :class="{ 'is-muted': !method.isActive }"
        :data-payment-method-id="method.publicId"
        @dblclick="onDoubleClick"
    >
        <td>
            <div class="app-data-table__name">
                <span class="app-data-table__avatar">
                    <CreditCardIcon size="16" stroke-width="1.8" />
                </span>
                <span class="app-data-table__identity">
                    <span class="app-data-table__title">{{ method.label }}</span>
                    <span v-if="method.reference" class="app-data-table__muted">{{ method.reference }}</span>
                </span>
            </div>
        </td>
        <td>{{ t(`paymentMethodsPage.types.${method.type}`) }}</td>
        <td>{{ accountName }}</td>
        <td>
            <span v-if="lastFour">{{ lastFour }}</span>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <span v-if="expiration" :class="{ 'payment-table__expired': expired }">{{ expiration }}</span>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>
            <span class="app-data-table__pill payment-table__status" :class="{ 'is-inactive': !method.isActive }" :title="statusLabel">
                <span class="app-data-table__pill-label">{{ statusLabel }}</span>
            </span>
        </td>
        <td class="app-data-table__actions-cell" @click.stop>
            <div v-if="canWrite" class="app-data-table__actions">
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('paymentMethodsPage.actions.edit')"
                    @click="emit('edit', method)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('paymentMethodsPage.actions.delete')"
                    @click="emit('delete', method)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </div>
        </td>
    </tr>
</template>

<style scoped>
.payment-table__status {
    --tint: rgb(var(--v-theme-success));
}

.payment-table__status.is-inactive {
    --tint: rgb(var(--v-theme-warning));
}

.payment-table__expired {
    color: rgb(var(--v-theme-error));
}
</style>
