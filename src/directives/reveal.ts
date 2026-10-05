import type { Directive, DirectiveBinding } from 'vue';

/**
 * `v-reveal` — révèle l’élément quand il entre dans le viewport (fade + translate).
 *
 * Usage : `<section v-reveal>` ou `<div v-reveal="{ delay: 120 }">`.
 * Ajoutez `data-reveal-stagger` sur un parent pour décaler automatiquement ses enfants directs.
 * Respecte `prefers-reduced-motion` (aucune animation, contenu visible immédiatement).
 */

interface RevealOptions {
    /** Délai supplémentaire en ms avant la révélation. */
    delay?: number;
    /** Seuil de visibilité (0–1). */
    threshold?: number;
}

const REVEAL_CLASS = 'su-reveal';
const VISIBLE_CLASS = 'su-reveal--visible';

let observer: IntersectionObserver | null = null;

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const getObserver = (): IntersectionObserver | null => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return null;
    if (observer) return observer;

    observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const el = entry.target as HTMLElement;
                el.classList.add(VISIBLE_CLASS);
                observer?.unobserve(el);
            }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    return observer;
};

const applyStagger = (el: HTMLElement): void => {
    if (!el.hasAttribute('data-reveal-stagger')) return;
    const step = Number(el.getAttribute('data-reveal-stagger')) || 90;
    Array.from(el.children).forEach((child, index) => {
        (child as HTMLElement).style.setProperty('--su-reveal-delay', `${index * step}ms`);
    });
};

export const revealDirective: Directive<HTMLElement, RevealOptions | undefined> = {
    mounted(el: HTMLElement, binding: DirectiveBinding<RevealOptions | undefined>) {
        if (prefersReducedMotion()) return;

        const io = getObserver();
        if (!io) return;

        el.classList.add(REVEAL_CLASS);
        if (binding.value?.delay) el.style.setProperty('--su-reveal-delay', `${binding.value.delay}ms`);
        applyStagger(el);

        // Déjà visible au chargement (au-dessus du pli) → révélation immédiate sans attendre l’observer.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
            requestAnimationFrame(() => el.classList.add(VISIBLE_CLASS));
            return;
        }

        io.observe(el);
    },
    unmounted(el: HTMLElement) {
        observer?.unobserve(el);
    }
};

export default revealDirective;
