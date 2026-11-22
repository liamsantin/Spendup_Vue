import { describe, expect, it } from 'vitest';
import { applyNavOrder, moveNavId, shiftNavId } from '../navOrder';

const items = ['dashboard', 'finances', 'planning', 'wealth', 'tools'].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((i) => i.id);

describe('applyNavOrder', () => {
    it('garde l’ordre par défaut sans ordre sauvegardé', () => {
        expect(ids(applyNavOrder(items, []))).toEqual(ids(items));
    });

    it('applique l’ordre sauvegardé et garde Tableau de bord en tête', () => {
        expect(ids(applyNavOrder(items, ['tools', 'wealth', 'dashboard', 'planning', 'finances']))).toEqual([
            'dashboard',
            'tools',
            'wealth',
            'planning',
            'finances'
        ]);
    });

    it('ignore les ids disparus et les doublons, et place une nouvelle section après sa voisine', () => {
        expect(ids(applyNavOrder(items, ['wealth', 'ghost', 'wealth', 'finances', 'planning']))).toEqual([
            'dashboard',
            'wealth',
            'tools',
            'finances',
            'planning'
        ]);
    });
});

describe('moveNavId', () => {
    const list = ['a', 'b', 'c', 'd'];

    it('place avant ou après la cible', () => {
        expect(moveNavId(list, 'd', 'b', false)).toEqual(['a', 'd', 'b', 'c']);
        expect(moveNavId(list, 'a', 'c', true)).toEqual(['b', 'c', 'a', 'd']);
    });

    it('ne change rien sur soi-même ou un id inconnu', () => {
        expect(moveNavId(list, 'b', 'b', true)).toEqual(list);
        expect(moveNavId(list, 'x', 'b', true)).toEqual(list);
    });
});

describe('shiftNavId', () => {
    it('décale d’un cran sans sortir des bornes', () => {
        expect(shiftNavId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
        expect(shiftNavId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
        expect(shiftNavId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    });
});
