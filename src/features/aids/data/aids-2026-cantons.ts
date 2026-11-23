import type { AidEntry, AidScope, AidTheme } from '@/features/aids/types';

/**
 * Catalogue 2026, cantons alémaniques, tessinois et valaisan (les cantons romands et Berne sont dans `aids-2026.ts`).
 * Chaque fiche pointe vers une page officielle (administration ou caisse de compensation cantonale) ouverte et relue le 2026-11-22.
 * Aucun montant ni seuil de revenu n’est copié ici : on renvoie à l’organisme. Les pages sont dans la langue du canton
 * (allemand, italien), ce que la fiche signale. Une aide dont la page officielle n’a pas pu être confirmée n’est pas listée :
 * voir « Pas encore couverts » dans la roadmap.
 */
const V = '2026-11-22';

type Kind = 'premium' | 'family' | 'scholarship' | 'social';
type PageLanguage = 'de' | 'it' | 'fr';
type Pair<T> = [fr: T, en: T];

const KINDS: Record<Kind, { slug: string; theme: AidTheme; title: Pair<string> }> = {
    premium: {
        slug: 'premium-subsidy',
        theme: 'health',
        title: ['Réduction des primes d’assurance-maladie', 'Health insurance premium reduction']
    },
    family: { slug: 'family-allowance', theme: 'family', title: ['Allocations familiales cantonales', 'Cantonal family allowances'] },
    scholarship: { slug: 'scholarship', theme: 'education', title: ['Bourses et prêts d’études', 'Study grants and loans'] },
    social: { slug: 'social-assistance', theme: 'social', title: ['Aide sociale', 'Social assistance'] }
};

const LANGUAGE_NOTE: Record<PageLanguage, Pair<string> | null> = {
    de: ['La page officielle est en allemand.', 'The official page is in German.'],
    it: ['La page officielle est en italien.', 'The official page is in Italian.'],
    fr: null
};

interface Spec {
    scope: AidScope;
    kind: Kind;
    language: PageLanguage;
    url: string;
    /** Nom officiel de l’organisme, dans sa langue. */
    organization: string;
    summary: Pair<string>;
    conditions: Pair<string[]>;
    note?: Pair<string>;
}

function aid(spec: Spec): AidEntry {
    const kind = KINDS[spec.kind];
    const language = LANGUAGE_NOTE[spec.language];
    const note = (index: 0 | 1): string | undefined => {
        const parts = [spec.note?.[index], language?.[index]].filter((part): part is string => !!part);
        return parts.length ? parts.join(' ') : undefined;
    };
    return {
        id: `${spec.scope.toLowerCase()}-${kind.slug}`,
        theme: kind.theme,
        scope: spec.scope,
        url: spec.url,
        verifiedAt: V,
        texts: {
            fr: {
                title: kind.title[0],
                summary: spec.summary[0],
                conditions: spec.conditions[0],
                organization: spec.organization,
                ...(note(0) ? { note: note(0) } : {})
            },
            en: {
                title: kind.title[1],
                summary: spec.summary[1],
                conditions: spec.conditions[1],
                organization: spec.organization,
                ...(note(1) ? { note: note(1) } : {})
            }
        }
    };
}

