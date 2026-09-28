<script setup lang="ts">
/**
 * « Sécurité, conformité & multi-devises » : validation en deux étapes, appareils connectés,
 * devises (CHF par défaut) et hébergement des données en Suisse.
 */
import { CircleCheckIcon, DeviceLaptopIcon, DeviceMobileIcon, DeviceTabletIcon, DotsVerticalIcon, ShieldLockIcon } from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';

const digits = ['4', '8', '2', '7', '', ''];

const devices = [
    { icon: DeviceLaptopIcon, tone: 'primary', title: 'Ordinateur portable', label: 'Lausanne · actif maintenant', current: true },
    { icon: DeviceMobileIcon, tone: 'violet', title: 'Smartphone', label: 'Genève · il y a 2 h', current: false },
    { icon: DeviceTabletIcon, tone: 'slate', title: 'Tablette', label: 'Fribourg · il y a 3 j', current: false, revoke: true }
];

const currencies = [
    { code: 'CHF', tone: 'red', title: 'Franc suisse', label: 'Devise principale', badge: 'Par défaut' },
    { code: 'EUR', tone: 'primary', title: 'Euro', label: '1 EUR = 0.94 CHF', badge: '' },
    { code: 'USD', tone: 'green', title: 'Dollar américain', label: '1 USD = 0.80 CHF', badge: '' }
];
</script>

<template>
    <MockStage label="Validation en deux étapes, appareils connectés et devises gérées dans Spendup, données hébergées en Suisse">
        <div class="mk-card mk-card--lg mk-card--pad" style="left: 1.4em; top: 2.8em; width: 20.6em">
            <div class="mk-flex">
                <span class="mk-ico mk-tone-primary"><ShieldLockIcon /></span>
                <div>
                    <span class="mk-title">Validation en deux étapes</span>
                    <span class="mk-label" style="margin-top: 0.15em">Code de votre application d’authentification</span>
                </div>
            </div>
            <div class="sec-code">
                <span v-for="(d, i) in digits" :key="i" :class="{ 'is-filled': d, 'is-active': i === 4 }">{{ d }}</span>
            </div>
            <div class="mk-between">
                <span class="mk-flex" style="gap: 0.45em">
                    <svg class="sec-ring" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(17,26,51,0.08)" stroke-width="2.4" />
                        <circle
                            cx="10"
                            cy="10"
                            r="8"
                            fill="none"
                            stroke="rgb(93,135,255)"
                            stroke-width="2.4"
                            stroke-linecap="round"
                            stroke-dasharray="50.3"
                            stroke-dashoffset="30"
                            transform="rotate(-90 10 10)"
                        />
                    </svg>
                    <span class="mk-label" style="color: var(--mk-ink-soft)">Nouveau code dans <b>0:12</b></span>
                </span>
                <span class="mk-chip mk-tone-primary">Valider</span>
            </div>
        </div>

        <div class="mk-card mk-card--pad" style="left: 1.4em; top: 17.4em; width: 20.6em">
            <div class="mk-between" style="margin-bottom: 0.3em">
                <span class="mk-title">Devises</span>
                <span class="mk-label">Taux du jour</span>
            </div>
            <div class="mk-list">
                <div v-for="c in currencies" :key="c.code" class="mk-row">
                    <span class="mk-ico mk-ico--sm sec-cur" :class="`mk-tone-${c.tone}`">{{ c.code }}</span>
                    <div class="mk-row__main">
                        <span class="mk-title">{{ c.title }}</span>
                        <span class="mk-label">{{ c.label }}</span>
                    </div>
                    <span v-if="c.badge" class="mk-chip mk-tone-red">{{ c.badge }}</span>
                    <span v-else class="sec-radio"></span>
                </div>
            </div>
        </div>

        <div class="mk-card mk-card--lg mk-card--pad" style="left: 23.4em; top: 5.4em; width: 21.2em">
            <div class="mk-between" style="margin-bottom: 0.3em">
                <span class="mk-title">Appareils connectés</span>
                <span class="mk-chip mk-tone-slate">3 appareils</span>
            </div>
            <div class="mk-list">
                <div v-for="d in devices" :key="d.title" class="mk-row">
                    <span class="mk-ico mk-ico--sm" :class="`mk-tone-${d.tone}`"><component :is="d.icon" /></span>
                    <div class="mk-row__main">
                        <span class="mk-title">{{ d.title }}</span>
                        <span class="mk-label">
                            <i v-if="d.current" class="sec-live"></i>
                            {{ d.label }}
                        </span>
                    </div>
                    <span v-if="d.current" class="mk-chip mk-tone-green">Cet appareil</span>
                    <span v-else-if="d.revoke" class="sec-revoke">Révoquer</span>
                    <span v-else class="sec-more"><DotsVerticalIcon /></span>
                </div>
            </div>
            <div class="mk-divider"></div>
            <div class="sec-checks">
                <span><CircleCheckIcon />Chiffrement AES-256 au repos</span>
                <span><CircleCheckIcon />Conforme à la nLPD suisse</span>
            </div>
        </div>

        <div class="mk-float mk-bob" style="left: 24.8em; top: 26em">
            <svg class="sec-flag" viewBox="0 0 32 32" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="#DA291C" />
                <rect x="13" y="6" width="6" height="20" fill="#fff" />
                <rect x="6" y="13" width="20" height="6" fill="#fff" />
            </svg>
            <div>
                <span class="mk-title">Données hébergées en Suisse</span>
                <span class="mk-label">Chiffrées au repos et en transit</span>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.sec-code {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.45em;
    margin: 1.1em 0 1em;
}

