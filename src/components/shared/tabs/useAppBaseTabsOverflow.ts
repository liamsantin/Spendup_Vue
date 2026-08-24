import { nextTick, onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

/** Espace réservé aux deux flèches (32px × 2) quand overflow. */
const ARROW_RESERVE_PX = 64;

function asElement(value: unknown): HTMLElement | null {
    if (!value) return null;
    if (value instanceof HTMLElement) return value;
    const maybe = value as { $el?: unknown };
    const el = maybe.$el;
    if (el instanceof HTMLElement) return el;
    // Vue / Vuetify: $el can be a comment node before the real root.
    if (el && typeof el === 'object' && 'nextElementSibling' in el) {
        const next = (el as { nextElementSibling: Element | null }).nextElementSibling;
        if (next instanceof HTMLElement) return next;
    }
    return null;
}

function measureTabsWidth(track: HTMLElement): number {
    const content = track.querySelector<HTMLElement>('.v-slide-group__content');
    if (content && content.scrollWidth > 0) return content.scrollWidth;

    let width = 0;
    track.querySelectorAll<HTMLElement>('.v-tab').forEach((tab) => {
        width += tab.offsetWidth;
    });
    return width;
}

function measureActiveTab(track: HTMLElement, active: HTMLElement) {
    const trackRect = track.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    return {
        width: `${active.offsetWidth}px`,
        height: `${active.offsetHeight}px`,
        transform: `translate(${tabRect.left - trackRect.left + track.scrollLeft}px, ${tabRect.top - trackRect.top}px)`
    };
}

export function useAppBaseTabsOverflow(options: {
    isPilled: MaybeRefOrGetter<boolean>;
    grow: MaybeRefOrGetter<boolean>;
    tabs: MaybeRefOrGetter<unknown>;
    currentValue: MaybeRefOrGetter<string>;
}) {
    const trackRef = ref<HTMLElement | null>(null);
    const rootRef = ref<HTMLElement | null>(null) as Ref<HTMLElement | null>;
    const pillVisible = ref(false);
    const pillAnimate = ref(false);
    const pillStyle = ref<Record<string, string>>({
        width: '0px',
        height: '0px',
        transform: 'translate(0px, 0px)'
    });

    const isOverflowing = ref(false);
    const canScrollPrev = ref(false);
    const canScrollNext = ref(false);

    let resizeObserver: ResizeObserver | null = null;

    function updateScrollState() {
        if (!toValue(options.isPilled) || toValue(options.grow) || !trackRef.value) {
            isOverflowing.value = false;
            canScrollPrev.value = false;
            canScrollNext.value = false;
            return;
        }

        const track = trackRef.value;
        const hostEl = asElement(rootRef.value) ?? (track.closest('.app-base-tabs') as HTMLElement | null);
        if (!hostEl) return;

        const parent = hostEl.parentElement;
        const contentWidthOf = (el: HTMLElement) => {
            const cs = getComputedStyle(el);
            const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
            return Math.max(0, el.clientWidth - pad);
        };
        // Parent content box (header) is the real available width — host can grow with tabs.
        const available = parent ? contentWidthOf(parent) : hostEl.clientWidth;
        if (available <= 0) return;

        const tabsWidth = measureTabsWidth(track);
        const overflowing = tabsWidth > available + 1;
        isOverflowing.value = overflowing;

        if (!overflowing) {
            canScrollPrev.value = false;
            canScrollNext.value = false;
            return;
        }

        // Track contraint (classe --scrollable) : position de scroll réelle.
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (maxScroll > 1) {
            canScrollPrev.value = track.scrollLeft > 1;
            canScrollNext.value = track.scrollLeft < maxScroll - 1;
            return;
        }

        // Layout pas encore appliqué : on suppose qu'on est au début.
        canScrollPrev.value = false;
        canScrollNext.value = tabsWidth > available - ARROW_RESERVE_PX;
    }

    function scrollTabs(direction: -1 | 1) {
        if (!trackRef.value) return;
        const delta = Math.max(140, Math.floor(trackRef.value.clientWidth * 0.65));
        trackRef.value.scrollBy({ left: direction * delta, behavior: 'smooth' });
    }

    function scrollActiveIntoView() {
        if (!trackRef.value || !isOverflowing.value) return;
        const active = trackRef.value.querySelector<HTMLElement>('.v-tab--selected');
        active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    }

    function updatePill(animate = false) {
        if (!toValue(options.isPilled) || !trackRef.value) return;

        const active = trackRef.value.querySelector<HTMLElement>('.v-tab--selected');
        if (!active || active.offsetWidth <= 0 || active.offsetHeight <= 0) return;

        pillStyle.value = measureActiveTab(trackRef.value, active);
        pillVisible.value = true;
        pillAnimate.value = animate;
    }

    function handleWindowResize() {
        updateScrollState();
        updatePill(false);
    }

    function scheduleLayoutUpdate(animatePill = false) {
        nextTick(() => {
            updateScrollState();
            // 2e frame : après application de --scrollable / flèches.
            requestAnimationFrame(() => {
                updateScrollState();
                updatePill(animatePill);
                if (animatePill) scrollActiveIntoView();
            });
        });
    }

    function onTrackScroll() {
        updateScrollState();
        updatePill(false);
    }

    watch(
        () => toValue(options.currentValue),
        () => scheduleLayoutUpdate(true)
    );
    watch(
        () => toValue(options.isPilled),
        (enabled) => {
            if (!enabled) {
                pillVisible.value = false;
                pillAnimate.value = false;
                isOverflowing.value = false;
                return;
            }
            scheduleLayoutUpdate(false);
        }
    );
    watch(
        () => toValue(options.grow),
        () => scheduleLayoutUpdate(false)
    );
    watch(
        () => toValue(options.tabs),
        () => scheduleLayoutUpdate(false),
        { deep: true }
    );
    watch(isOverflowing, () => {
        nextTick(() => {
            updateScrollState();
            updatePill(false);
        });
    });

    onMounted(() => {
        scheduleLayoutUpdate(false);
        window.addEventListener('resize', handleWindowResize);

        nextTick(() => {
            if (typeof ResizeObserver === 'undefined') return;

            resizeObserver = new ResizeObserver(() => {
                updateScrollState();
                updatePill(false);
            });

            const observe = (value: unknown) => {
                if (value instanceof Element) {
                    resizeObserver?.observe(value);
                    return;
                }
                const el = asElement(value);
                if (el) resizeObserver?.observe(el);
            };

            const rootEl = asElement(rootRef.value);
            observe(rootEl);
            if (rootEl?.parentElement) observe(rootEl.parentElement);
            observe(trackRef.value);
            observe(trackRef.value?.querySelector('.v-slide-group__content'));
        });
    });

    onBeforeUnmount(() => {
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleWindowResize);
    });

    return {
        trackRef,
        rootRef,
        pillVisible,
        pillAnimate,
        pillStyle,
        isOverflowing,
        canScrollPrev,
        canScrollNext,
        scrollTabs,
        updateScrollState,
        updatePill,
        onTrackScroll
    };
}