export const AIDS_2026_CANTONS: AidEntry[] = [
    /* ── Zurich ── */
    aid({
        scope: 'ZH',
        kind: 'premium',
        language: 'de',
        url: 'https://www.zh.ch/de/gesundheit/praemienverbilligung_krankenversicherung.html',
        organization: 'Sozialversicherungsanstalt des Kantons Zürich (SVA Zürich)',
        summary: [
            'Aide du canton de Zurich pour les primes de l’assurance de base. Le droit n’est pas automatique : la SVA le fixe d’après la dernière taxation fiscale, sur demande.',
            'Help from the canton of Zurich with basic insurance premiums. The right is not automatic: the SVA sets it from the latest tax assessment, on application.'
        ],
        conditions: [
            [
                'Être domicilié dans le canton de Zurich et assuré à la LAMal',
                'Retourner le formulaire que la SVA envoie chaque printemps pour l’année suivante'
            ],
            [
                'Live in the canton of Zurich and be insured under the LAMal',
                'Return the form the SVA sends every spring for the following year'
            ]
        ]
    }),
    aid({
        scope: 'ZH',
        kind: 'family',
        language: 'de',
        url: 'https://www.zh.ch/de/soziales/familienzulagen.html',
        organization: 'Kantonales Sozialamt, Abteilung Sozialversicherungen (caisses d’allocations familiales sous surveillance cantonale)',
        summary: [
            'Allocations pour enfant et de formation versées par une caisse d’allocations familiales. La page cantonale explique qui y a droit et à qui s’adresser.',
            'Child and training allowances paid by a family allowance fund. The cantonal page explains who is entitled and whom to contact.'
        ],
        conditions: [
            [
                'Salarié·e : la demande passe par l’employeur et sa caisse d’allocations',
                'Sans activité lucrative : demande auprès de la SVA Zürich'
            ],
            ['Employee: apply through your employer and its allowance fund', 'No gainful activity: apply to the SVA Zürich']
        ]
    }),
    aid({
        scope: 'ZH',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.zh.ch/de/bildung/berufs-studien-laufbahnberatung/ausbildungsbeitraege.html',
        organization: 'Amt für Jugend und Berufsberatung, Stipendien',
        summary: [
            'Bourses et prêts pour une formation reconnue, quand les moyens de la personne en formation et de sa famille ne suffisent pas. La demande se fait en ligne.',
            'Grants and loans for recognised training when the trainee’s and family’s means are not enough. The application is made online.'
        ],
        conditions: [
            [
                'Avoir son domicile de soutien dans le canton de Zurich et suivre une formation reconnue',
                'Déposer la demande avant le 31 juillet (formation qui débute en août) ou le 31 janvier (début en février)'
            ],
            [
                'Have your support residence in the canton of Zurich and follow recognised training',
                'Apply before 31 July (training starting in August) or 31 January (starting in February)'
            ]
        ],
        note: [
            'Le portail de demande change : suivez le lien de la page officielle.',
            'The application portal is changing: follow the link on the official page.'
        ]
    }),
    aid({
        scope: 'ZH',
        kind: 'social',
        language: 'de',
        url: 'https://www.zh.ch/de/soziales/sozialhilfe.html',
        organization: 'Sozialdienst de la commune de domicile ; Kantonales Sozialamt (appui aux communes)',
        summary: [
            'Aide financière et accompagnement pour les personnes qui ne peuvent pas couvrir leurs besoins. La demande se fait auprès de la commune de domicile.',
            'Financial help and support for people who cannot cover their needs. The application is made to your municipality of residence.'
        ],
        conditions: [
            ['Prendre contact avec le service social de sa commune de domicile', 'Le droit est examiné selon les normes de la CSIAS'],
            ['Contact the social service of your municipality of residence', 'The right is assessed according to the SKOS guidelines']
        ]
    }),

    /* ── Lucerne ── */
    aid({
        scope: 'LU',
        kind: 'premium',
        language: 'de',
        url: 'https://www.was-luzern.ch/praemienverbilligung',
        organization: 'WAS Ausgleichskasse Luzern',
        summary: [
            'Aide du canton de Lucerne pour les primes de l’assurance de base. La demande est annuelle, avec un calcul d’après la situation fiscale.',
            'Help from the canton of Lucerne with basic insurance premiums. The application is yearly, with a calculation based on your tax situation.'
        ],
        conditions: [
            [
                'Être domicilié fiscalement dans le canton de Lucerne au 1er janvier de l’année de droit et assuré à la LAMal',
                'Déposer la demande avant le 31 octobre de l’année précédente : une demande tardive n’ouvre droit qu’aux mois suivants'
            ],
            [
                'Be tax-resident in the canton of Lucerne on 1 January of the year of entitlement and insured under the LAMal',
                'Apply before 31 October of the previous year: a late application only gives entitlement for the following months'
            ]
        ]
    }),
    aid({
        scope: 'LU',
        kind: 'family',
        language: 'de',
        url: 'https://www.was-luzern.ch/familienzulagen',
        organization: 'WAS Ausgleichskasse Luzern',
        summary: [
            'Allocations familiales pour les salariés, indépendants et personnes sans activité lucrative à situation financière modeste.',
            'Family allowances for employees, the self-employed and people without gainful activity in a modest financial situation.'
        ],
        conditions: [
            [
                'Un seul ayant droit par enfant : le droit prioritaire dépend de la garde, du domicile et du lieu de travail',
                'Envoyer le formulaire d’inscription par courrier ou via le formulaire de contact'
            ],
            [
                'One entitled person per child: priority depends on custody, residence and place of work',
                'Send the registration form by post or through the contact form'
            ]
        ]
    }),
    aid({
        scope: 'LU',
        kind: 'scholarship',
        language: 'de',
        url: 'https://beruf.lu.ch/Beratung_und_Unterstuetzung/Finanzielle_Unterstuetzung/Fachstelle_Stipendien/Gesuch_einreichen',
        organization: 'Dienststelle Berufs- und Weiterbildung (DBW), Fachstelle Stipendien',
        summary: [
            'Bourses et prêts d’études. Un calculateur permet d’estimer le droit ; la première demande passe par le portail des bourses.',
            'Study grants and loans. A calculator estimates the entitlement; the first application goes through the grants portal.'
        ],
        conditions: [
            [
                'Avoir son domicile dans le canton de Lucerne',
                'Déposer la demande au plus tard trois mois après le début de l’année de formation, avec le contrat d’apprentissage ou la confirmation d’admission'
            ],
            [
                'Live in the canton of Lucerne',
                'Apply no later than three months after the start of the training year, with the apprenticeship contract or admission confirmation'
            ]
        ]
    }),
    aid({
        scope: 'LU',
        kind: 'social',
        language: 'de',
        url: 'https://disg.lu.ch/themen/Existenzsicherung_Sozialhilfe',
        organization: 'Sozialdienst de la commune de domicile ; Dienststelle Soziales und Gesellschaft (DISG)',
        summary: [
            'Aide financière et accompagnement pour les personnes dans le besoin. La demande se fait auprès de la commune de domicile ; le canton coordonne et conseille les communes.',
            'Financial help and support for people in need. The application is made to your municipality of residence; the canton coordinates and advises the municipalities.'
        ],
        conditions: [
            [
                'S’adresser au service social de sa commune de domicile',
                'Les aides spéciales (recouvrement, avances sur pensions) sont aussi communales'
            ],
            [
                'Contact the social service of your municipality of residence',
                'Special aids (debt recovery, maintenance advances) are also municipal'
            ]
        ]
    }),

    /* ── Uri ── */
    aid({
        scope: 'UR',
        kind: 'premium',
        language: 'de',
        url: 'https://www.svsuri.ch/dienstleistungen/pr%C3%A4mienverbilligung-ipv',
        organization: 'Sozialversicherungsstelle Uri (SVS Uri)',
        summary: [
            'Aide du canton d’Uri pour les primes de l’assurance de base. Pour les personnes imposées ordinairement, la décision est envoyée d’office, sans inscription.',
            'Help from the canton of Uri with basic insurance premiums. For people ordinarily taxed, the decision is sent automatically, with no registration.'
        ],
        conditions: [
            [
                'Être domicilié dans le canton d’Uri au 1er janvier',
                'Une inscription est nécessaire pour l’imposition à la source, les nouveaux arrivants et les couples à domiciles séparés, avec des échéances propres'
            ],
            [
                'Live in the canton of Uri on 1 January',
                'Registration is needed for taxation at source, new arrivals and couples living apart, with their own deadlines'
            ]
        ]
    }),
    aid({
        scope: 'UR',
        kind: 'family',
        language: 'de',
        url: 'https://www.svsuri.ch/dienstleistungen/familienzulagen-fak-flg',
        organization: 'Sozialversicherungsstelle Uri (SVS Uri)',
        summary: [
            'Allocations familiales pour les salariés, indépendants et personnes sans activité lucrative à situation économique modeste.',
            'Family allowances for employees, the self-employed and people without gainful activity in a modest economic situation.'
        ],
        conditions: [
            ['Remplir le formulaire d’inscription correspondant à votre statut', 'Les salariés passent en général par leur employeur'],
            ['Fill in the registration form matching your status', 'Employees generally go through their employer']
        ]
    }),
    aid({
        scope: 'UR',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.ur.ch/bildung/1292',
        organization: 'Bildungs- und Kulturdirektion des Kantons Uri',
        summary: [
            'Bourses et prêts d’études. La demande vaut pour l’année en cours et n’a pas d’effet rétroactif.',
            'Study grants and loans. The application covers the current year and has no retroactive effect.'
        ],
        conditions: [
            [
                'Avoir son domicile dans le canton d’Uri',
                'Déposer la demande au plus tard fin septembre, avec une confirmation de la formation en cours'
            ],
            ['Live in the canton of Uri', 'Apply by the end of September at the latest, with confirmation of your current training']
        ]
    }),

    /* ── Schwyz ── */
    aid({
        scope: 'SZ',
        kind: 'premium',
        language: 'de',
        url: 'https://www.sva-sz.ch/dienstleistungen/pr%C3%A4mienverbilligung-ipv',
        organization: 'Sozialversicherungsanstalt des Kantons Schwyz (SVA Schwyz)',
        summary: [
            'Aide du canton de Schwyz pour les primes de l’assurance de base, versée directement à l’assureur. L’inscription se fait en ligne ou sur papier.',
            'Help from the canton of Schwyz with basic insurance premiums, paid directly to the insurer. Registration is online or on paper.'
        ],
        conditions: [
            ['Avoir une situation économique modeste', 'S’inscrire avant le 31 décembre de l’année de droit (délai de forclusion)'],
            ['Be in a modest economic situation', 'Register before 31 December of the year of entitlement (final deadline)']
        ]
    }),
    aid({
        scope: 'SZ',
        kind: 'family',
        language: 'de',
        url: 'https://www.sva-sz.ch/dienstleistungen/familienzulagen-fak-flg',
        organization: 'Sozialversicherungsanstalt des Kantons Schwyz (SVA Schwyz), Ausgleichskasse',
        summary: [
            'Allocations familiales pour les salariés, indépendants et personnes sans activité lucrative à situation économique modeste.',
            'Family allowances for employees, the self-employed and people without gainful activity in a modest economic situation.'
        ],
        conditions: [
            ['S’inscrire en ligne ou avec le formulaire PDF', 'Les salariés passent par leur employeur'],
            ['Register online or with the PDF form', 'Employees go through their employer']
        ]
    }),
    aid({
        scope: 'SZ',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.sz.ch/behoerden/verwaltung/bildungsdepartement/amt-fuer-berufsbildung/ausbildungsfinanzierung.html/8756-8758-8802-9466-9469-11332',
        organization: 'Amt für Berufsbildung, Stipendienstelle',
        summary: [
            'Bourses pour une première formation et prêts pour les formations ultérieures. Le formulaire officiel est à envoyer par courrier avec l’attestation de l’entreprise formatrice.',
            'Grants for a first training and loans for later training. The official form is sent by post with the training company’s confirmation.'
        ],
        conditions: [
            [
                'Avoir son domicile dans le canton de Schwyz',
                'Respecter les délais du 1er juin et du 1er décembre selon le début de la formation : les demandes tardives ne sont pas traitées'
            ],
            [
                'Live in the canton of Schwyz',
                'Meet the 1 June and 1 December deadlines depending on the start of the training: late applications are not processed'
            ]
        ]
    }),
    aid({
        scope: 'SZ',
        kind: 'social',
        language: 'de',
        url: 'https://www.sz.ch/behoerden/verwaltung/departement-des-innern/amt-fuer-gesundheit-und-soziales/soziales.html/8756-8758-8802-9316-9317-12842',
        organization: 'Fürsorgebehörde de la commune de domicile ; Amt für Gesundheit und Soziales (surveillance)',
        summary: [
            'Aide financière pour les personnes dans le besoin. La demande se fait auprès de la commune de domicile ; le canton surveille l’aide sociale des communes.',
            'Financial help for people in need. The application is made to your municipality of residence; the canton supervises municipal social assistance.'
        ],
        conditions: [
            [
                'S’adresser à la commune de domicile avec le formulaire « Gesuch um wirtschaftliche Sozialhilfe »',
                'Un conseil gratuit est proposé'
            ],
            ['Apply to your municipality of residence with the "Gesuch um wirtschaftliche Sozialhilfe" form', 'Free advice is available']
        ]
    }),

    /* ── Obwald ── */
    aid({
        scope: 'OW',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.ow.ch/bildung/4766',
        organization: 'Fachstelle Ausbildungsbeiträge, Bildungs- und Kulturdepartement',
        summary: [
            'Aide quand ni la personne en formation ni ses parents ne peuvent couvrir les coûts. Des prêts existent pour une formation ultérieure.',
            'Help when neither the trainee nor the parents can cover the costs. Loans exist for later training.'
        ],
        conditions: [
            [
                'Avoir son domicile en vue de la formation dans le canton d’Obwald',
                'Déposer le formulaire complet avec les pièces pendant l’année de formation en cours'
            ],
            [
                'Have your training residence in the canton of Obwalden',
                'File the complete form with the documents during the current training year'
            ]
        ]
    }),
    aid({
        scope: 'OW',
        kind: 'social',
        language: 'de',
        url: 'https://www.ow.ch/familie/5447',
        organization: 'Sozialbehörde de la commune de domicile',
        summary: [
            'Aide financière pour les personnes dans le besoin. La demande se fait auprès de l’autorité sociale de la commune de domicile.',
            'Financial help for people in need. The application is made to the social authority of your municipality of residence.'
        ],
        conditions: [
            ['S’adresser à l’autorité sociale de sa commune de domicile', 'Consulter la page officielle pour la marche à suivre'],
            ['Contact the social authority of your municipality of residence', 'See the official page for the procedure']
        ]
    }),

    /* ── Nidwald ── */
    aid({
        scope: 'NW',
        kind: 'premium',
        language: 'de',
        url: 'https://www.aknw.ch/dienstleistungen/praemienverbilligung-ipv',
        organization: 'Ausgleichskasse Nidwalden',
        summary: [
            'Aide du canton de Nidwald pour les primes de l’assurance de base, destinée aux personnes et familles à revenu modeste. Une demande est requise.',
            'Help from the canton of Nidwalden with basic insurance premiums, for people and families on a modest income. An application is required.'
        ],
        conditions: [
            [
                'Les formulaires sont envoyés au printemps aux personnes présumées ayant droit',
                'Un calcul provisoire en ligne est possible ; le délai de dépôt est indiqué sur la page officielle'
            ],
            [
                'Forms are sent in spring to people presumed entitled',
                'A provisional online calculation is possible; the filing deadline is on the official page'
            ]
        ]
    }),
    aid({
        scope: 'NW',
        kind: 'family',
        language: 'de',
        url: 'https://www.aknw.ch/dienstleistungen/familienzulagen-fak-flg',
        organization: 'Ausgleichskasse Nidwalden',
        summary: [
            'Allocations familiales, à demander : elles ne sont pas versées automatiquement. Des formulaires distincts existent selon le statut.',
            'Family allowances, to be claimed: they are not paid automatically. Separate forms exist depending on status.'
        ],
        conditions: [
            ['Salariés, indépendants, ou personnes sans activité à revenu modeste', 'Le régime agricole (FLG) a ses propres formulaires'],
            [
                'Employees, the self-employed, or people without activity on a modest income',
                'The agricultural scheme (FLG) has its own forms'
            ]
        ]
    }),
    aid({
        scope: 'NW',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.nw.ch/_rtr/dienst_9998',
        organization: 'Stipendien und Ausbildungsdarlehen, Bildungsdirektion',
        summary: [
            'Bourses et prêts remboursables pour une formation reconnue. La demande se fait sur le formulaire officiel, avec l’avis de taxation et les justificatifs de formation.',
            'Grants and repayable loans for recognised training. The application is made on the official form, with the tax assessment and training documents.'
        ],
        conditions: [
            [
                'Avoir son domicile de formation dans le canton de Nidwald',
                'Le délai de dépôt est à confirmer auprès du service : la page officielle donne deux durées différentes'
            ],
            [
                'Have your training residence in the canton of Nidwalden',
                'Confirm the filing deadline with the office: the official page gives two different periods'
            ]
        ]
    }),

    /* ── Glaris ── */
    aid({
        scope: 'GL',
        kind: 'premium',
        language: 'de',
        url: 'https://www.gl.ch/verwaltung/finanzen-und-gesundheit/steuern/individuelle-praemienverbilligung-ipv.html/502',
        organization: 'Kantonale Steuerverwaltung Glarus',
        summary: [
            'Aide du canton de Glaris pour les primes de l’assurance de base, versée directement à l’assureur. Une demande est nécessaire, sauf pour les bénéficiaires de PC ou d’aide sociale, dont le droit est calculé d’office.',
            'Help from the canton of Glarus with basic insurance premiums, paid directly to the insurer. An application is needed, except for people on supplementary benefits or social assistance, whose right is calculated automatically.'
        ],
        conditions: [
            [
                'Remplir le formulaire officiel, avec sa notice disponible dès la mi-novembre',
                'Le délai de dépôt est le 31 janvier de l’année de versement'
            ],
            [
                'Fill in the official form, with its leaflet available from mid-November',
                'The filing deadline is 31 January of the year of payment'
            ]
        ]
    }),
    aid({
        scope: 'GL',
        kind: 'family',
        language: 'de',
        url: 'https://www.svgl.ch/dienstleistungen/familienzulagen-fak-flg',
        organization: 'Sozialversicherungen Glarus (Ausgleichskasse)',
        summary: [
            'Allocations familiales, à demander : elles ne sont pas versées automatiquement. Des formulaires distincts existent par catégorie.',
            'Family allowances, to be claimed: they are not paid automatically. Separate forms exist by category.'
        ],
        conditions: [
            ['Salariés, indépendants, ou personnes sans activité à revenu modeste', 'Le régime agricole (FLG) est séparé'],
            ['Employees, the self-employed, or people without activity on a modest income', 'The agricultural scheme (FLG) is separate']
        ]
    }),
    aid({
        scope: 'GL',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.gl.ch/verwaltung/bildung-und-kultur/hoeheres-schulwesen-und-berufsbildung/ausbildungsbeitraege/stipendienstelle/stipendiengesuche-einreichen.html/7674',
        organization: 'Ausbildungsbeiträge (Stipendienstelle), Departement Bildung und Kultur',
        summary: [
            'Bourses d’études. Une demande est à déposer pour chaque année de formation, via le portail my.gl.ch ou sur formulaire signé.',
            'Study grants. An application is filed for each training year, through the my.gl.ch portal or on a signed form.'
        ],
        conditions: [
            [
                'Joindre les pièces de la liste de contrôle',
                'Déposer la demande dans les trois mois qui suivent le début de l’année de formation : un retard réduit les prestations'
            ],
            [
                'Attach the documents on the checklist',
                'File the application within three months of the start of the training year: a delay reduces the benefits'
            ]
        ]
    }),
    aid({
        scope: 'GL',
        kind: 'social',
        language: 'de',
        url: 'https://www.gl.ch/verwaltung/volkswirtschaft-und-inneres/soziales/sozialhilfe.html/978',
        organization: 'Soziale Dienste des Kantons Glarus ; Hauptabteilung Soziales',
        summary: [
            'Aide financière pour les personnes dans le besoin. La demande se fait avec le formulaire « Gesuch um Sozialhilfe » ; le droit est calculé individuellement.',
            'Financial help for people in need. The application uses the "Gesuch um Sozialhilfe" form; the right is calculated individually.'
        ],
        conditions: [
            ['Être domicilié dans le canton de Glaris', 'Joindre les pièces demandées par les Sozialdienste'],
            ['Live in the canton of Glarus', 'Attach the documents requested by the social services']
        ]
    }),

    /* ── Zoug ── */
    aid({
        scope: 'ZG',
        kind: 'premium',
        language: 'de',
        url: 'https://www.zg.ch/de/gesundheit/krankenversicherung/praemienverbilligung',
        organization: 'Ausgleichskasse Zug',
        summary: [
            'Aide du canton de Zoug pour les primes de l’assurance de base. Les bénéficiaires de PC n’ont pas de formulaire ; les autres reçoivent un courrier en février s’ils ont droit, sinon ils demandent en ligne.',
            'Help from the canton of Zug with basic insurance premiums. People on supplementary benefits need no form; others receive a letter in February if entitled, otherwise they apply online.'
        ],
        conditions: [
            [
                'Avoir son domicile fiscal dans le canton de Zoug au 1er janvier et être assuré à la LAMal',
                'Déposer la demande avant le 30 avril'
            ],
            ['Be tax-resident in the canton of Zug on 1 January and insured under the LAMal', 'Apply before 30 April']
        ]
    }),
    aid({
        scope: 'ZG',
        kind: 'family',
        language: 'de',
        url: 'https://www.akzug.ch/dienstleistungen/familienzulagen',
        organization: 'Ausgleichskasse / IV-Stelle Zug',
        summary: [
            'Allocations familiales par catégorie : salariés, indépendants, personnes sans activité sous conditions, agriculture. Les formulaires sont en ligne.',
            'Family allowances by category: employees, the self-employed, people without activity under conditions, agriculture. Forms are online.'
        ],
        conditions: [
            ['Un revenu minimum est exigé des salariés et des indépendants', 'Utiliser les formulaires en ligne de la caisse'],
            ['A minimum income is required for employees and the self-employed', 'Use the fund’s online forms']
        ]
    }),
    aid({
        scope: 'ZG',
        kind: 'social',
        language: 'de',
        url: 'https://www.zg.ch/de/soziales/sozialhilfe/persoenliche-und-wirtschaftliche-sozialhilfe',
        organization: 'Gemeinden (commune de domicile) ; Kantonales Sozialamt',
        summary: [
            'Aide personnelle et économique pour les personnes dans le besoin. La demande se fait auprès de la commune de domicile.',
            'Personal and financial help for people in need. The application is made to your municipality of residence.'
        ],
        conditions: [
            ['S’adresser à sa commune de domicile', 'Une liste d’adresses des services est disponible sur la page officielle'],
            ['Contact your municipality of residence', 'A list of service addresses is on the official page']
        ]
    }),

    /* ── Soleure ── */
    aid({
        scope: 'SO',
        kind: 'premium',
        language: 'de',
        url: 'https://www.akso.ch/dienstleistungen/praemienverbilligung-ipv',
        organization: 'Ausgleichskasse des Kantons Solothurn (AKSO)',
        summary: [
            'Aide du canton de Soleure pour les primes de l’assurance de base. La caisse envoie le formulaire aux personnes susceptibles d’avoir droit, d’après les données fiscales.',
            'Help from the canton of Solothurn with basic insurance premiums. The fund sends the form to people likely to be entitled, based on tax data.'
        ],
        conditions: [
            [
                'Retourner le formulaire dans les 30 jours',
                'Personnes imposées à la source : demande jusqu’au 31 décembre de l’année de droit'
            ],
            ['Return the form within 30 days', 'People taxed at source: apply by 31 December of the year of entitlement']
        ]
    }),
    aid({
        scope: 'SO',
        kind: 'family',
        language: 'de',
        url: 'https://www.akso.ch/dienstleistungen/familienzulagen-fak-flg',
        organization: 'Ausgleichskasse des Kantons Solothurn (AKSO)',
        summary: [
            'Allocations familiales, à demander : elles ne sont pas versées automatiquement. Droit pour les salariés, indépendants et personnes sans activité.',
            'Family allowances, to be claimed: they are not paid automatically. For employees, the self-employed and people without activity.'
        ],
        conditions: [
            ['Utiliser le formulaire correspondant à son statut', 'L’agriculture relève du régime fédéral FLG, avec ses formulaires'],
            ['Use the form matching your status', 'Agriculture falls under the federal FLG scheme, with its own forms']
        ]
    }),
    aid({
        scope: 'SO',
        kind: 'scholarship',
        language: 'de',
        url: 'https://so.ch/verwaltung/departement-fuer-bildung-kultur-und-sport/departementssekretariat/stipendien-und-darlehen/',
        organization: 'Stipendienabteilung, Departement für Bildung, Kultur und Sport',
        summary: [
            'Bourses et prêts pour une formation reconnue. La demande se fait uniquement en ligne sur le portail des bourses.',
            'Grants and loans for recognised training. The application is online only, on the grants portal.'
        ],
        conditions: [
            [
                'Pour une première formation, avoir des parents domiciliés dans le canton de Soleure (ou y avoir vécu deux ans avant la formation)',
                'Respecter les échéances de mi-novembre et de mi-mai selon le début de la formation : un retard réduit l’aide'
            ],
            [
                'For a first training, have parents living in the canton of Solothurn (or have lived there two years before training)',
                'Meet the mid-November and mid-May deadlines depending on the start of training: a delay reduces the aid'
            ]
        ]
    }),
    aid({
        scope: 'SO',
        kind: 'social',
        language: 'de',
        url: 'https://so.ch/verwaltung/departement-des-innern/amt-fuer-gesellschaft-und-soziales/sozialhilfe-und-asyl/sozialhilfe/',
        organization: 'Sozialregion compétente ; Amt für Gesellschaft und Soziales',
        summary: [
            'Aide financière pour les personnes dans le besoin. La demande se fait auprès de la région sociale dont dépend la commune.',
            'Financial help for people in need. The application is made to the social region your municipality belongs to.'
        ],
        conditions: [
            ['S’adresser à la région sociale compétente', 'Le droit suit la loi cantonale et les normes de la CSIAS'],
            ['Contact the competent social region', 'The right follows the cantonal law and the SKOS guidelines']
        ]
    }),

    /* ── Bâle-Ville ── */
    aid({
        scope: 'BS',
        kind: 'premium',
        language: 'de',
        url: 'https://www.bs.ch/themen/finanzielle-hilfe/leistungen/praemienverbilligung',
        organization: 'Amt für Sozialbeiträge (ASB)',
        summary: [
            'Aide de Bâle-Ville pour les primes de l’assurance de base. La demande est obligatoire ; le droit commence le mois qui suit.',
            'Help from Basel-Stadt with basic insurance premiums. An application is mandatory; the right starts the following month.'
        ],
        conditions: [
            [
                'Être domicilié dans le canton depuis le 1er janvier',
                'Arrivée de l’étranger : déposer la demande dans les trois mois pour un droit dès l’arrivée'
            ],
            ['Have lived in the canton since 1 January', 'Arriving from abroad: apply within three months for entitlement from arrival']
        ]
    }),
    aid({
        scope: 'BS',
        kind: 'family',
        language: 'de',
        url: 'https://ak-bs.ch/themen/familienzulagen',
        organization: 'Ausgleichskasse Basel-Stadt (AKBS)',
        summary: [
            'Allocations pour enfant, jusqu’à 16 ans, et de formation, jusqu’à 25 ans.',
            'Child allowances up to age 16 and training allowances up to age 25.'
        ],
        conditions: [
            [
                'Salarié·e : demande auprès de l’employeur',
                'Indépendant·e : demande auprès de sa caisse d’allocations ; sans activité : auprès de la caisse du canton de domicile'
            ],
            [
                'Employee: apply through your employer',
                'Self-employed: apply to your allowance fund; without activity: to the fund of your canton of residence'
            ]
        ]
    }),
    aid({
        scope: 'BS',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.bs.ch/themen/finanzielle-hilfe/leistungen/stipendien',
        organization: 'Amt für Ausbildungsbeiträge',
        summary: [
            'Bourses pour une première formation. Un formulaire de vérification en ligne précède le formulaire officiel, à envoyer avec les pièces.',
            'Grants for a first training. An online check form comes before the official form, to be sent with the documents.'
        ],
        conditions: [
            [
                'Avoir des parents domiciliés à Bâle-Ville (cas particuliers prévus) et respecter la limite d’âge',
                'Déposer la demande avant le 30 septembre (secondaire II) ou le 31 octobre (tertiaire)'
            ],
            [
                'Have parents living in Basel-Stadt (special cases apply) and meet the age limit',
                'Apply before 30 September (upper secondary) or 31 October (tertiary)'
            ]
        ]
    }),
    aid({
        scope: 'BS',
        kind: 'social',
        language: 'de',
        url: 'https://www.bs.ch/themen/finanzielle-hilfe/leistungen/sozialhilfe',
        organization: 'Sozialhilfe Basel-Stadt (Riehen et Bettingen : services sociaux communaux)',
        summary: [
            'Aide pour les personnes à faible revenu et sans fortune. La demande se fait avec le formulaire de demande de soutien, en ligne ou en PDF.',
            'Help for people on a low income without assets. The application uses the support request form, online or as a PDF.'
        ],
        conditions: [
            ['Être domicilié dans le canton de Bâle-Ville', 'Joindre les pièces de la liste de contrôle'],
            ['Live in the canton of Basel-Stadt', 'Attach the documents on the checklist']
        ]
    }),

    /* ── Bâle-Campagne ── */
    aid({
        scope: 'BL',
        kind: 'premium',
        language: 'de',
        url: 'https://www.sva-bl.ch/de/ausgleichskasse/individuelle-praemienverbilligung-ipv/ordentlicher-anspruch',
        organization: 'SVA Basel-Landschaft, Ausgleichskasse',
        summary: [
            'Aide de Bâle-Campagne pour les primes de l’assurance de base. Le formulaire est envoyé automatiquement d’après la taxation fiscale.',
            'Help from Basel-Landschaft with basic insurance premiums. The form is sent automatically based on the tax assessment.'
        ],
        conditions: [
            [
                'Pour le droit ordinaire : domicile fiscal dans le canton depuis au moins deux ans, et assurance à la LAMal',
                'Les personnes arrivées dans le canton et les personnes imposées à la source demandent en ligne avant le 31 décembre'
            ],
            [
                'For the ordinary right: tax residence in the canton for at least two years, and LAMal insurance',
                'People who have just arrived and people taxed at source apply online before 31 December'
            ]
        ]
    }),
    aid({
        scope: 'BL',
        kind: 'family',
        language: 'de',
        url: 'https://www.sva-bl.ch/de/ausgleichskasse/familienzulagen',
        organization: 'SVA Basel-Landschaft, Familienausgleichskasse',
        summary: [
            'Allocations familiales pour les salariés, indépendants et personnes sans activité à situation financière modeste.',
            'Family allowances for employees, the self-employed and people without activity in a modest financial situation.'
        ],
        conditions: [
            [
                'Enfants propres, beaux-enfants, enfants placés, frères et sœurs ou petits-enfants à charge',
                'Les personnes au chômage les reçoivent par leur caisse de chômage'
            ],
            [
                'Own children, stepchildren, foster children, siblings or grandchildren in your care',
                'People on unemployment benefit receive them through their unemployment fund'
            ]
        ]
    }),

    /* ── Schaffhouse ── */
    aid({
        scope: 'SH',
        kind: 'premium',
        language: 'de',
        url: 'https://www.svash.ch/ipv/anspruch/',
        organization: 'Sozialversicherungsamt Schaffhausen (SVA Schaffhausen)',
        summary: [
            'Aide du canton de Schaffhouse pour les primes de l’assurance de base. Les formulaires sont envoyés fin janvier.',
            'Help from the canton of Schaffhausen with basic insurance premiums. Forms are sent at the end of January.'
        ],
        conditions: [
            [
                'Avoir son domicile fiscal dans le canton au 1er janvier et être assuré à la LAMal',
                'Déposer la demande avant le 30 avril de l’année concernée'
            ],
            ['Be tax-resident in the canton on 1 January and insured under the LAMal', 'Apply before 30 April of the year concerned']
        ]
    }),
    aid({
        scope: 'SH',
        kind: 'family',
        language: 'de',
        url: 'https://www.svash.ch/familienzulagen/anspruch/',
        organization: 'Sozialversicherungsamt Schaffhausen (SVA Schaffhausen)',
        summary: [
            'Allocations pour enfant, jusqu’à 16 ans, et de formation, jusqu’à 25 ans.',
            'Child allowances up to age 16 and training allowances up to age 25.'
        ],
        conditions: [
            [
                'Salarié·e d’un employeur du canton, ou sans activité avec un revenu imposable sous une limite',
                'La page officielle détaille les ayants droit'
            ],
            [
                'Employee of an employer in the canton, or without activity with taxable income below a limit',
                'The official page details who is entitled'
            ]
        ]
    }),

    /* ── Appenzell Rhodes-Extérieures ── */
    aid({
        scope: 'AR',
        kind: 'premium',
        language: 'de',
        url: 'https://www.sovar.ch/dienstleistungen/pr%C3%A4mienverbilligung-ipv',
        organization: 'Sozialversicherungen Appenzell Ausserrhoden (SOVAR)',
        summary: [
            'Aide d’Appenzell Rhodes-Extérieures pour les primes de l’assurance de base. Une demande est obligatoire, en ligne ou sur papier.',
            'Help from Appenzell Ausserrhoden with basic insurance premiums. An application is mandatory, online or on paper.'
        ],
        conditions: [
            [
                'Un formulaire prérempli est envoyé en décembre, mais il faut le retourner',
                'Le délai de dépôt court de décembre au 31 mars de l’année suivante'
            ],
            [
                'A pre-filled form is sent in December, but it must be returned',
                'The filing period runs from December to 31 March of the following year'
            ]
        ]
    }),
    aid({
        scope: 'AR',
        kind: 'family',
        language: 'de',
        url: 'https://www.sovar.ch/dienstleistungen/familienzulagen-fak-flg',
        organization: 'Sozialversicherungen Appenzell Ausserrhoden (SOVAR)',
        summary: [
            'Allocations pour enfant et de formation, à demander : elles ne sont pas versées automatiquement.',
            'Child and training allowances, to be claimed: they are not paid automatically.'
        ],
        conditions: [
            [
                'Des formulaires distincts existent pour les salariés, les indépendants et les personnes sans activité',
                'Les salariés passent par leur employeur'
            ],
            ['Separate forms exist for employees, the self-employed and people without activity', 'Employees go through their employer']
        ]
    }),
    aid({
        scope: 'AR',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.ar.ch/verwaltung/departement-bildung-und-kultur/amt-fuer-mittel-und-hochschulen-und-berufsbildung/abteilung-ausbildungs-und-studienbeitraege/',
        organization: 'Abteilung Ausbildungs- und Studienbeiträge, Amt für Mittel- und Hochschulen und Berufsbildung',
        summary: [
            'Aide pour une formation postobligatoire (secondaire II et tertiaire), sous forme de bourse ou de prêt, selon le besoin financier.',
            'Help for post-compulsory training (upper secondary and tertiary), as a grant or a loan, based on financial need.'
        ],
        conditions: [
            ['Avoir un besoin financier établi', 'Voir la rubrique de dépôt des demandes de la page officielle'],
            ['Have an established financial need', 'See the application section of the official page']
        ]
    }),
    aid({
        scope: 'AR',
        kind: 'social',
        language: 'de',
        url: 'https://www.ar.ch/verwaltung/departement-gesundheit-und-soziales/amt-fuer-soziales/abteilung-sozialhilfe-und-asyl/sozialhilfe/',
        organization: 'Sozialamt de la commune de domicile ; Amt für Soziales, Abteilung Sozialhilfe und Asyl',
        summary: [
            'Aide financière pour les personnes dans le besoin. La demande se fait auprès du service social de la commune ; le canton conseille et forme ces services.',
            'Financial help for people in need. The application is made to your municipality’s social service; the canton advises and trains these services.'
        ],
        conditions: [
            ['S’adresser au service social de sa commune de domicile', 'Le canton ne reçoit pas les demandes des particuliers'],
            ['Contact the social service of your municipality of residence', 'The canton does not receive applications from individuals']
        ]
    }),

    /* ── Appenzell Rhodes-Intérieures ── */
    aid({
        scope: 'AI',
        kind: 'premium',
        language: 'de',
        url: 'https://www.ai.ch/themen/gesundheit-alter-und-soziales/individuelle-praemienverbilligung',
        organization: 'Gesundheitsamt Appenzell Innerrhoden',
        summary: [
            'Aide d’Appenzell Rhodes-Intérieures pour les primes de l’assurance de base, attribuée automatiquement par l’office, sans demande.',
            'Help from Appenzell Innerrhoden with basic insurance premiums, granted automatically by the office, with no application.'
        ],
        conditions: [
            ['L’attribution se fait d’office', 'Un formulaire de demande d’avance existe en téléchargement'],
            ['Allocation is automatic', 'An advance request form can be downloaded']
        ]
    }),
    aid({
        scope: 'AI',
        kind: 'family',
        language: 'de',
        url: 'https://www.akai.ch/',
        organization: 'Ausgleichskasse Appenzell Innerrhoden (AKAI)',
        summary: [
            'La caisse de compensation cantonale gère aussi les allocations familiales. L’inscription passe par son formulaire « Familienzulagen ».',
            'The cantonal compensation fund also manages family allowances. Registration goes through its "Familienzulagen" form.'
        ],
        conditions: [
            [
                'S’adresser à la caisse de compensation cantonale',
                'Les conditions détaillées figurent dans la rubrique « Formulare » du site de la caisse'
            ],
            ['Contact the cantonal compensation fund', 'Detailed conditions are in the "Formulare" section of the fund’s website']
        ]
    }),
    aid({
        scope: 'AI',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.ai.ch/themen/bildung/stipendien',
        organization: 'Stipendienstelle, Erziehungsdepartement',
        summary: [
            'Bourses, prêts d’études ou contributions aux frais de scolarité, selon la situation financière de la personne en formation et de ses parents.',
            'Grants, study loans or tuition contributions, depending on the financial situation of the trainee and their parents.'
        ],
        conditions: [
            ['Télécharger le formulaire de demande', 'Le renvoyer imprimé avec une signature originale'],
            ['Download the application form', 'Send it back printed with an original signature']
        ]
    }),
    aid({
        scope: 'AI',
        kind: 'social',
        language: 'de',
        url: 'https://www.ai.ch/themen/gesundheit-alter-und-soziales/sozialhilfe',
        organization: 'Sozialamt Appenzell Innerrhoden',
        summary: [
            'Aide économique subsidiaire pour les personnes dans le besoin, soumise à une contrepartie. La demande se fait par téléphone ou au guichet sur rendez-vous.',
            'Subsidiary financial help for people in need, subject to a counterpart. Apply by phone or at the counter by appointment.'
        ],
        conditions: [
            ['Prendre rendez-vous avec le Sozialamt', 'L’aide intervient après les autres ressources'],
            ['Make an appointment with the Sozialamt', 'The aid applies after other resources']
        ]
    }),

    /* ── Saint-Gall ── */
    aid({
        scope: 'SG',
        kind: 'premium',
        language: 'de',
        url: 'https://www.sg.ch/gesundheit-soziales/gesundheit/krankenversicherung0/praemienverbilligung.html',
        organization: 'Sozialversicherungsanstalt des Kantons St.Gallen (SVA)',
        summary: [
            'Aide de Saint-Gall pour les primes de l’assurance de base. Une demande est obligatoire, sauf pour les bénéficiaires de PC et d’aide sociale, transmis d’office.',
            'Help from St. Gallen with basic insurance premiums. An application is mandatory, except for people on supplementary benefits and social assistance, who are passed on automatically.'
        ],
        conditions: [
            [
                'Demander en ligne sur le site de la SVA ou auprès de l’agence AVS de la commune',
                'Déposer la demande chaque année au plus tard le 31 mars'
            ],
            ['Apply online on the SVA website or at your municipality’s AVS agency', 'Apply every year by 31 March at the latest']
        ]
    }),
    aid({
        scope: 'SG',
        kind: 'family',
        language: 'de',
        url: 'https://www.sg.ch/gesundheit-soziales/soziales/familie/familienausgleichskassen.html',
        organization: 'Familienausgleichskassen agréées ; Amt für Soziales (surveillance)',
        summary: [
            'Les allocations sont versées par la caisse de l’employeur, ou par la caisse cantonale pour les personnes sans employeur. La page officielle publie la liste des caisses agréées.',
            'Allowances are paid by the employer’s fund, or by the cantonal fund for people without an employer. The official page publishes the list of approved funds.'
        ],
        conditions: [
            ['Salarié·e : s’adresser à la caisse de son employeur', 'Sans employeur : renseignements auprès de la SVA'],
            ['Employee: contact your employer’s fund', 'Without an employer: ask the SVA']
        ]
    }),
    aid({
        scope: 'SG',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.sg.ch/bildung-sport/stipendien-und-studiendarlehen.html',
        organization: 'Stipendienstelle des Kantons St.Gallen',
        summary: [
            'Bourses pour les premières formations reconnues (apprentissage, école de culture générale, école supérieure, premier cursus HES ou université) ; prêts pour les formations complémentaires reconnues.',
            'Grants for first recognised training (apprenticeship, general education school, higher college, first university-level degree); loans for further recognised training.'
        ],
        conditions: [
            [
                'Avoir son domicile fiscal, au sens de la loi, dans le canton de Saint-Gall',
                'Déposer la demande en ligne ou sur papier, avec le formulaire PDF et son guide'
            ],
            [
                'Have your legal tax residence in the canton of St. Gallen',
                'File the application online or on paper, with the PDF form and its guide'
            ]
        ]
    }),
    aid({
        scope: 'SG',
        kind: 'social',
        language: 'de',
        url: 'https://www.sg.ch/gesundheit-soziales/soziales/sozialhilfe.html',
        organization: 'Sozialamt de la commune de domicile ; Amt für Soziales',
        summary: [
            'Aide financière pour les personnes dans le besoin. La demande se fait auprès du service social de la commune de domicile.',
            'Financial help for people in need. The application is made to the social service of your municipality of residence.'
        ],
        conditions: [
            ['S’adresser au Sozialamt de sa commune', 'Le canton est l’interlocuteur des communes'],
            ['Contact your municipality’s Sozialamt', 'The canton is the municipalities’ point of contact']
        ]
    }),

    /* ── Grisons ── */
    aid({
        scope: 'GR',
        kind: 'premium',
        language: 'de',
        url: 'https://www.sva.gr.ch/praemienverbilligung.html',
        organization: 'Sozialversicherungsanstalt des Kantons Graubünden (SVA Graubünden) ; Amt für Soziales',
        summary: [
            'Aide des Grisons pour les personnes assurées à la LAMal en situation économique modeste, versée à l’assureur. Il faut s’inscrire.',
            'Help from Graubünden for people insured under the LAMal in a modest economic situation, paid to the insurer. Registration is required.'
        ],
        conditions: [
            ['S’inscrire à la SVA pour le subside', 'Le délai éventuel figure sur la page officielle'],
            ['Register with the SVA for the subsidy', 'Any deadline is on the official page']
        ]
    }),
    aid({
        scope: 'GR',
        kind: 'family',
        language: 'de',
        url: 'https://www.sva.gr.ch/familienzulagen-fak-flg.html',
        organization: 'Sozialversicherungsanstalt des Kantons Graubünden (SVA Graubünden)',
        summary: [
            'Allocations pour enfant et de formation. Les pièces peuvent être transmises en ligne via le portail de la SVA.',
            'Child and training allowances. Documents can be sent online through the SVA portal.'
        ],
        conditions: [
            ['Annoncer à la caisse les changements de situation', 'Consulter la page officielle pour les conditions détaillées'],
            ['Report changes in your situation to the fund', 'See the official page for detailed conditions']
        ]
    }),
    aid({
        scope: 'GR',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.gr.ch/DE/institutionen/verwaltung/ekud/dd/themen/stipendien/gesuchsformular',
        organization: 'Fachstelle Stipendien, Departement für Bildung, Umwelt und Kultur',
        summary: [
            'Bourses d’études. Il faut un compte personnel sur le portail des bourses et une demande par année de formation, déposée en ligne puis confirmée par courrier.',
            'Study grants. You need a personal account on the grants portal and one application per training year, filed online then confirmed by post.'
        ],
        conditions: [
            [
                'Déposer la demande dans les trois mois suivant le début de l’année de formation',
                'Pas d’effet rétroactif : un retard réduit le calcul au prorata'
            ],
            [
                'File the application within three months of the start of the training year',
                'No retroactive effect: a delay reduces the pro-rata calculation'
            ]
        ]
    }),
    aid({
        scope: 'GR',
        kind: 'social',
        language: 'de',
        url: 'https://www.gr.ch/DE/institutionen/verwaltung/dvs/soa/beratung/finanzielle-unterstuetzung/sozialhilfe/Seiten/default.aspx',
        organization: 'Commune de domicile (centres de conseil sociaux régionaux) ; Amt für Soziales',
        summary: [
            'Aide subsidiaire, après les autres prestations. La demande se fait auprès de la commune de domicile, via les centres de conseil régionaux.',
            'Subsidiary aid, after other benefits. The application is made to your municipality of residence, through the regional counselling centres.'
        ],
        conditions: [
            ['Collaborer et fournir les pièces demandées', 'L’aide est en principe remboursable'],
            ['Cooperate and provide the documents requested', 'The aid is in principle repayable']
        ]
    }),

    /* ── Argovie ── */
    aid({
        scope: 'AG',
        kind: 'premium',
        language: 'de',
        url: 'https://www.sva-aargau.ch/pv',
        organization: 'SVA Aargau (Kompetenzzentrum für Sozialversicherungen)',
        summary: [
            'Aide d’Argovie pour les primes de l’assurance de base. La demande est à renouveler chaque année pour l’année suivante, avec un code d’inscription.',
            'Help from Aargau with basic insurance premiums. The application is renewed every year for the following year, with a registration code.'
        ],
        conditions: [
            [
                'Être domicilié dans le canton, avec un revenu et une fortune modestes',
                'S’inscrire avant le 31 décembre pour l’année suivante'
            ],
            ['Live in the canton, with a modest income and assets', 'Register before 31 December for the following year']
        ]
    }),
    aid({
        scope: 'AG',
        kind: 'family',
        language: 'de',
        url: 'https://www.sva-aargau.ch/dienstleistungen/unsere-sozialversicherungen/familienzulagen',
        organization: 'SVA Aargau, Familienausgleichskasse',
        summary: [
            'Allocations pour enfant, jusqu’à 16 ans, et de formation, jusqu’à 25 ans, sous conditions.',
            'Child allowances up to age 16 and training allowances up to age 25, under conditions.'
        ],
        conditions: [
            [
                'Salariés, indépendants, ou personnes sans activité sous conditions de revenu',
                'La demande peut être rétroactive jusqu’à cinq ans'
            ],
            [
                'Employees, the self-employed, or people without activity under income conditions',
                'The claim can be retroactive for up to five years'
            ]
        ]
    }),
    aid({
        scope: 'AG',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.ag.ch/de/themen/bildung-forschung/berufsbildung/beratung-stipendien/stipendien',
        organization: 'Sektion Stipendien, Departement Bildung, Kultur und Sport',
        summary: [
            'Bourses pour une formation reconnue. La demande est faite en ligne, uniquement par la personne en formation.',
            'Grants for recognised training. The application is made online, by the trainee only.'
        ],
        conditions: [
            [
                'Avoir son domicile au sens des bourses en Argovie (parents argoviens, ou deux ans de domicile après une première formation)',
                'Respecter les règles de nationalité ou de permis de séjour'
            ],
            [
                'Have your grants residence in Aargau (Aargau parents, or two years’ residence after a first training)',
                'Meet the nationality or residence permit rules'
            ]
        ]
    }),
    aid({
        scope: 'AG',
        kind: 'social',
        language: 'de',
        url: 'https://www.ag.ch/de/themen/soziales-gesellschaft/soziale-sicherheit/sozialhilfe',
        organization: 'Commune du domicile d’assistance ; Kantonaler Sozialdienst, Öffentliche Sozialhilfe',
        summary: [
            'Aide personnelle et matérielle pour les personnes en détresse, subsidiaire aux autres aides. La demande se fait auprès de la commune.',
            'Personal and material help for people in distress, subsidiary to other aid. The application is made to your municipality.'
        ],
        conditions: [
            ['S’adresser à la commune du domicile d’assistance', 'Le canton conseille les communes et fixe le cadre légal'],
            ['Contact the municipality of your support residence', 'The canton advises the municipalities and sets the legal framework']
        ]
    }),

    /* ── Thurgovie ── */
    aid({
        scope: 'TG',
        kind: 'scholarship',
        language: 'de',
        url: 'https://stipendien.tg.ch/ausbildungsbeitraege.html/4445',
        organization: 'Amt für Mittel- und Hochschulen, Abteilung Ausbildungsbeiträge',
        summary: [
            'Bourses non remboursables pour une première formation à plein temps, prêts remboursables pour une seconde formation. Le formulaire dépend de la filière.',
            'Non-repayable grants for a first full-time training, repayable loans for a second training. The form depends on the course.'
        ],
        conditions: [
            [
                'Avoir son domicile au sens des bourses en Thurgovie',
                'Déposer la demande avant le 15 novembre (semestre d’automne) ou le 15 mai (semestre de printemps) : pas de paiement rétroactif'
            ],
            [
                'Have your grants residence in Thurgau',
                'Apply before 15 November (autumn semester) or 15 May (spring semester): no retroactive payment'
            ]
        ]
    }),
    aid({
        scope: 'TG',
        kind: 'social',
        language: 'de',
        url: 'https://sozialamt.tg.ch/sozialhilfe.html/4501',
        organization: 'Sozialamt de la commune de domicile ; Sozialamt des Kantons Thurgau',
        summary: [
            'Aide pour les personnes dont les besoins ne sont couverts ni par leurs propres moyens ni par d’autres aides. La demande se fait auprès de la commune de domicile.',
            'Help for people whose needs are covered neither by their own means nor by other aid. The application is made to your municipality of residence.'
        ],
        conditions: [
            ['S’adresser à la commune de domicile', 'Le canton conseille les communes'],
            ['Contact your municipality of residence', 'The canton advises the municipalities']
        ]
    }),

    /* ── Tessin ── */
    aid({
        scope: 'TI',
        kind: 'premium',
        language: 'it',
        url: 'https://www.ti.ch/sportello/riduzione-dei-premi-dellassicurazione-malattia-ripam',
        organization: 'Istituto delle assicurazioni sociali (IAS)',
        summary: [
            'Réduction des primes (RIPAM) du Tessin. Elle n’est pas automatique : il faut demander le formulaire en ligne, puis envoyer les documents.',
            'The Ticino premium reduction (RIPAM). It is not automatic: request the form online, then send the documents.'
        ],
        conditions: [
            ['Demander le formulaire RIPAM en ligne', 'Un simulateur permet d’estimer le droit'],
            ['Request the RIPAM form online', 'A simulator estimates the entitlement']
        ]
    }),
    aid({
        scope: 'TI',
        kind: 'family',
        language: 'it',
        url: 'https://www.ti.ch/sportello/assegni-familiari',
        organization: 'Istituto delle assicurazioni sociali (IAS), Servizio assegni familiari',
        summary: [
            'Allocations familiales de la caisse cantonale. Le droit est lié à l’activité lucrative, à l’autorité parentale ou au lieu de vie principal de l’enfant.',
            'Family allowances from the cantonal fund. The right depends on gainful activity, parental authority or the child’s main place of living.'
        ],
        conditions: [
            [
                'Envoyer les pièces par le portail sécurisé, par courrier, au guichet ou par courriel',
                'Consulter la fiche détaillée de l’IAS'
            ],
            ['Send the documents through the secure portal, by post, at the counter or by email', 'See the IAS detail sheet']
        ]
    }),
    aid({
        scope: 'TI',
        kind: 'scholarship',
        language: 'it',
        url: 'https://www.ti.ch/sportello/borse-e-aiuto-allo-studio',
        organization: 'Canton du Tessin, aide aux études (UAST)',
        summary: [
            'Bourses pour les formations qui mènent à un titre reconnu. Un prêt d’études et d’autres aides existent aussi. La demande se fait en ligne.',
            'Grants for training leading to a recognised qualification. A study loan and other aids also exist. The application is made online.'
        ],
        conditions: [
            ['Suivre une formation reconnue', 'Utiliser le lien « Richiesta borsa di studio » de la page officielle'],
            ['Follow recognised training', 'Use the "Richiesta borsa di studio" link on the official page']
        ]
    }),
    aid({
        scope: 'TI',
        kind: 'social',
        language: 'it',
        url: 'https://www.ti.ch/sportello/prestazioni-di-sostegno-sociale',
        organization: 'Commune de domicile (guichet LAPS) ; Ufficio del sostegno sociale e dell’inserimento (USSI)',
        summary: [
            'Aide sociale ordinaire. La demande passe par la commune de domicile ; l’USSI décide.',
            'Ordinary social assistance. The application goes through your municipality of residence; the USSI decides.'
        ],
        conditions: [
            [
                'Être domicilié au Tessin et avoir épuisé ses ressources',
                'Le droit court dès le mois de la demande si les pièces sont complètes sous 30 jours'
            ],
            [
                'Live in Ticino and have exhausted your resources',
                'The right starts in the month of the application if the documents are complete within 30 days'
            ]
        ]
    }),

    /* ── Valais ── */
    aid({
        scope: 'VS',
        kind: 'premium',
        language: 'fr',
        url: 'https://www.vs.ch/web/ssp/subsides-assurance-maladie',
        organization: 'Caisse de compensation du canton du Valais ; Service de la santé publique',
        summary: [
            'Aide du canton du Valais pour les primes de l’assurance de base. Le droit est déterminé automatiquement pour les contribuables du fichier fiscal ; les personnes imposées à la source et les nouveaux titulaires de permis déposent une requête.',
            'Help from the canton of Valais with basic insurance premiums. The right is determined automatically for taxpayers on the tax file; people taxed at source and new permit holders file a request.'
        ],
        conditions: [
            [
                'Être domicilié en Valais au 1er janvier et assuré à la LAMal',
                'Impôt à la source ou changement de permis : déposer la requête au plus tard le 31 décembre de l’année du subside'
            ],
            [
                'Live in Valais on 1 January and be insured under the LAMal',
                'Taxed at source or permit change: file the request by 31 December of the subsidy year'
            ]
        ]
    }),
    aid({
        scope: 'VS',
        kind: 'family',
        language: 'fr',
        url: 'https://www.avsvalais.ch/fr/Assurances/AF/Allocations-familiales/Allocations-familiales.html',
        organization: 'Caisse cantonale valaisanne d’allocations familiales (CIVAF) ; Caisse de compensation du canton du Valais',
        summary: [
            'Allocations pour enfant, jusqu’à 16 ans, et de formation, jusqu’à 25 ans, pour les salariés, indépendants et personnes sans activité.',
            'Child allowances up to age 16 and training allowances up to age 25, for employees, the self-employed and people without activity.'
        ],
        conditions: [
            [
                'Avoir un enfant à charge',
                'Demander le formulaire à la caisse : la CIVAF pour les salariés et indépendants hors agriculture, la caisse de compensation pour les autres cas'
            ],
            [
                'Have a dependent child',
                'Request the form from the fund: the CIVAF for employees and the self-employed outside agriculture, the compensation fund otherwise'
            ]
        ]
    }),
    aid({
        scope: 'VS',
        kind: 'scholarship',
        language: 'fr',
        url: 'https://www.vs.ch/web/saajf/allocations-de-formation',
        organization: 'Section des bourses et prêts d’études, Service administratif et des affaires juridiques de la formation',
        summary: [
            'Bourses et prêts d’études. La demande se fait en ligne sur eBourse (compte AGOV, SwissID ou IAM au nom de la personne en formation) ou sur le formulaire officiel, et se renouvelle chaque année.',
            'Study grants and loans. The application is made online on eBourse (AGOV, SwissID or IAM account in the trainee’s name) or on the official form, and is renewed every year.'
        ],
        conditions: [
            [
                'Renouveler la demande chaque année',
                'Les échéances annuelles sont sur la page officielle : fin décembre pour l’année ou le semestre d’automne, fin avril pour le semestre de printemps'
            ],
            [
                'Renew the application every year',
                'The yearly deadlines are on the official page: end of December for the year or autumn semester, end of April for the spring semester'
            ]
        ]
    }),
    aid({
        scope: 'VS',
        kind: 'social',
        language: 'fr',
        url: 'https://www.vs.ch/web/sas/aide-sociale',
        organization: 'Service de l’action sociale (SAS)',
        summary: [
            'Aide financière ou matérielle et accompagnement social, subsidiaires à toutes les autres ressources.',
            'Financial or material help and social support, subsidiary to all other resources.'
        ],
        conditions: [
            ['Avoir épuisé les autres ressources et prestations', 'La page officielle précise la marche à suivre'],
            ['Have exhausted other resources and benefits', 'The official page gives the procedure']
        ]
    }),

    /* ── Compléments (2026-11-23) : Obwalden, Thurgau, Zoug, Bâle-Campagne ── */
    aid({
        scope: 'OW',
        kind: 'premium',
        language: 'de',
        url: 'https://www.akow.ch/dienstleistungen/praemienverbilligung',
        organization: 'Ausgleichskasse Obwalden (AKOW)',
        summary: [
            'Aide du canton d’Obwald pour les primes de l’assurance de base. L’exécution est confiée à la caisse de compensation cantonale.',
            'Help from the canton of Obwalden with basic insurance premiums. Administration is entrusted to the cantonal compensation fund.'
        ],
        conditions: [
            [
                'Être domicilié dans le canton d’Obwald et assuré à la LAMal',
                'Les conditions, les délais et le formulaire figurent sur la page officielle'
            ],
            ['Live in the canton of Obwalden and be insured under the LAMal', 'Conditions, deadlines and the form are on the official page']
        ]
    }),
    aid({
        scope: 'OW',
        kind: 'family',
        language: 'de',
        url: 'https://www.akow.ch/dienstleistungen/familienzulagen',
        organization: 'Ausgleichskasse Obwalden (AKOW)',
        summary: [
            'Allocations familiales d’Obwald : allocation pour enfant et allocation de formation. Les montants sont sur la page officielle.',
            'Obwalden family allowances: a child allowance and a training allowance. Amounts are on the official page.'
        ],
        conditions: [
            ['Être salarié·e, indépendant·e ou sans activité lucrative', 'Les salariés passent en général par leur employeur'],
            ['Be an employee, self-employed or without gainful activity', 'Employees generally go through their employer']
        ]
    }),
    aid({
        scope: 'TG',
        kind: 'premium',
        language: 'de',
        url: 'https://www.svztg.ch/dienstleistungen/praemienverbilligung-ipv',
        organization: 'Sozialversicherungszentrum Thurgau (SVZ)',
        summary: [
            'Aide du canton de Thurgovie pour les primes de l’assurance de base, versée directement à l’assureur.',
            'Help from the canton of Thurgau with basic insurance premiums, paid directly to the insurer.'
        ],
        conditions: [
            [
                'Avoir son domicile fiscal dans le canton de Thurgovie au 1er janvier',
                'Selon la situation, une demande est nécessaire : voir la page officielle'
            ],
            [
                'Have your tax residence in the canton of Thurgau on 1 January',
                'Depending on the situation an application is needed: see the official page'
            ]
        ]
    }),
    aid({
        scope: 'TG',
        kind: 'family',
        language: 'de',
        url: 'https://www.svztg.ch/dienstleistungen/familienzulagen-famz-flg',
        organization: 'Sozialversicherungszentrum Thurgau (SVZ)',
        summary: [
            'Allocations familiales de Thurgovie pour les salariés, les personnes sans activité lucrative et l’agriculture.',
            'Thurgau family allowances for employees, people without gainful activity and agriculture.'
        ],
        conditions: [
            ['Remplir le formulaire correspondant à votre statut', 'Les salariés passent en général par leur employeur'],
            ['Fill in the form matching your status', 'Employees generally go through their employer']
        ]
    }),
    aid({
        scope: 'ZG',
        kind: 'scholarship',
        language: 'de',
        url: 'https://zg.ch/de/bildung/bslb/ausbildungsbeitraege',
        organization: 'Amt für Berufsberatung, Stipendienstelle des Kantons Zug',
        summary: [
            'Bourses non remboursables, prêts avec intérêts et bourses du marché du travail pour la formation continue. La loi a été entièrement révisée en septembre 2025.',
            'Non-repayable grants, loans with interest and labour-market grants for further training. The law was fully revised in September 2025.'
        ],
        conditions: [
            ['Avoir son domicile déterminant dans le canton de Zoug', 'Les conditions et les délais figurent sur la page officielle'],
            ['Have your determining residence in the canton of Zug', 'Conditions and deadlines are on the official page']
        ]
    }),
    aid({
        scope: 'BL',
        kind: 'scholarship',
        language: 'de',
        url: 'https://www.baselland.ch/politik-und-behorden/direktionen/bildungs-kultur-und-sportdirektion/berufsbildung-mittelschulen-und-hochschulen/hauptabteilung-berufsbildung/ausbildungsbeitraege',
        organization: 'Ausbildungsbeiträge, Hauptabteilung Berufsbildung, Bildungs-, Kultur- und Sportdirektion BL',
        summary: [
            'Bourses et prêts d’études. La page propose un calculateur pour estimer une aide possible.',
            'Study grants and loans. The page offers a calculator to estimate possible support.'
        ],
        conditions: [
            [
                'Avoir son domicile en matière de bourses dans le canton de Bâle-Campagne',
                'Ne pas pouvoir financer la formation seul·e ou avec l’aide de ses proches',
                'Déposer une nouvelle demande pour chaque année de formation'
            ],
            [
                'Have your grant residence in the canton of Basel-Landschaft',
                'Be unable to fund the training alone or with relatives’ help',
                'Apply again for each year of training'
            ]
        ]
    })
];
