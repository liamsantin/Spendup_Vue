<script setup lang="ts">
/**
 * Galerie des maquettes marketing (dev uniquement) : contrôle visuel de chaque scène,
 * à plusieurs largeurs, sans passer par les landing pages.
 */
import { type Component } from 'vue';

const modules = import.meta.glob<{ default: Component }>('@/components/frontpages/mockups/scenes/*.vue', { eager: true });
const scenes = Object.entries(modules)
    .map(([path, mod]) => ({ name: path.split('/').pop()?.replace('.vue', '') ?? path, component: mod.default }))
    .sort((a, b) => a.name.localeCompare(b.name));
</script>

<template>
    <main class="mockups-gallery">
        <h1>Maquettes marketing</h1>
        <section v-for="scene in scenes" :key="scene.name" :id="scene.name" class="mockups-gallery__item">
            <h2>{{ scene.name }}</h2>
            <div class="mockups-gallery__row">
                <div class="mockups-gallery__frame" style="width: 620px"><component :is="scene.component" /></div>
                <div class="mockups-gallery__frame" style="width: 340px"><component :is="scene.component" /></div>
            </div>
        </section>
    </main>
</template>

<style scoped>
.mockups-gallery {
    min-height: 100vh;
    padding: 32px;
    background: #f7f8fc;
    font-family: 'Outfit', system-ui, sans-serif;
}

.mockups-gallery h1 {
    margin: 0 0 24px;
    font-size: 24px;
}

.mockups-gallery__item {
    margin-bottom: 48px;
}

.mockups-gallery h2 {
    margin: 0 0 12px;
    font-size: 15px;
    color: #4a5572;
}

.mockups-gallery__row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 32px;
}

.mockups-gallery__frame {
    max-width: 100%;
    border: 1px dashed #d4d9e6;
    border-radius: 12px;
    background: #fff;
}
</style>
