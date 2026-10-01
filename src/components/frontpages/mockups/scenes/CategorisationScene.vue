<script setup lang="ts">
/**
 * Parcours « Catégorisation & organisation » : opérations classées par catégorie et tags,
 * règle automatique de catégorisation mise en avant.
 */
import {
    ArrowRightIcon,
    BusIcon,
    CircleCheckIcon,
    FirstAidKitIcon,
    HashIcon,
    HomeIcon,
    MountainIcon,
    SettingsIcon,
    ShoppingCartIcon,
    WandIcon
} from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { signedAmount } from '../format';

const transactions = [
    {
        icon: ShoppingCartIcon,
        tone: 'amber',
        title: 'Migros Lausanne-Flon',
        label: '24 sept. · UBS Compte privé',
        category: 'Alimentation',
        tags: [] as string[],
        amount: -84.35,
        matched: true
    },
    {
        icon: BusIcon,
        tone: 'teal',
        title: 'CFF · Genève → Brigue',
        label: '23 sept. · Visa ••42',
        category: 'Transports',
        tags: ['#vacances'],
        amount: -62
    },
    {
        icon: HomeIcon,
        tone: 'violet',
        title: 'Loyer · Régie du Léman',
        label: '1er sept. · UBS Compte privé',
        category: 'Logement',
        tags: [],
        amount: -1890
    },
    {
        icon: MountainIcon,
        tone: 'primary',
        title: 'Bains de Lavey',
        label: '20 sept. · TWINT',
        category: 'Loisirs',
        tags: ['#vacances'],
        amount: -36
    },
    {
        icon: FirstAidKitIcon,
        tone: 'red',
        title: 'Pharmacie du Flon',
        label: '18 sept. · PostFinance',
        category: 'Santé',
        tags: ['#impôts'],
        amount: -48.9
    }
];
</script>

<template>
    <MockStage label="Opérations classées par catégorie et par tag dans Spend.Up, avec une règle de catégorisation automatique">
        <MockWindow title="Spend.Up · Opérations" style="left: 1.2em; top: 1.5em; width: 43.6em; height: 23.8em">
            <div style="margin-bottom: 0.9em">
                <span class="mk-eyebrow">Septembre 2026</span>
                <span class="mk-title" style="font-size: 1.1em; margin-top: 0.2em">Opérations</span>
            </div>
            <div class="mk-card" style="position: relative; padding: 0.3em 1.1em">
                <div class="mk-list">
                    <div v-for="tx in transactions" :key="tx.title" class="mk-row cat-row" :class="{ 'cat-row--matched': tx.matched }">
                        <span class="mk-ico mk-ico--sm" :class="`mk-tone-${tx.tone}`"><component :is="tx.icon" /></span>
                        <div class="mk-row__main">
                            <span class="mk-title">{{ tx.title }}</span>
                            <span class="mk-label">{{ tx.label }}</span>
                        </div>
                        <div class="cat-chips">
                            <span class="mk-chip" :class="`mk-tone-${tx.tone}`"><i class="cat-dot"></i>{{ tx.category }}</span>
                            <span v-for="tag in tx.tags" :key="tag" class="mk-chip cat-tag">{{ tag }}</span>
                            <span v-if="tx.matched" class="mk-chip mk-tone-primary cat-auto"><WandIcon />Auto</span>
                        </div>
                        <span class="mk-row__end mk-amount mk-amount--neg" style="width: 5.6em">{{ signedAmount(tx.amount) }}</span>
                    </div>
                </div>
            </div>
        </MockWindow>

        <div class="mk-card mk-card--lg cat-rule" style="left: 17.8em; top: 23.2em; width: 26.4em">
            <div class="mk-between">
                <div class="mk-flex">
                    <span class="mk-ico mk-ico--solid mk-tone-primary"><WandIcon /></span>
                    <div>
                        <span class="mk-title">Règle automatique</span>
                        <span class="mk-label" style="margin-top: 0.1em">Catégorisation · créée le 3 mars 2026</span>
                    </div>
                </div>
                <span class="cat-toggle"><i></i></span>
            </div>

            <div class="cat-rule__logic">
                <div class="cat-rule__cond"><span class="cat-rule__kw">Si</span> le libellé contient <b>« Migros »</b></div>
                <ArrowRightIcon class="cat-rule__arrow" />
                <span class="mk-chip mk-tone-amber" style="font-size: 0.7em"><i class="cat-dot"></i>Alimentation</span>
            </div>

            <div class="mk-between" style="margin-top: 0.85em">
                <span class="mk-flex" style="gap: 0.4em">
                    <CircleCheckIcon class="cat-rule__ok" />
                    <span class="mk-sub" style="font-size: 0.68em"><b>Appliquée à 38 opérations</b> · dont 3 ce mois</span>
                </span>
                <span class="mk-label" style="font-size: 0.62em">Modifier</span>
            </div>
        </div>

        <div class="mk-float mk-bob" style="left: 2.6em; top: 26.9em">
            <span class="mk-ico mk-tone-violet"><SettingsIcon /></span>
            <div>
                <span class="mk-title">12 règles actives</span>
                <span class="mk-label">412 opérations classées</span>
            </div>
        </div>

        <div class="mk-float mk-bob mk-bob--late" style="left: 32.2em; top: 0.4em">
            <span class="mk-ico mk-tone-slate"><HashIcon /></span>
            <div>
                <span class="mk-title">Nouveau tag · #travaux</span>
                <span class="mk-label">ajouté à 4 opérations</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.cat-row {
    min-height: 2.8em;
}

