<script setup lang="ts">
/**
 * Sommaire des pages légales : construit à partir des titres `section > h2` du conteneur parent,
 * ajoute une ancre à chacun et surligne la section en cours de lecture.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';

interface TocEntry {
    id: string;
    label: string;
}

const root = ref<HTMLElement | null>(null);
const entries = ref<TocEntry[]>([]);
const activeId = ref<string | null>(null);
let observer: IntersectionObserver | null = null;

function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

onMounted(() => {
    const container = root.value?.parentElement;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>(':scope > section > h2'));
    entries.value = headings.map((heading) => {
        if (!heading.id) heading.id = slugify(heading.textContent ?? '');
        return { id: heading.id, label: (heading.textContent ?? '').trim() };
    });

    activeId.value = entries.value[0]?.id ?? null;

    if (typeof IntersectionObserver === 'undefined') return;
    observer = new IntersectionObserver(
        (observed) => {
            const visible = observed.filter((entry) => entry.isIntersecting);
            if (visible.length) activeId.value = (visible[0].target as HTMLElement).id;
        },
        { rootMargin: '-120px 0px -60% 0px' }
    );
    headings.forEach((heading) => observer?.observe(heading));
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
    <nav ref="root" class="legal-toc" aria-label="Sommaire">
        <p class="legal-toc__title">Sommaire</p>
        <ol>
            <li v-for="entry in entries" :key="entry.id">
                <a :href="`#${entry.id}`" :class="{ 'is-active': entry.id === activeId }">{{ entry.label }}</a>
            </li>
        </ol>
    </nav>
</template>
