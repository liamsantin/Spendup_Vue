<script setup lang="ts">
import { computed, reactive, ref, type Component } from 'vue';
import {
    ArrowRightIcon,
    ArrowUpRightIcon,
    BrandInstagramIcon,
    CheckIcon,
    CopyIcon,
    DatabaseExportIcon,
    LifebuoyIcon,
    MailIcon,
    MailOpenedIcon,
    MapPinIcon,
    SendIcon
} from 'vue-tabler-icons';
import { ApiError } from '@/features/auth/api';
import {
    buildContactMailto,
    contactEmail,
    sendContactMessage,
    CONTACT_MESSAGE_MAX,
    CONTACT_NAME_MAX,
    CONTACT_SUBJECTS,
    validateContactForm,
    type ContactFormErrors,
    type ContactFormValues
} from './contact-form';

const email = contactEmail();

const form = reactive<ContactFormValues>({
    name: '',
    email: '',
    subject: 'question',
    message: '',
    consent: false
});

const errors = ref<ContactFormErrors>({});
const submitted = ref(false);
const sending = ref(false);
const sent = ref(false);
const sendError = ref<string | null>(null);
const copied = ref(false);
/** Champ piège invisible : un robot le remplit, un humain ne le voit pas. */
const website = ref('');

/** Lien de secours : le même message, ouvert dans la messagerie du visiteur. */
const fallbackMailto = computed(() => (email ? buildContactMailto(email, form) : null));

const messageLength = computed(() => form.message.trim().length);

function revalidate() {
    if (submitted.value) errors.value = validateContactForm(form);
}

async function onSubmit() {
    if (sending.value) return;
    submitted.value = true;
    sendError.value = null;
    errors.value = validateContactForm(form);
    if (Object.keys(errors.value).length) return;
    sending.value = true;
    try {
        await sendContactMessage(form, website.value);
        sent.value = true;
    } catch (e) {
        sendError.value =
            e instanceof ApiError && e.status === 400 && e.message
                ? e.message
                : 'L’envoi n’a pas abouti. Réessayez dans un instant ou écrivez-nous directement.';
    } finally {
        sending.value = false;
    }
}

function resetForm() {
    Object.assign(form, { name: '', email: '', subject: 'question', message: '', consent: false });
    errors.value = {};
    submitted.value = false;
    sent.value = false;
    sendError.value = null;
}

async function copyEmail() {
    if (!email) return;
    try {
        await navigator.clipboard.writeText(email);
        copied.value = true;
        window.setTimeout(() => (copied.value = false), 2000);
    } catch {
        // presse-papiers indisponible : l'adresse reste affichée et sélectionnable
    }
}

type ContactChannel = { icon: Component; title: string; text: string } & (
    | { action: 'copy' }
    | { to: string; linkLabel: string }
    | { href: string; linkLabel: string }
);

const channels = computed<ContactChannel[]>(() => [
    ...(email
        ? [
              {
                  icon: MailIcon,
                  title: 'Écrivez-nous',
                  text: 'Une question, une idée, un retour ? Nous lisons chaque message.',
                  action: 'copy' as const
              }
          ]
        : []),
    {
        icon: LifebuoyIcon,
        title: 'Déjà utilisateur ?',
        text: 'Précisez l’adresse e-mail de votre compte : nous retrouverons plus vite votre espace.',
        to: '/auth?tab=login',
        linkLabel: 'Se connecter'
    },
    {
        icon: DatabaseExportIcon,
        title: 'Vos données personnelles',
        text: 'Chiffrement, hébergement en Suisse et vos droits au sens de la nLPD, expliqués simplement.',
        to: '/protection-des-donnees',
        linkLabel: 'Protection des données'
    },
    {
        icon: BrandInstagramIcon,
        title: 'Suivez-nous',
        text: 'Les nouveautés et les coulisses de Spend.Up, sur Instagram.',
        href: 'https://www.instagram.com/spendupapp/',
        linkLabel: '@spendupapp'
    }
]);
</script>

