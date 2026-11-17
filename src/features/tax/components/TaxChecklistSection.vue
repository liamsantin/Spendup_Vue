<script setup lang="ts">
/** Pièces attendues de la déclaration : à cocher quand elles sont reçues. */
defineOptions({ name: 'TaxChecklistSection' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TaxChecklistItem } from '@/features/tax/types';

const props = defineProps<{
    items: TaxChecklistItem[];
    saving: boolean;
}>();

const emit = defineEmits<{
    toggle: [code: string, complete: boolean];
    generate: [];
}>();

const { t } = useI18n();

const received = computed(() => props.items.filter((item) => item.received).length);

function onToggle(item: TaxChecklistItem, event: Event) {
    const input = event.target;
    if (input instanceof HTMLInputElement) emit('toggle', item.code, input.checked);
}
</script>

<template>
    <section class="tax-form">
        <h2 class="tax-form__legend">{{ t('taxPage.checklist.title') }}</h2>
        <p class="tax-muted">
            {{ items.length ? t('taxPage.checklist.progress', { received, total: items.length }) : t('taxPage.checklist.empty') }}
        </p>
        <article v-for="item in items" :key="item.code" class="tax-fiche">
            <label class="tax-piece">
                <input type="checkbox" :checked="item.received" :disabled="saving" @change="onToggle(item, $event)" />
                <span :class="{ 'is-received': item.received }">{{ item.label }}</span>
            </label>
            <small v-if="item.required && !item.received" class="tax-check is-toCheck">{{ t('taxPage.checklist.required') }}</small>
        </article>
        <div class="tax-form__actions">
            <button type="button" class="su-btn" :disabled="saving" @click="emit('generate')">
                {{ t('taxPage.checklist.generate') }}
            </button>
        </div>
    </section>
</template>
