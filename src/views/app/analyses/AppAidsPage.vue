<script setup lang="ts">
/**
 * Page « Catalogue des aides suisses » : aides de la Confédération et des cantons romands, par thème. Le canton du profil est
 * présélectionné. Information d’orientation, jamais une décision de droit : chaque fiche renvoie à la page officielle de l’organisme.
 * Les montants fédéraux viennent de `GET /api/legal-parameters`.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { legalParametersApi } from '@/features/aids/api';
import {
    aidLanguage,
    aidText,
    aidThemesPresent,
    defaultAidCanton,
    filterAids,
    formatAidAmount,
    groupAidsByTheme,
    resolveAids,
    type AidCantonFilter
} from '@/features/aids/catalogue';
import { AID_CANTONS, AID_FEDERAL, type AidEntry, type AidTheme, type LegalParameter } from '@/features/aids/types';
import { useAuthStore } from '@/features/auth';

const { t, locale } = useI18n();
const auth = useAuthStore();

const resolved = computed(() => resolveAids(new Date().getFullYear()));
const entries = computed(() => resolved.value?.entries ?? []);
const language = computed(() => aidLanguage(locale.value));

const canton = ref<AidCantonFilter>(defaultAidCanton(auth.user?.canton));
const theme = ref<AidTheme | 'all'>('all');
const query = ref('');
const legal = ref<Map<string, LegalParameter>>(new Map());
const legalYear = ref<number | null>(null);
const legalFailed = ref(false);

/** Le profil a un canton hors catalogue : on le dit, pour ne pas laisser croire qu’il n’existe aucune aide cantonale. */
const profileCantonNotCovered = computed(() => {
    const own = auth.user?.canton?.toUpperCase();
    return !!own && defaultAidCanton(own) === AID_FEDERAL;
});

const cantonItems = computed(() => [
    { title: t('aids.cantonFederal'), value: AID_FEDERAL },
    { title: t('aids.cantonAll'), value: 'all' },
    ...AID_CANTONS.map((code) => ({ title: `${t(`aids.cantons.${code}`)} (${code})`, value: code }))
]);
const themeItems = computed(() => [
    { title: t('aids.themeAll'), value: 'all' },
    ...aidThemesPresent(entries.value).map((value) => ({ title: t(`aids.themes.${value}`), value }))
]);

const visible = computed(() =>
    filterAids(entries.value, { canton: canton.value, theme: theme.value, query: query.value, language: language.value })
);
const groups = computed(() => groupAidsByTheme(visible.value));

const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }));
const verified = (entry: AidEntry): string => dateFormat.value.format(new Date(`${entry.verifiedAt}T12:00:00`));

function scopeLabel(entry: AidEntry): string {
    return entry.scope === AID_FEDERAL ? t('aids.federal') : t(`aids.cantons.${entry.scope}`);
}

function amountsOf(entry: AidEntry): { key: string; label: string; value: string }[] {
    const rows: { key: string; label: string; value: string }[] = [];
    for (const key of entry.amountKeys ?? []) {
        const parameter = legal.value.get(key);
        if (parameter) rows.push({ key, label: t(`aids.amounts.${key}`), value: formatAidAmount(parameter, locale.value) });
    }
    return rows;
}

async function loadLegal() {
    try {
        const result = await legalParametersApi.get(resolved.value?.year);
        legal.value = new Map(result.items.map((item) => [item.key, item]));
        legalYear.value = result.year;
    } catch {
        legalFailed.value = true;
    }
}

onMounted(() => void loadLegal());
</script>

