<script setup lang="ts">
/** Une ligne du formulaire : un montant, ou deux (canton / Confédération) pour une ligne qui se dédouble. */
defineOptions({ name: 'TaxLineRow' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTaxMoney } from '@/features/tax/composables/useTaxMoney';
import TaxHelpTip from '@/features/tax/components/TaxHelpTip.vue';
import type { TaxCompetence, TaxLine } from '@/features/tax/types';

const props = defineProps<{
    line: TaxLine;
    /** Montants de l'an dernier pour la personne affichée : une référence, jamais une valeur. */
    previous?: Partial<Record<TaxCompetence, number>>;
    /** Texte affiché par compétence (brouillon en cours de frappe, sinon montant inscrit). */
    shown: Record<TaxCompetence, string>;
    /** Aucune valeur pour la personne affichée. */
    empty: boolean;
    help: string;
    /** Compétence dont le montant peut être recopié sur l'autre, ou `null`. */
    copyFrom: 'cantonal' | 'federal' | null;
    saving: boolean;
}>();

const emit = defineEmits<{
    draft: [competence: TaxCompetence, value: string | number | null];
    commit: [competence: TaxCompetence];
    copy: [from: 'cantonal' | 'federal'];
}>();

const { t } = useI18n();
const money = useTaxMoney();

const hint = computed(() => {
    const before = props.previous ?? {};
    if (props.line.splitsCompetence) {
        const parts: string[] = [];
        if (before.cantonal != null) parts.push(`${t('taxPage.cantonal')} ${money(before.cantonal)}`);
        if (before.federal != null) parts.push(`${t('taxPage.federal')} ${money(before.federal)}`);
        return parts.length ? t('taxPage.previousYear', { value: parts.join(' · ') }) : '';
    }
    return before.both != null ? t('taxPage.previousYear', { value: money(before.both) }) : '';
});
</script>

<template>
    <div class="tax-form tax-line" :class="{ 'is-empty': empty }">
        <div v-if="line.splitsCompetence" class="tax-form__row">
            <p class="tax-form__label">
                {{ line.label }}
                <TaxHelpTip :text="help" />
            </p>
            <div class="tax-form__field tax-form__split">
                <v-text-field
                    :model-value="shown.cantonal"
                    :label="t('taxPage.cantonal')"
                    :placeholder="t('taxPage.emptyCell')"
                    color="primary"
                    variant="outlined"
                    hide-details
                    @update:model-value="emit('draft', 'cantonal', $event)"
                    @blur="emit('commit', 'cantonal')"
                />
                <v-text-field
                    :model-value="shown.federal"
                    :label="t('taxPage.federal')"
                    :placeholder="t('taxPage.emptyCell')"
                    color="primary"
                    variant="outlined"
                    hide-details
                    @update:model-value="emit('draft', 'federal', $event)"
                    @blur="emit('commit', 'federal')"
                />
            </div>
            <template v-if="hint">
                <span />
                <p class="tax-line__hint">{{ hint }}</p>
            </template>
            <template v-if="copyFrom">
                <span />
                <button type="button" class="su-btn su-btn--ghost tax-copy" :disabled="saving" @click="emit('copy', copyFrom)">
                    {{ copyFrom === 'cantonal' ? t('taxPage.simple.copyToFederal') : t('taxPage.simple.copyToCantonal') }}
                </button>
            </template>
        </div>
        <div v-else class="tax-form__row">
            <label class="tax-form__label" :for="`tax-line-${line.code}`">
                {{ line.label }}
                <TaxHelpTip :text="help" />
            </label>
            <div class="tax-form__field">
                <v-text-field
                    :id="`tax-line-${line.code}`"
                    :model-value="shown.both"
                    :placeholder="t('taxPage.emptyCell')"
                    color="primary"
                    variant="outlined"
                    hide-details
                    @update:model-value="emit('draft', 'both', $event)"
                    @blur="emit('commit', 'both')"
                />
            </div>
            <template v-if="hint">
                <span />
                <p class="tax-line__hint">{{ hint }}</p>
            </template>
        </div>
    </div>
</template>
