import { useI18n } from 'vue-i18n';

/** Formate un montant en francs suisses ; `null` donne le tiret de la plateforme. */
export function useTaxMoney() {
    const { t, locale } = useI18n();
    return (value: number | null): string => {
        if (value == null) return t('common.emptyValue');
        return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'CHF' }).format(value);
    };
}
