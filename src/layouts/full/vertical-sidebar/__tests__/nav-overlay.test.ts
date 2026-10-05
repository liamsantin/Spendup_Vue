import { describe, expect, it } from 'vitest';
import { createBodyScrollLock, shouldCloseMobileNavOnPathChange, trapOverlayTab } from '../nav-overlay';

describe('shouldCloseMobileNavOnPathChange', () => {
    it('ferme uniquement après une nav réelle en dessous de lg', () => {
        expect(shouldCloseMobileNavOnPathChange(undefined, false)).toBe(false);
        expect(shouldCloseMobileNavOnPathChange('/app', false)).toBe(true);
        expect(shouldCloseMobileNavOnPathChange('/app', true)).toBe(false);
    });
});

describe('createBodyScrollLock', () => {
    it('restaure l’overflow précédent', () => {
        document.body.style.overflow = 'auto';
        const lock = createBodyScrollLock();
        lock.lock();
        expect(document.body.style.overflow).toBe('hidden');
        lock.unlock();
        expect(document.body.style.overflow).toBe('auto');
        document.body.style.overflow = '';
    });

    it('n’écrase pas overflow si déjà déverrouillé', () => {
        document.body.style.overflow = 'scroll';
        const lock = createBodyScrollLock();
        lock.unlock();
        expect(document.body.style.overflow).toBe('scroll');
        document.body.style.overflow = '';
    });
});

describe('trapOverlayTab', () => {
    it('cycle Tab du dernier vers le premier', () => {
        const root = document.createElement('div');
        root.innerHTML = '<button id="a">a</button><button id="b">b</button>';
        document.body.appendChild(root);
        const last = root.querySelector<HTMLButtonElement>('#b')!;
        last.focus();
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        const prevented = trapOverlayTab(event, root);
        expect(prevented).toBe(true);
        expect(document.activeElement?.id).toBe('a');
        root.remove();
    });
});