<template>
    <div class="contact-page">
        <section class="contact-main">
            <v-container class="max-width-1218">
                <div class="contact-layout">
                    <div class="contact-intro">
                        <div class="contact-hero__copy">
                            <span class="contact-kicker su-hero-in">Contact</span>
                            <h1 class="textPrimary su-hero-in" style="--su-in-delay: 80ms">
                                Une question&nbsp;? <span class="s-primary">Parlons‑en.</span>
                            </h1>
                            <p class="text-medium-emphasis su-hero-in" style="--su-in-delay: 160ms">
                                Support, données personnelles, presse ou partenariat : écrivez-nous, une personne de l’équipe Spend.Up vous
                                répond directement.
                            </p>
                        </div>
                        <aside class="contact-aside">
                            <article v-for="channel in channels" :key="channel.title" class="contact-channel">
                                <span class="contact-channel__icon"><component :is="channel.icon" size="21" stroke-width="1.7" /></span>
                                <div>
                                    <h3 class="textPrimary">{{ channel.title }}</h3>
                                    <p class="text-medium-emphasis">{{ channel.text }}</p>
                                    <button
                                        v-if="'action' in channel && email"
                                        type="button"
                                        class="contact-channel__email"
                                        @click="copyEmail"
                                    >
                                        <span>{{ email }}</span>
                                        <component :is="copied ? CheckIcon : CopyIcon" size="16" />
                                        <span class="contact-sr">{{ copied ? 'Adresse copiée' : 'Copier l’adresse' }}</span>
                                    </button>
                                    <RouterLink v-else-if="'to' in channel" :to="channel.to" class="contact-channel__link">
                                        {{ channel.linkLabel }}
                                        <ArrowRightIcon size="16" />
                                    </RouterLink>
                                    <a
                                        v-else-if="'href' in channel"
                                        :href="channel.href"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="contact-channel__link"
                                    >
                                        {{ channel.linkLabel }}
                                        <ArrowUpRightIcon size="16" />
                                    </a>
                                </div>
                            </article>

                            <div class="contact-swiss">
                                <svg viewBox="0 0 32 32" aria-hidden="true">
                                    <rect width="32" height="32" fill="#E4002B" />
                                    <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                                    <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                                </svg>
                                <div>
                                    <strong>Une équipe et des données en Suisse</strong>
                                    <span><MapPinIcon size="14" /> Hébergement chez Infomaniak, à Genève</span>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <div class="contact-card">
                        <div v-if="sent" class="contact-sent" role="status">
                            <span class="contact-sent__icon"><MailOpenedIcon size="30" stroke-width="1.6" /></span>
                            <h2 class="textPrimary">Message envoyé</h2>
                            <p class="text-medium-emphasis">
                                Merci, nous avons bien reçu votre message. Nous vous répondrons à l’adresse
                                <strong>{{ form.email.trim() }}</strong
                                >, en général sous deux jours ouvrables.
                            </p>
                            <v-btn color="primary" variant="outlined" size="large" class="text-none" @click="resetForm">
                                Écrire un autre message
                            </v-btn>
                        </div>

                        <form v-else class="contact-form" novalidate @submit.prevent="onSubmit">
                            <header class="contact-form__head">
                                <h2 class="textPrimary">Envoyer un message</h2>
                                <p class="text-medium-emphasis">Tous les champs sont nécessaires pour vous répondre.</p>
                            </header>

                            <fieldset class="contact-subjects">
                                <legend>Votre demande concerne</legend>
                                <label
                                    v-for="subject in CONTACT_SUBJECTS"
                                    :key="subject.value"
                                    class="contact-subject"
                                    :class="{ 'is-active': form.subject === subject.value }"
                                >
                                    <input v-model="form.subject" type="radio" name="subject" :value="subject.value" />
                                    <CheckIcon v-if="form.subject === subject.value" size="15" stroke-width="2.4" />
                                    {{ subject.label }}
                                </label>
                            </fieldset>

                            <div class="contact-form__row">
                                <v-text-field
                                    v-model="form.name"
                                    label="Nom et prénom"
                                    variant="outlined"
                                    color="primary"
                                    autocomplete="name"
                                    :maxlength="CONTACT_NAME_MAX"
                                    :error-messages="errors.name"
                                    @update:model-value="revalidate"
                                />
                                <v-text-field
                                    v-model="form.email"
                                    label="Adresse e-mail"
                                    type="email"
                                    variant="outlined"
                                    color="primary"
                                    autocomplete="email"
                                    :error-messages="errors.email"
                                    @update:model-value="revalidate"
                                />
                            </div>

                            <v-textarea
                                v-model="form.message"
                                label="Votre message"
                                variant="outlined"
                                color="primary"
                                rows="6"
                                auto-grow
                                :maxlength="CONTACT_MESSAGE_MAX"
                                :counter="CONTACT_MESSAGE_MAX"
                                :counter-value="() => messageLength"
                                :error-messages="errors.message"
                                @update:model-value="revalidate"
                            />

                            <v-checkbox
                                v-model="form.consent"
                                color="primary"
                                density="comfortable"
                                :error-messages="errors.consent"
                                @update:model-value="revalidate"
                            >
                                <template #label>
                                    <span class="contact-consent">
                                        J’accepte que ces informations soient utilisées uniquement pour répondre à ma demande (voir la
                                        <RouterLink to="/protection-des-donnees" @click.stop>page Protection des données</RouterLink>).
                                    </span>
                                </template>
                            </v-checkbox>

                            <!-- Champ piège : hors écran, ignoré des lecteurs d'écran et du remplissage automatique -->
                            <div class="contact-trap" aria-hidden="true">
                                <label for="contact-website">Site web</label>
                                <input id="contact-website" v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" />
                            </div>

                            <p v-if="sendError" class="contact-form__error" role="alert">
                                {{ sendError }}
                                <template v-if="fallbackMailto">
                                    <a :href="fallbackMailto">Ouvrir le message dans ma messagerie</a>
                                </template>
                            </p>

                            <div class="contact-form__actions">
                                <v-btn
                                    type="submit"
                                    color="primary"
                                    size="x-large"
                                    flat
                                    class="text-none px-8"
                                    :loading="sending"
                                    :disabled="sending"
                                >
                                    <SendIcon size="18" class="me-2" />
                                    Envoyer le message
                                </v-btn>
                                <span class="contact-form__hint"
                                    >Votre message nous parvient directement, sans ouvrir votre messagerie.</span
                                >
                            </div>
                        </form>
                    </div>
                </div>
            </v-container>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/contact';
</style>