.cat-row--matched {
    margin: 0 -0.6em;
    padding-inline: 0.6em;
    border-radius: 0.7em;
    background: rgba(var(--mk-primary), 0.06);
    box-shadow: inset 0 0 0 0.06em rgba(var(--mk-primary), 0.25);
}

.cat-row--matched + .mk-row {
    border-top-color: transparent;
}

.cat-chips {
    display: flex;
    align-items: center;
    gap: 0.35em;
    flex: none;
    width: 14em;
}

.cat-dot {
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    background: currentColor;
}

.cat-tag {
    --tone: var(--mk-slate);
    color: var(--mk-ink-soft);
    background: rgba(17, 26, 51, 0.06);
}

.cat-auto svg {
    width: 1.05em;
    height: 1.05em;
}

.cat-rule {
    padding: 1.05em 1.2em 1em;
    border: 0.12em solid rgba(var(--mk-primary), 0.35);
    box-shadow:
        0 0 0 0.35em rgba(var(--mk-primary), 0.08),
        var(--mk-shadow-lg);
}

.cat-toggle {
    position: relative;
    flex: none;
    width: 2.3em;
    height: 1.35em;
    border-radius: 99em;
    background: rgb(var(--mk-primary));
}

.cat-toggle i {
    position: absolute;
    top: 0.15em;
    right: 0.15em;
    width: 1.05em;
    height: 1.05em;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0.1em 0.25em rgba(17, 26, 51, 0.25);
}

.cat-rule__logic {
    display: flex;
    align-items: center;
    gap: 0.6em;
    margin-top: 0.9em;
    padding: 0.7em 0.8em;
    border-radius: 0.8em;
    background: var(--mk-canvas);
}

.cat-rule__cond {
    color: var(--mk-ink-soft);
    font-size: 0.76em;
    white-space: nowrap;
}

.cat-rule__cond b {
    color: var(--mk-ink);
    font-weight: 680;
}

.cat-rule__kw {
    display: inline-block;
    margin-right: 0.3em;
    padding: 0.1em 0.45em;
    border-radius: 0.4em;
    color: #fff;
    font-size: 0.86em;
    font-weight: 700;
    background: rgb(var(--mk-primary));
}

.cat-rule__arrow {
    flex: none;
    width: 1em;
    height: 1em;
    color: var(--mk-muted);
}

.cat-rule__ok {
    flex: none;
    width: 1em;
    height: 1em;
    color: rgb(var(--mk-green));
}

.cat-rule .mk-sub b {
    color: var(--mk-ink);
    font-weight: 650;
}
</style>
