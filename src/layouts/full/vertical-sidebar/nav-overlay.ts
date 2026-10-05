/** Helpers a11y / layout de l’overlay nav mobile (testables sans Vue). */

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

export function shouldCloseMobileNavOnPathChange(previousPath: string | undefined, lgAndUp: boolean): boolean {
    return previousPath != null && !lgAndUp;
}

export function getOverlayFocusable(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
    );
}

/** Piège Tab dans `root`. Retourne true si le défaut a été empêché. */
export function trapOverlayTab(event: KeyboardEvent, root: HTMLElement): boolean {
    if (event.key !== 'Tab') return false;
    const items = getOverlayFocusable(root);
    if (items.length === 0) return false;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
            event.preventDefault();
            last.focus();
            return true;
        }
        return false;
    }
    if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
        return true;
    }
    return false;
}

export function createBodyScrollLock() {
    let previousOverflow = '';
    let locked = false;

    function lock() {
        if (locked) return;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        locked = true;
    }

    function unlock() {
        if (!locked) return;
        document.body.style.overflow = previousOverflow;
        locked = false;
    }

    return { lock, unlock };
}