.sec-code span {
    display: grid;
    place-items: center;
    height: 3.1em;
    border: 0.08em solid var(--mk-line);
    border-radius: 0.75em;
    color: var(--mk-ink);
    font-size: 1em;
    font-weight: 700;
    background: var(--mk-canvas);
}

.sec-code span.is-filled {
    border-color: rgba(var(--mk-primary), 0.25);
    background: rgba(var(--mk-primary), 0.06);
    font-size: 1.25em;
    height: 2.48em;
}

.sec-code span.is-active {
    position: relative;
    border-color: rgb(var(--mk-primary));
    background: var(--mk-surface);
    box-shadow: 0 0 0 0.22em rgba(var(--mk-primary), 0.15);
}

.sec-code span.is-active::after {
    content: '';
    width: 0.1em;
    height: 1.3em;
    border-radius: 99em;
    background: rgb(var(--mk-primary));
}

.sec-ring {
    width: 1.3em;
    height: 1.3em;
}

.sec-cur {
    font-size: 0.62em;
    font-weight: 750;
    letter-spacing: 0.02em;
    width: 2.9em;
    height: 2.9em;
    border-radius: 0.95em;
}

.sec-radio {
    width: 1.05em;
    height: 1.05em;
    border: 0.12em solid rgba(17, 26, 51, 0.16);
    border-radius: 50%;
}

.sec-live {
    display: inline-block;
    width: 0.55em;
    height: 0.55em;
    margin-right: 0.2em;
    border-radius: 50%;
    background: rgb(var(--mk-green));
    box-shadow: 0 0 0 0.25em rgba(var(--mk-green), 0.18);
    vertical-align: 0.05em;
}

.sec-revoke {
    display: inline-flex;
    align-items: center;
    height: 1.75em;
    padding: 0 0.75em;
    border: 0.1em solid rgba(var(--mk-red), 0.35);
    border-radius: 99em;
    color: rgb(var(--mk-red));
    font-size: 0.66em;
    font-weight: 660;
}

.sec-more {
    display: grid;
    place-items: center;
    color: var(--mk-muted);
}

.sec-more svg {
    width: 1em;
    height: 1em;
}

.sec-checks {
    display: flex;
    flex-direction: column;
    gap: 0.45em;
    color: var(--mk-ink-soft);
    font-size: 0.7em;
    font-weight: 560;
}

.sec-checks span {
    display: flex;
    align-items: center;
    gap: 0.45em;
}

.sec-checks svg {
    width: 1.2em;
    height: 1.2em;
    color: rgb(var(--mk-green));
}

.sec-flag {
    flex: none;
    width: 2.3em;
    height: 2.3em;
}
</style>