<template>
    <AppPageShell :title="t('aids.title')" :subtitle="t('aids.subtitle')">
        <div class="aids">
            <p class="aids__intro">{{ t('aids.intro') }}</p>
            <p v-if="resolved?.isFallback" class="aids__muted">
                {{ t('aids.fallback', { requested: resolved.requestedYear, year: resolved.year }) }}
            </p>

            <!-- ── 1. Filtres ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('aids.stepFilters') }}</h2>
                </header>
                <div class="aids__filters">
                    <div class="su-field">
                        <label for="aids-canton" class="su-field__label">{{ t('aids.cantonLabel') }}</label>
                        <AppSelect id="aids-canton" v-model="canton" :items="cantonItems" hide-details />
                        <p class="aids__muted">{{ t('aids.cantonHint') }}</p>
                    </div>
                    <div class="su-field">
                        <label for="aids-theme" class="su-field__label">{{ t('aids.themeLabel') }}</label>
                        <AppSelect id="aids-theme" v-model="theme" :items="themeItems" hide-details />
                    </div>
                    <div class="su-field">
                        <label for="aids-search" class="su-field__label">{{ t('aids.searchLabel') }}</label>
                        <v-text-field
                            id="aids-search"
                            v-model="query"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :placeholder="t('aids.searchPlaceholder')"
                        />
                    </div>
                </div>
                <p v-if="profileCantonNotCovered && canton === AID_FEDERAL" class="aids__note">
                    {{ t('aids.cantonNotCovered', { canton: auth.user?.canton }) }}
                </p>
                <p class="aids__muted">{{ t('aids.coverageNote') }}</p>
            </section>

            <!-- ── 2. Aides ── -->
            <section class="su-section" aria-live="polite">
                <header class="su-section__head">
                    <h2>{{ t('aids.stepResults') }}</h2>
                    <span class="aids__count">{{ t('aids.count', { n: visible.length }, visible.length) }}</span>
                </header>

                <p v-if="!visible.length" class="aids__muted">{{ t('aids.empty') }}</p>

                <template v-else>
                    <div v-for="group in groups" :key="group.theme" class="aids__group">
                        <h3 class="aids__theme">{{ t(`aids.themes.${group.theme}`) }}</h3>

                        <article v-for="entry in group.items" :key="entry.id" class="su-box su-box--soft aids__card">
                            <header class="aids__head">
                                <h4>{{ aidText(entry, language).title }}</h4>
                                <span class="aids__scope">{{ scopeLabel(entry) }}</span>
                            </header>
                            <p class="aids__summary">{{ aidText(entry, language).summary }}</p>

                            <div v-if="amountsOf(entry).length" class="aids__amounts">
                                <div v-for="amount in amountsOf(entry)" :key="amount.key" class="su-kv">
                                    <span>{{ amount.label }}</span>
                                    <span>{{ amount.value }}</span>
                                </div>
                            </div>

                            <h5 class="aids__label">{{ t('aids.conditionsTitle') }}</h5>
                            <ul class="aids__conditions">
                                <li v-for="condition in aidText(entry, language).conditions" :key="condition">{{ condition }}</li>
                            </ul>
                            <p v-if="aidText(entry, language).note" class="aids__muted">{{ aidText(entry, language).note }}</p>

                            <p class="aids__org">
                                <span class="aids__label">{{ t('aids.organizationLabel') }}</span>
                                {{ aidText(entry, language).organization }}
                            </p>
                            <p class="aids__foot">
                                <a class="su-link" :href="entry.url" target="_blank" rel="noopener noreferrer">{{ t('aids.official') }}</a>
                                <span class="aids__muted">{{ t('aids.verifiedAt', { date: verified(entry) }) }}</span>
                            </p>
                        </article>
                    </div>
                    <p v-if="legalFailed" class="aids__muted">{{ t('aids.legalFailed') }}</p>
                    <p v-else-if="legalYear" class="aids__muted">{{ t('aids.amountsHint', { year: legalYear }) }}</p>
                </template>
            </section>

            <!-- ── Lecture ── -->
            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('aids.howTitle') }}</h2>
                </header>
                <ul class="aids__conditions">
                    <li>{{ t('aids.howOrientation') }}</li>
                    <li>{{ t('aids.howCantonal') }}</li>
                    <li>{{ t('aids.howVerified') }}</li>
                </ul>
            </section>
        </div>
    </AppPageShell>
</template>

<style scoped>
.aids {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
}

.aids__intro {
    margin: 0;
    max-width: 44rem;
    font-size: 14px;
    line-height: 1.5;
}

.aids__muted {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.aids__note {
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 1.4;
}

.aids__filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    align-items: start;
    gap: 16px;
}

.aids__count {
    color: var(--gray);
    font-size: 13px;
}

.aids__group {
    display: grid;
    gap: 12px;
    margin-bottom: 24px;
}

.aids__theme {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
}

.aids__card {
    display: grid;
    gap: 8px;
}

.aids__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 12px;
}

.aids__head h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
}

.aids__scope {
    flex: none;
    color: var(--gray);
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.aids__summary {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
}

.aids__amounts {
    max-width: 28rem;
}

.aids__label {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 12.5px;
    font-weight: 700;
}

.aids__conditions {
    display: grid;
    gap: 6px;
    margin: 0;
    padding-left: 1.25rem;
    font-size: 13.5px;
    line-height: 1.4;
}

.aids__org {
    margin: 4px 0 0;
    font-size: 13.5px;
}

.aids__org .aids__label {
    display: block;
    margin: 0;
}

.aids__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 16px;
    margin: 4px 0 0;
}
</style>
