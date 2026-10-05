import { BuildingBankIcon, BuildingCommunityIcon, BuildingIcon, HelpCircleIcon, UserIcon } from 'vue-tabler-icons';
import { TIER_NATURES, type TierNature } from '@/features/tiers/types';

export const TIER_NATURE_ICONS = {
    person: UserIcon,
    company: BuildingIcon,
    organization: BuildingCommunityIcon,
    administration: BuildingBankIcon,
    unknown: HelpCircleIcon
} as const satisfies Record<TierNature, typeof UserIcon>;

export const TIER_CREATE_NATURES: TierNature[] = [...TIER_NATURES];
