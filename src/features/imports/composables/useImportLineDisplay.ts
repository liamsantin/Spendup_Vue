import { computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import { formatOperationDate } from '@/features/transactions/format';
import { formatImportAmount, hasUncorrectableIssue, importAmountTone, importLineDoubt, isAutoIgnored } from '@/features/imports/format';
import { willCreatePaymentMethod, willCreateTier } from '@/features/imports/payload';
import type { ImportLine } from '@/features/imports/types';

export type ImportLineBadge = { key: string; label: string; tone: 'warning' | 'error' | 'info' | 'success' | 'muted' };

/** Libellés, montant et badges d’une ligne importée (tableau desktop + liste mobile). */
export function useImportLineDisplay(line: Ref<ImportLine>, currency: Ref<string | null | undefined>) {
    const { t, locale } = useI18n();
    const categoriesStore = useCategoriesStore();
    const tiersStore = useTiersStore();
    const paymentMethodsStore = usePaymentMethodsStore();

    const dateLabel = computed(() => (line.value.operationDate ? formatOperationDate(line.value.operationDate, locale.value) : '—'));

    const amountText = computed(() => formatImportAmount(line.value.amount, line.value.currency || currency.value, locale.value));
    const amountTone = computed(() => importAmountTone(line.value.amount));

    const categoryLabel = computed(() => {
        const id = line.value.categoryPublicId;
        if (id) return categoriesStore.findByPublicId(id)?.name ?? null;
        return null;
    });

    const tierLabel = computed(() => {
        const id = line.value.tierPublicId;
        if (id) return tiersStore.findByPublicId(id)?.name ?? null;
        return line.value.unmatchedTierName;
    });

    const paymentMethodLabel = computed(() => {
        const id = line.value.paymentMethodPublicId;
        if (id) return paymentMethodsStore.allKnownItems().find((item) => item.publicId === id)?.label ?? null;
        return line.value.unmatchedPaymentMethodName;
    });

    const labelText = computed(() => line.value.label?.trim() || t('importsPage.lines.noLabel'));

    const badges = computed<ImportLineBadge[]>(() => {
        const item = line.value;
        const list: ImportLineBadge[] = [];
        const doubt = importLineDoubt(item);
        if (item.status === 'aValider' && doubt === 'duplicate') {
            list.push({ key: 'duplicate', label: t('importsPage.lines.badges.duplicate'), tone: 'warning' });
        } else if (doubt === 'duplicateInFile') {
            list.push({
                key: 'duplicateInFile',
                label: t('importsPage.lines.badges.duplicateInFile', { n: item.duplicateOfLineNumber }),
                tone: 'info'
            });
        }
        if (item.unmatchedCategoryName) {
            list.push({
                key: 'unknownCategory',
                label: t('importsPage.lines.badges.unknownCategory', { name: item.unmatchedCategoryName }),
                tone: 'warning'
            });
        }
        // Valeur du fichier non reconnue : l’entité sera créée au commit.
        if (willCreateTier(item)) {
            list.push({ key: 'newTier', label: t('importsPage.lines.badges.newTier', { name: item.unmatchedTierName }), tone: 'success' });
        }
        if (willCreatePaymentMethod(item)) {
            list.push({
                key: 'newPaymentMethod',
                label: t('importsPage.lines.badges.newPaymentMethod', { name: item.unmatchedPaymentMethodName }),
                tone: 'success'
            });
        }
        if (item.recurringDue) {
            list.push({
                key: 'recurringDue',
                label: t('importsPage.lines.badges.recurringDue', {
                    name: item.recurringDue.name,
                    date: formatOperationDate(item.recurringDue.scheduledAt, locale.value)
                }),
                tone: 'info'
            });
        }
        if (item.categorySuggested && item.categoryPublicId) {
            list.push({ key: 'suggested', label: t('importsPage.lines.badges.suggested'), tone: 'info' });
        }
        if (isAutoIgnored(item)) {
            list.push({ key: 'autoIgnored', label: t('importsPage.lines.badges.autoIgnored'), tone: 'muted' });
        } else if (item.status === 'erreur' && item.issues.length) {
            list.push({ key: 'issue', label: item.issues[0].message, tone: 'error' });
        }
        if (item.isEdited) list.push({ key: 'edited', label: t('importsPage.lines.badges.edited'), tone: 'muted' });
        return list;
    });

    const uncorrectable = computed(() => hasUncorrectableIssue(line.value));

    return { dateLabel, amountText, amountTone, categoryLabel, tierLabel, paymentMethodLabel, labelText, badges, uncorrectable };
}
