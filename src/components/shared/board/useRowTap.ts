const TAP_SLOP_PX = 10;

/**
 * Ouverture d’une ligne au premier tap (tactile) : on ne dépend pas du clic synthétique,
 * parfois avalé par le navigateur mobile. Un glissé (scroll) ou un tap sur bouton / lien est ignoré.
 */
export function useRowTap(onTap: () => void, canTap: () => boolean = () => true) {
    let start: { x: number; y: number } | null = null;

    function onTouchstart(event: TouchEvent) {
        const touch = event.touches[0];
        start = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    function onTouchcancel() {
        start = null;
    }

    function onTouchend(event: TouchEvent) {
        const origin = start;
        start = null;
        const touch = event.changedTouches[0];
        if (!origin || !touch || !canTap()) return;
        if (Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > TAP_SLOP_PX) return;
        if (event.target instanceof Element && event.target.closest('button, a')) return;
        // Évite le clic synthétique qui retomberait dans la modale plein écran.
        event.preventDefault();
        onTap();
    }

    return { onTouchstart, onTouchend, onTouchcancel };
}
