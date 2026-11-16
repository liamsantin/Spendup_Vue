import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { TAX_CANTONS } from '@/features/tax/types';

/** Cantons suisses avec leur nom complet (traduit), triés par nom : valeur = abréviation à deux lettres. */
export function useCantonItems() {
    const { t, locale } = useI18n();
    return computed(() =>
        TAX_CANTONS.map((code) => ({ title: t(`taxPage.cantons.${code}`), value: code })).sort((a, b) =>
            a.title.localeCompare(b.title, locale.value)
        )
    );
}
