import { BuildingBankIcon, BuildingIcon, HelpCircleIcon, UserIcon, UsersIcon } from 'vue-tabler-icons';
import { TIER_NATURES, type TierNature } from '@/features/tiers/types';

/** Pictogrammes trait par nature : personne, immeuble, groupe, bâtiment public, point d’interrogation. */
export const TIER_NATURE_ICONS = {
    person: UserIcon,
    company: BuildingIcon,
    organization: UsersIcon,
    administration: BuildingBankIcon,
    unknown: HelpCircleIcon
} as const satisfies Record<TierNature, typeof UserIcon>;

/** Teinte Swiss (`su-tile--…`, `--t-…-bg` / `--t-…-ink`) par nature : personne teal, entreprise bleu, organisation violet, administration ambre, non précisé gris. */
export type TierNatureTone = 'teal' | 'blue' | 'violet' | 'amber' | 'gray';

export const TIER_NATURE_TONES = {
    person: 'teal',
    company: 'blue',
    organization: 'violet',
    administration: 'amber',
    unknown: 'gray'
} as const satisfies Record<TierNature, TierNatureTone>;

/** Classe de carré teinté 36 px du kit pour une nature. */
export function tierNatureTileClass(nature: TierNature): string {
    const tone = TIER_NATURE_TONES[nature];
    return tone === 'gray' ? 'su-tile' : `su-tile su-tile--${tone}`;
}

export const TIER_CREATE_NATURES: TierNature[] = [...TIER_NATURES];
