import { AIDS_2026_CANTONS } from '@/features/aids/data/aids-2026-cantons';
import type { AidEntry } from '@/features/aids/types';

/**
 * Catalogue 2026. Chaque aide pointe vers la page officielle de l’organisme, relue le 2026-11-22.
 * Aucun montant cantonal ni aucun seuil de revenu n’est écrit ici (ils changent chaque année) : on renvoie à l’organisme.
 * Les montants fédéraux viennent de `GET /api/legal-parameters` (`amountKeys`).
 * Mise à jour chaque novembre : copier ce fichier en `aids-{année}.ts`, relire chaque lien, changer `verifiedAt`.
 */
const V = '2026-11-22';

const AIDS_2026_BASE: AidEntry[] = [
    /* ── Confédération ── */
    {
        id: 'ch-priminfo',
        theme: 'health',
        scope: 'federal',
        url: 'https://www.priminfo.admin.ch/fr',
        verifiedAt: V,
        amountKeys: ['lamalOrdinaryFranchise', 'lamalOptionalFranchises', 'lamalQuotePartRate', 'lamalQuotePartMaxAdult'],
        texts: {
            fr: {
                title: 'Comparer les primes d’assurance-maladie (Priminfo)',
                summary:
                    'Comparateur officiel de la Confédération : primes par assureur, franchise et modèle d’assurance. Changer d’assureur ou de franchise peut réduire sensiblement vos primes.',
                conditions: [
                    'L’assurance de base est obligatoire pour toute personne domiciliée en Suisse',
                    'Le changement d’assureur se prépare en général avant la fin novembre, pour le 1er janvier'
                ],
                organization: 'Office fédéral de la santé publique (OFSP)'
            },
            en: {
                title: 'Compare health insurance premiums (Priminfo)',
                summary:
                    'The Confederation’s official comparison tool: premiums by insurer, deductible and insurance model. Changing insurer or deductible can noticeably lower your premiums.',
                conditions: [
                    'Basic health insurance is compulsory for everyone living in Switzerland',
                    'Switching insurer is generally arranged before the end of November, for 1 January'
                ],
                organization: 'Federal Office of Public Health (FOPH)'
            }
        }
    },
    {
        id: 'ch-family-allowance',
        theme: 'family',
        scope: 'federal',
        url: 'https://www.bsv.admin.ch/bsv/fr/home/assurances-sociales/famz.html',
        verifiedAt: V,
        amountKeys: ['familyAllowanceChildMin', 'familyAllowanceTrainingMin'],
        texts: {
            fr: {
                title: 'Allocations familiales',
                summary:
                    'Allocation mensuelle par enfant, allocation de formation pour les jeunes en formation, et allocation de naissance ou d’adoption selon le canton. Les montants indiqués sont les minimums fédéraux : de nombreux cantons versent davantage.',
                conditions: [
                    'Être salarié·e ou indépendant·e, ou sans activité avec un revenu modeste (plafond fixé par le canton)',
                    'Avoir un enfant à charge',
                    'La demande se fait à la caisse d’allocations familiales, en général par l’intermédiaire de l’employeur'
                ],
                organization: 'Caisse d’allocations familiales (employeur ou caisse de compensation cantonale)'
            },
            en: {
                title: 'Family allowances',
                summary:
                    'A monthly allowance per child, a training allowance for young people in education, and a birth or adoption allowance depending on the canton. The amounts shown are the federal minimums: many cantons pay more.',
                conditions: [
                    'Be an employee or self-employed, or have no job and a modest income (ceiling set by the canton)',
                    'Have a dependent child',
                    'Apply to the family allowance fund, usually through your employer'
                ],
                organization: 'Family allowance fund (employer or cantonal compensation fund)'
            }
        }
    },
    {
        id: 'ch-maternity',
        theme: 'family',
        scope: 'federal',
        url: 'https://www.ahv-iv.ch/fr/Assurances-sociales/Prestations-du-régime-des-APG-AMat-AAP-APC-AAdop/Allocation-de-maternité',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Allocation de maternité',
                summary:
                    'Compensation du revenu après l’accouchement : 80 % du revenu moyen, plafonnée à 220 francs par jour, pendant 14 semaines (98 jours).',
                conditions: [
                    'Avoir été assurée à l’AVS pendant les 9 mois précédant l’accouchement',
                    'Avoir exercé une activité lucrative pendant au moins 5 mois durant cette période',
                    'La demande se fait à la caisse de compensation, par l’employeur si vous êtes salariée'
                ],
                organization: 'Caisse de compensation AVS (via l’employeur)'
            },
            en: {
                title: 'Maternity allowance',
                summary: 'Income compensation after childbirth: 80% of average income, capped at CHF 220 per day, for 14 weeks (98 days).',
                conditions: [
                    'Have been insured with the AVS during the 9 months before the birth',
                    'Have worked for at least 5 months during that period',
                    'Apply to the compensation fund, through your employer if you are an employee'
                ],
                organization: 'AVS compensation fund (through the employer)'
            }
        }
    },
    {
        id: 'ch-unemployment',
        theme: 'unemployment',
        scope: 'federal',
        url: 'https://arbeit.swiss/fr/demandeurs-demploi/prestations',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Indemnités de chômage',
                summary:
                    'Indemnités journalières pendant la recherche d’un emploi : en règle générale 70 % du gain assuré, 80 % dans certains cas (par exemple avec des enfants à charge ou un faible revenu).',
                conditions: [
                    'Être domicilié en Suisse et apte au placement',
                    'Avoir cotisé au moins 12 mois durant les 2 années qui précèdent l’inscription, ou en être libéré',
                    'S’inscrire à l’office régional de placement (ORP) au plus tard le premier jour pour lequel vous demandez l’indemnité',
                    'Rechercher activement un emploi'
                ],
                organization: 'Office régional de placement (ORP) et caisse de chômage'
            },
            en: {
                title: 'Unemployment benefits',
                summary:
                    'Daily benefits while you look for work: generally 70% of insured earnings, 80% in some cases (for example with dependent children or a low income).',
                conditions: [
                    'Live in Switzerland and be fit for placement',
                    'Have paid contributions for at least 12 months in the 2 years before registering, or be exempted',
                    'Register with the regional employment office (RAV/ORP) no later than the first day you claim benefits',
                    'Actively look for work'
                ],
                organization: 'Regional employment office (ORP) and unemployment fund'
            }
        }
    },
    {
        id: 'ch-avs-pension',
        theme: 'retirementDisability',
        scope: 'federal',
        url: 'https://www.ahv-iv.ch/fr/Assurances-sociales/Assurance-vieillesse-et-survivants-AVS/Rentes-de-vieillesse',
        verifiedAt: V,
        amountKeys: ['avsPensionMin', 'avsPensionMax', 'avsCoupleCap'],
        texts: {
            fr: {
                title: 'Rente de vieillesse AVS',
                summary:
                    'Rente mensuelle versée à partir de l’âge de référence, calculée selon vos années de cotisation et votre revenu moyen. La rente complète se situe entre un minimum et un maximum fixés chaque année.',
                conditions: [
                    'Avoir cotisé à l’AVS au moins une année complète',
                    'Avoir atteint l’âge de référence (l’anticipation et l’ajournement sont possibles)',
                    'Déposer la demande à la caisse de compensation 3 à 4 mois avant l’âge de référence'
                ],
                organization: 'Caisse de compensation AVS compétente'
            },
            en: {
                title: 'AVS old-age pension',
                summary:
                    'A monthly pension paid from the reference age, based on your contribution years and average income. The full pension lies between a minimum and a maximum set every year.',
                conditions: [
                    'Have paid AVS contributions for at least one full year',
                    'Have reached the reference age (early or deferred withdrawal is possible)',
                    'Apply to the compensation fund 3 to 4 months before the reference age'
                ],
                organization: 'Competent AVS compensation fund'
            }
        }
    },
    {
        id: 'ch-supplementary-benefits',
        theme: 'retirementDisability',
        scope: 'federal',
        url: 'https://www.ahv-iv.ch/fr/Assurances-sociales/Prestations-complémentaires-PC',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Prestations complémentaires (PC) à l’AVS et à l’AI',
                summary:
                    'Aide versée par le canton quand la rente AVS ou AI et vos autres revenus ne couvrent pas les besoins vitaux. Elle comprend aussi le remboursement de certains frais de maladie et d’invalidité.',
                conditions: [
                    'Être domicilié et résider en Suisse',
                    'Percevoir en règle générale une rente AVS ou AI',
                    'Avoir un revenu et une fortune inférieurs aux limites légales',
                    'Faire la demande auprès de l’organe PC de votre canton : le droit n’est pas accordé automatiquement'
                ],
                organization: 'Organe cantonal des prestations complémentaires (souvent la caisse de compensation cantonale)'
            },
            en: {
                title: 'Supplementary benefits (PC) to AVS and AI',
                summary:
                    'Paid by the canton when your AVS or AI pension and other income do not cover basic living costs. It also reimburses certain illness and disability costs.',
                conditions: [
                    'Live and reside in Switzerland',
                    'Generally receive an AVS or AI pension',
                    'Have income and assets below the legal limits',
                    'Apply to your canton’s PC office: the right is not granted automatically'
                ],
                organization: 'Cantonal supplementary benefits office (often the cantonal compensation fund)'
            }
        }
    },
    {
        id: 'ch-disability-insurance',
        theme: 'retirementDisability',
        scope: 'federal',
        url: 'https://www.ahv-iv.ch/fr/Assurances-sociales/Assurance-invalidité-AI',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Assurance-invalidité (AI)',
                summary:
                    'Mesures de réadaptation pour rester ou retourner dans l’emploi et, si elles ne suffisent pas, rente d’invalidité. La réadaptation passe avant la rente.',
                conditions: [
                    'Avoir une atteinte à la santé qui limite durablement la capacité de travail ou de gain',
                    'Avoir cotisé au moins 3 années complètes pour prétendre à une rente',
                    'Déposer la demande à l’office AI de votre canton, de préférence sans attendre'
                ],
                organization: 'Office AI du canton de domicile'
            },
            en: {
                title: 'Disability insurance (AI)',
                summary:
                    'Rehabilitation measures to stay in or return to work and, if they are not enough, a disability pension. Rehabilitation comes before the pension.',
                conditions: [
                    'Have a health condition that lastingly limits your ability to work or earn',
                    'Have paid contributions for at least 3 full years to claim a pension',
                    'Apply to your canton’s AI office, preferably without delay'
                ],
                organization: 'AI office of your canton of residence'
            }
        }
    },
    {
        id: 'ch-helplessness-allowance',
        theme: 'retirementDisability',
        scope: 'federal',
        url: 'https://www.ahv-iv.ch/fr/Assurances-sociales/Assurance-vieillesse-et-survivants-AVS/Allocations-pour-impotents',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Allocation pour impotent (AVS/AI)',
                summary:
                    'Versement mensuel pour les personnes qui ont besoin de l’aide d’autrui pour les actes de la vie quotidienne (s’habiller, se laver, manger, se déplacer…).',
                conditions: [
                    'Avoir besoin d’une aide régulière et importante depuis au moins 6 mois',
                    'Être domicilié en Suisse',
                    'À l’AVS : toucher une rente de vieillesse ou des prestations complémentaires',
                    'Faire la demande à la caisse de compensation (AVS) ou à l’office AI'
                ],
                organization: 'Caisse de compensation AVS ou office AI'
            },
            en: {
                title: 'Helplessness allowance (AVS/AI)',
                summary:
                    'A monthly payment for people who need other people’s help with daily activities (dressing, washing, eating, getting around…).',
                conditions: [
                    'Need regular and substantial help for at least 6 months',
                    'Live in Switzerland',
                    'Under the AVS: receive an old-age pension or supplementary benefits',
                    'Apply to the compensation fund (AVS) or the AI office'
                ],
                organization: 'AVS compensation fund or AI office'
            }
        }
    },
    {
        id: 'ch-buildings-programme',
        theme: 'energy',
        scope: 'federal',
        url: 'https://www.leprogrammebatiments.ch/fr',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Subventions de rénovation énergétique (Programme Bâtiments)',
                summary:
                    'Aides financières pour isoler un bâtiment, remplacer un chauffage fossile ou électrique par une solution renouvelable et d’autres mesures d’efficacité énergétique. Les montants dépendent du canton.',
                conditions: [
                    'Être propriétaire du bâtiment, ou mandaté par le propriétaire',
                    'Déposer la demande dans le canton du bâtiment, en règle générale avant le début des travaux',
                    'Respecter les exigences techniques du canton'
                ],
                organization: 'Service cantonal de l’énergie (Programme Bâtiments, Confédération et cantons)'
            },
            en: {
                title: 'Energy renovation grants (Buildings Programme)',
                summary:
                    'Financial support to insulate a building, replace a fossil or electric heating system with a renewable one, and other energy-efficiency measures. Amounts depend on the canton.',
                conditions: [
                    'Own the building, or be mandated by the owner',
                    'Apply in the canton where the building is, generally before the works start',
                    'Meet the canton’s technical requirements'
                ],
                organization: 'Cantonal energy office (Buildings Programme, Confederation and cantons)'
            }
        }
    },

    /* ── Vaud ── */
    {
        id: 'vd-premium-subsidy',
        theme: 'health',
        scope: 'VD',
        url: 'https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Subside à l’assurance-maladie',
                summary:
                    'Aide du canton pour payer les primes de l’assurance de base, versée directement à l’assureur. Elle dépend du revenu et de la fortune du ménage.',
                conditions: [
                    'Être domicilié dans le canton de Vaud et assuré à la LAMal',
                    'Avoir un revenu et une fortune sous les limites fixées chaque année',
                    'Demander le subside en ligne ou auprès de l’agence d’assurances sociales de votre région'
                ],
                organization: 'Office vaudois de l’assurance-maladie (OVAM)'
            },
            en: {
                title: 'Health insurance subsidy',
                summary:
                    'Help from the canton to pay basic insurance premiums, paid directly to the insurer. It depends on the household’s income and assets.',
                conditions: [
                    'Live in the canton of Vaud and be insured under the LAMal',
                    'Have income and assets below the limits set every year',
                    'Apply online or at your region’s social insurance agency'
                ],
                organization: 'Vaud health insurance office (OVAM)'
            }
        }
    },
    {
        id: 'vd-family-allowance',
        theme: 'family',
        scope: 'VD',
        url: 'https://www.vd.ch/aides-financieres-et-soutien-social/aides-financieres-et-comment-les-demander/allocations-familiales',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Allocations familiales vaudoises',
                summary:
                    'Le canton verse des allocations plus élevées que le minimum fédéral : allocation pour enfant, allocation de formation, et allocation de naissance ou d’adoption.',
                conditions: [
                    'Être salarié·e, indépendant·e ou sans activité (sous conditions de revenu)',
                    'La demande passe par l’employeur ou la caisse d’allocations familiales, ou par l’agence d’assurances sociales'
                ],
                organization: 'Caisse cantonale vaudoise de compensation (allocations familiales)',
                note: 'Les montants sont indexés : consultez la page officielle.'
            },
            en: {
                title: 'Vaud family allowances',
                summary:
                    'The canton pays higher allowances than the federal minimum: a child allowance, a training allowance, and a birth or adoption allowance.',
                conditions: [
                    'Be an employee, self-employed or without a job (subject to an income limit)',
                    'Apply through your employer or the family allowance fund, or at the social insurance agency'
                ],
                organization: 'Vaud cantonal compensation fund (family allowances)',
                note: 'Amounts are indexed: see the official page.'
            }
        }
    },
    {
        id: 'vd-scholarship',
        theme: 'education',
        scope: 'VD',
        url: 'https://www.vd.ch/formation/aides-financieres-aux-etudes-et-a-la-formation-professionnelle-bourses-ou-prets',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Bourses et prêts d’études ou d’apprentissage',
                summary:
                    'Aide pour financer des études ou un apprentissage. Une bourse n’est pas remboursable ; si les critères de la bourse ne sont pas tous remplis, un prêt peut être proposé.',
                conditions: [
                    'Avoir terminé la scolarité obligatoire',
                    'Ne pas pouvoir financer la formation avec sa situation financière ou celle de ses parents',
                    'Déposer la demande en ligne, dans les délais qui varient selon le type de formation'
                ],
                organization: 'Office cantonal des bourses d’études et d’apprentissage (OCBE)'
            },
            en: {
                title: 'Study and apprenticeship grants and loans',
                summary:
                    'Help to finance studies or an apprenticeship. A grant is not repayable; if not all grant criteria are met, a loan may be offered.',
                conditions: [
                    'Have completed compulsory schooling',
                    'Be unable to fund the training from your own or your parents’ financial situation',
                    'Apply online, within deadlines that vary by type of training'
                ],
                organization: 'Cantonal office for study and apprenticeship grants (OCBE)'
            }
        }
    },
    {
        id: 'vd-social-assistance',
        theme: 'social',
        scope: 'VD',
        url: 'https://www.vd.ch/aides-financieres-et-soutien-social/aides-financieres-et-comment-les-demander/revenu-dinsertion-ri',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Revenu d’insertion (RI)',
                summary:
                    'Aide sociale vaudoise : aide financière, appui social et mesures d’insertion pour les personnes qui ne peuvent pas subvenir à leurs besoins. Elle intervient après les autres aides possibles.',
                conditions: [
                    'Être majeur et domicilié dans le canton',
                    'Avoir une fortune limitée et des ressources inférieures au barème cantonal',
                    'Prendre contact avec le centre social régional de votre commune'
                ],
                organization: 'Centre social régional (CSR) de votre commune'
            },
            en: {
                title: 'Integration income (RI)',
                summary:
                    'Vaud’s social assistance: financial aid, social support and integration measures for people who cannot meet their needs. It applies after other possible aid.',
                conditions: [
                    'Be an adult living in the canton',
                    'Have limited assets and resources below the cantonal scale',
                    'Contact the regional social centre of your municipality'
                ],
                organization: 'Regional social centre (CSR) of your municipality'
            }
        }
    },

    /* ── Genève ── */
    {
        id: 'ge-premium-subsidy',
        theme: 'health',
        scope: 'GE',
        url: 'https://www.ge.ch/informations-generales-subside-assurance-maladie',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Subside de l’assurance-maladie',
                summary:
                    'Aide du canton pour les primes de l’assurance de base. Il est en principe accordé automatiquement selon le revenu, sans démarche ; certaines situations demandent toutefois une demande.',
                conditions: [
                    'Être domicilié dans le canton de Genève et assuré à la LAMal',
                    'Une demande est nécessaire notamment après un changement de situation, un domicile récent, une imposition à la source, ou un revenu ou une fortune élevés'
                ],
                organization: 'Service de l’assurance-maladie (SAM)'
            },
            en: {
                title: 'Health insurance subsidy',
                summary:
                    'Help from the canton with basic insurance premiums. It is in principle granted automatically based on income, with no application; some situations do require one.',
                conditions: [
                    'Live in the canton of Geneva and be insured under the LAMal',
                    'An application is needed after a change of situation, a recent move, taxation at source, or high income or assets'
                ],
                organization: 'Health insurance service (SAM)'
            }
        }
    },
    {
        id: 'ge-family-supplement',
        theme: 'family',
        scope: 'GE',
        url: 'https://www.ge.ch/demander-prestations-complementaires-familiales',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Prestations complémentaires familiales (PCFam)',
                summary:
                    'Aide financière pour les familles à bas revenus qui exercent une activité, versée en complément du revenu du travail.',
                conditions: [
                    'Avoir des enfants à charge et un revenu du travail modeste',
                    'Être domicilié à Genève depuis au moins 5 ans',
                    'Faire la demande par écrit sur le formulaire officiel, avec les justificatifs'
                ],
                organization: 'Service des prestations complémentaires (SPC)'
            },
            en: {
                title: 'Complementary family benefits (PCFam)',
                summary: 'Financial help for low-income working families, paid on top of employment income.',
                conditions: [
                    'Have dependent children and a modest employment income',
                    'Have lived in Geneva for at least 5 years',
                    'Apply in writing on the official form, with supporting documents'
                ],
                organization: 'Supplementary benefits service (SPC)'
            }
        }
    },
    {
        id: 'ge-scholarship',
        theme: 'education',
        scope: 'GE',
        url: 'https://www.ge.ch/obtenir-bourse-pret-etudes-apprentissage',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Bourses et prêts d’études ou d’apprentissage',
                summary:
                    'Aide financière pour une formation post-obligatoire (secondaire II, tertiaire, perfectionnement, reconversion à partir de 25 ans). Plafonds annuels et délais sur la page officielle.',
                conditions: [
                    'Ne pas pouvoir financer la formation seul·e ou avec l’aide de ses parents',
                    'Respecter les règles de domicile et de statut de séjour',
                    'Déposer la demande en ligne au plus tard 6 mois après le début de l’année scolaire ou académique'
                ],
                organization: 'Service des bourses et prêts d’études (SBPE)'
            },
            en: {
                title: 'Study and apprenticeship grants and loans',
                summary:
                    'Financial help for post-compulsory training (upper secondary, tertiary, further training, retraining from age 25). Annual ceilings and deadlines are on the official page.',
                conditions: [
                    'Be unable to fund the training alone or with your parents’ help',
                    'Meet the residence and permit rules',
                    'Apply online no later than 6 months after the start of the school or academic year'
                ],
                organization: 'Study grants and loans service (SBPE)'
            }
        }
    },
    {
        id: 'ge-social-assistance',
        theme: 'social',
        scope: 'GE',
        url: 'https://www.hospicegeneral.ch/obtenir-de-laide/',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Aide sociale genevoise',
                summary:
                    'Accompagnement social, aide financière et soutien administratif pour les personnes qui ne couvrent plus leurs besoins essentiels (loyer, nourriture, assurance-maladie).',
                conditions: [
                    'Être majeur et domicilié à Genève',
                    'Avoir des ressources insuffisantes après examen de votre situation',
                    'Se rendre au centre d’action sociale (CAS) de votre quartier ou de votre commune'
                ],
                organization: 'Hospice général, centre d’action sociale (CAS)'
            },
            en: {
                title: 'Geneva social assistance',
                summary:
                    'Social support, financial aid and administrative help for people who can no longer cover essentials (rent, food, health insurance).',
                conditions: [
                    'Be an adult living in Geneva',
                    'Have insufficient resources once your situation has been reviewed',
                    'Go to the social action centre (CAS) of your neighbourhood or municipality'
                ],
                organization: 'Hospice général, social action centre (CAS)'
            }
        }
    },

    /* ── Neuchâtel ── */
    {
        id: 'ne-premium-subsidy',
        theme: 'health',
        scope: 'NE',
        url: 'https://www.ne.ch/themes/social/assurance-maladie/subsides-assurance-maladie-lamal',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Subsides de l’assurance-maladie (LAMal)',
                summary:
                    'Réduction des primes de l’assurance de base, versée directement à l’assureur. Le droit dépend de la situation familiale, du revenu et de la fortune ; le système est en grande partie automatique.',
                conditions: [
                    'Être domicilié dans le canton de Neuchâtel et assuré à la LAMal',
                    'Avoir un revenu et une fortune sous les limites fixées chaque année',
                    'En cas de doute, contacter le guichet social régional'
                ],
                organization: 'Guichets sociaux régionaux du canton de Neuchâtel'
            },
            en: {
                title: 'Health insurance subsidies (LAMal)',
                summary:
                    'A reduction of basic insurance premiums, paid directly to the insurer. The right depends on family situation, income and assets; the system is largely automatic.',
                conditions: [
                    'Live in the canton of Neuchâtel and be insured under the LAMal',
                    'Have income and assets below the limits set every year',
                    'If in doubt, contact the regional social counter'
                ],
                organization: 'Regional social counters of the canton of Neuchâtel'
            }
        }
    },
    {
        id: 'ne-scholarship',
        theme: 'education',
        scope: 'NE',
        url: 'https://www.ne.ch/autorites/DECS/SASO/bourses/Pages/accueil.aspx',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Bourses et prêts d’études',
                summary:
                    'Aide pour financer une formation. La demande se fait au guichet social régional de votre commune. Un prêt sans intérêt est possible, notamment si la bourse est refusée.',
                conditions: [
                    'Ne pas pouvoir financer la formation seul·e ou avec l’aide de ses parents',
                    'Bourse : en général avoir moins de 35 ans au début de la formation (un prêt reste possible au-delà)',
                    'Déposer la demande au guichet social régional avant la date limite de la rentrée, et la renouveler chaque année'
                ],
                organization: 'Guichet social régional de votre commune et Office cantonal des aides et bourses (OCAB)'
            },
            en: {
                title: 'Study grants and loans',
                summary:
                    'Help to finance training. The application is made at the regional social counter of your municipality. An interest-free loan is possible, notably if the grant is refused.',
                conditions: [
                    'Be unable to fund the training alone or with your parents’ help',
                    'Grant: generally be under 35 at the start of the training (a loan remains possible beyond that)',
                    'Apply at the regional social counter before the start-of-year deadline, and renew every year'
                ],
                organization: 'Regional social counter of your municipality and the cantonal grants office (OCAB)'
            }
        }
    },
    {
        id: 'ne-social-assistance',
        theme: 'social',
        scope: 'NE',
        url: 'https://www.ne.ch/themes/social/guichets-sociaux-regionaux',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Aide sociale et prestations sociales (guichets sociaux régionaux)',
                summary:
                    'Point d’entrée neuchâtelois pour demander l’aide sociale, mais aussi les avances sur pensions alimentaires, les subsides LAMal et les bourses. L’aide sociale est le dernier filet : les autres ressources passent d’abord.',
                conditions: [
                    'Mettre d’abord à jour votre situation auprès du contrôle des habitants de votre commune',
                    'Contacter le guichet social régional lié à votre commune de domicile',
                    'Remplir le formulaire unique de demande de prestations'
                ],
                organization: 'Guichet social régional (GSR) de votre commune'
            },
            en: {
                title: 'Social assistance and social benefits (regional social counters)',
                summary:
                    'Neuchâtel’s entry point to ask for social assistance, but also maintenance advances, LAMal subsidies and grants. Social assistance is the last safety net: other resources come first.',
                conditions: [
                    'First update your situation with your municipality’s residents’ office',
                    'Contact the regional social counter linked to your municipality of residence',
                    'Fill in the single benefits application form'
                ],
                organization: 'Regional social counter (GSR) of your municipality'
            }
        }
    },

    /* ── Fribourg ── */
    {
        id: 'fr-premium-subsidy',
        theme: 'health',
        scope: 'FR',
        url: 'https://assets.caisseavsfr.ch/fr/Assurances/Reduction-des-primes-d-assurance-maladie/Reduction-des-primes-d-assurance-maladie.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Réduction des primes d’assurance-maladie',
                summary:
                    'Aide du canton de Fribourg pour les primes de l’assurance de base, selon le revenu du ménage. Une demande est à déposer chaque année.',
                conditions: [
                    'Être domicilié dans le canton de Fribourg et assuré à la LAMal',
                    'Avoir un revenu sous les limites du canton',
                    'Déposer la demande à la caisse cantonale de compensation avant la date limite (31 août de l’année en cours)'
                ],
                organization: 'Caisse cantonale de compensation du canton de Fribourg'
            },
            en: {
                title: 'Health insurance premium reduction',
                summary:
                    'Help from the canton of Fribourg with basic insurance premiums, based on household income. An application is filed every year.',
                conditions: [
                    'Live in the canton of Fribourg and be insured under the LAMal',
                    'Have income below the canton’s limits',
                    'Apply to the cantonal compensation fund before the deadline (31 August of the current year)'
                ],
                organization: 'Cantonal compensation fund of the canton of Fribourg'
            }
        }
    },
    {
        id: 'fr-family-allowance',
        theme: 'family',
        scope: 'FR',
        url: 'https://www.fr.ch/vie-quotidienne/enfance-jeunesse-et-famille/les-allocations-familiales/qui-a-droit-aux-allocations-familiales',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Allocations familiales fribourgeoises',
                summary:
                    'Allocation pour enfant, allocation de formation et allocation de naissance ou d’adoption, à un niveau supérieur au minimum fédéral. La page officielle explique qui y a droit et qui les verse.',
                conditions: [
                    'Être salarié·e, indépendant·e ou sans activité (sous conditions de revenu)',
                    'Respecter les règles de priorité entre les ayants droit d’un même enfant',
                    'Les salariés adressent leur demande à l’employeur, les personnes sans activité à la caisse cantonale'
                ],
                organization: 'Caisse cantonale de compensation pour allocations familiales (Fribourg)'
            },
            en: {
                title: 'Fribourg family allowances',
                summary:
                    'A child allowance, a training allowance and a birth or adoption allowance, above the federal minimum. The official page explains who is entitled and who pays.',
                conditions: [
                    'Be an employee, self-employed or without a job (subject to an income limit)',
                    'Follow the priority rules between people entitled for the same child',
                    'Employees apply through their employer, people without a job through the cantonal fund'
                ],
                organization: 'Cantonal compensation fund for family allowances (Fribourg)'
            }
        }
    },
    {
        id: 'fr-family-supplement',
        theme: 'family',
        scope: 'FR',
        url: 'https://assets.caisseavsfr.ch/fr/Assurances/PC-Familles/Prestations-complementaires-pour-familles/Prestations-complementaires-pour-familles.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Prestations complémentaires pour familles (PC Familles)',
                summary:
                    'Aide financière pour les familles à revenu modeste, en vigueur dans le canton de Fribourg depuis le 1er janvier 2026.',
                conditions: [
                    'Respecter les conditions de domicile fixées par le canton',
                    'Avoir des enfants à charge et des dépenses reconnues supérieures aux revenus',
                    'Envoyer le formulaire officiel à la caisse de compensation'
                ],
                organization: 'Caisse cantonale de compensation du canton de Fribourg'
            },
            en: {
                title: 'Supplementary benefits for families (PC Familles)',
                summary: 'Financial help for families on a modest income, in force in the canton of Fribourg since 1 January 2026.',
                conditions: [
                    'Meet the residence conditions set by the canton',
                    'Have dependent children and recognised expenses higher than income',
                    'Send the official form to the compensation fund'
                ],
                organization: 'Cantonal compensation fund of the canton of Fribourg'
            }
        }
    },
    {
        id: 'fr-scholarship',
        theme: 'education',
        scope: 'FR',
        url: 'https://www.fr.ch/formation-et-ecoles/bourses-detudes-et-prets/bourses-detude-ou-dapprentissage',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Bourses d’études ou d’apprentissage',
                summary:
                    'Subsides de formation non remboursables pour un apprentissage ou des études reconnus. Un prêt est proposé dans certains cas, par exemple après une longue formation.',
                conditions: [
                    'Suivre une formation reconnue et avoir son domicile déterminant dans le canton',
                    'Avoir des ressources insuffisantes, personnelles et familiales',
                    'Remplir le formulaire en ligne et le renouveler chaque année'
                ],
                organization: 'Service des subsides de formation (SSF)'
            },
            en: {
                title: 'Study and apprenticeship grants',
                summary:
                    'Non-repayable training grants for a recognised apprenticeship or studies. A loan is offered in some cases, for example after long training.',
                conditions: [
                    'Follow recognised training and have your determining residence in the canton',
                    'Have insufficient personal and family resources',
                    'Fill in the online form and renew it every year'
                ],
                organization: 'Training grants service (SSF)'
            }
        }
    },
    {
        id: 'fr-social-assistance',
        theme: 'social',
        scope: 'FR',
        url: 'https://www.fr.ch/vie-quotidienne/parcours-de-vie/aide-sociale/quelles-sont-les-prestations-de-laide-sociale-et-comment-obtenir-de-laide',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Aide sociale',
                summary:
                    'Aide personnelle, aide matérielle et mesures d’insertion pour les personnes dans le besoin. La démarche est gratuite.',
                conditions: [
                    'Vous adresser au service social régional de votre commune',
                    'Informer complètement le service de votre situation personnelle et financière',
                    'Fournir les documents nécessaires à l’enquête : l’aide peut être refusée sans eux'
                ],
                organization: 'Service social régional de votre commune'
            },
            en: {
                title: 'Social assistance',
                summary: 'Personal help, material help and integration measures for people in need. The application is free of charge.',
                conditions: [
                    'Contact the regional social service of your municipality',
                    'Give the service full information on your personal and financial situation',
                    'Provide the documents needed for the inquiry: aid can be refused without them'
                ],
                organization: 'Regional social service of your municipality'
            }
        }
    },

    /* ── Jura ── */
    {
        id: 'ju-premium-subsidy',
        theme: 'health',
        scope: 'JU',
        url: 'https://www.ecasjura.ch/fr/Assurances/Assurance-maladie.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Réduction des primes d’assurance-maladie',
                summary:
                    'Aide du canton du Jura pour les primes de l’assurance de base, selon le revenu et la fortune. Elle est versée directement à l’assureur.',
                conditions: [
                    'Être domicilié dans le canton du Jura et assuré à la LAMal',
                    'Avoir un revenu et une fortune sous les limites fixées chaque année',
                    'Les personnes déjà taxées sont en général informées ; les autres déposent une demande dans le délai annuel'
                ],
                organization: 'Caisse de compensation du canton du Jura (ECAS Jura)'
            },
            en: {
                title: 'Health insurance premium reduction',
                summary:
                    'Help from the canton of Jura with basic insurance premiums, based on income and assets. It is paid directly to the insurer.',
                conditions: [
                    'Live in the canton of Jura and be insured under the LAMal',
                    'Have income and assets below the limits set every year',
                    'People already assessed for tax are generally informed; others apply within the yearly deadline'
                ],
                organization: 'Compensation fund of the canton of Jura (ECAS Jura)'
            }
        }
    },
    {
        id: 'ju-family-allowance',
        theme: 'family',
        scope: 'JU',
        url: 'https://www.ecasjura.ch/fr/Assurances/AF/Allocations-familiales/Allocations-familiales.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Allocations familiales jurassiennes',
                summary:
                    'Allocation pour enfant, allocation de formation et allocation de naissance ou d’adoption, supérieures au minimum fédéral. Les montants figurent sur la page officielle.',
                conditions: [
                    'Être salarié·e, indépendant·e ou sans activité (sous conditions)',
                    'Adresser la demande à la caisse de l’employeur ou de l’indépendant, ou à la caisse cantonale pour les personnes sans activité'
                ],
                organization: 'Caisse de compensation du canton du Jura (ECAS Jura)'
            },
            en: {
                title: 'Jura family allowances',
                summary:
                    'A child allowance, a training allowance and a birth or adoption allowance, above the federal minimum. Amounts are on the official page.',
                conditions: [
                    'Be an employee, self-employed or without a job (subject to conditions)',
                    'Apply to your employer’s or self-employed fund, or to the cantonal fund if you have no job'
                ],
                organization: 'Compensation fund of the canton of Jura (ECAS Jura)'
            }
        }
    },
    {
        id: 'ju-scholarship',
        theme: 'education',
        scope: 'JU',
        url: 'https://www.jura.ch/bourses',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Bourses et prêts d’études',
                summary:
                    'Subsides de formation pour des études ou un apprentissage. La demande se dépose en ligne sur le guichet virtuel du canton, avec un questionnaire d’éligibilité.',
                conditions: [
                    'Avoir son domicile déterminant dans le canton du Jura',
                    'Ne pas pouvoir financer la formation seul·e ou avec l’aide de ses parents',
                    'Déposer la demande avant la date limite liée au début de la formation'
                ],
                organization: 'Service de la formation postobligatoire (SFP), section des bourses et prêts d’études'
            },
            en: {
                title: 'Study grants and loans',
                summary:
                    'Training grants for studies or an apprenticeship. The application is filed online on the canton’s virtual counter, with an eligibility questionnaire.',
                conditions: [
                    'Have your determining residence in the canton of Jura',
                    'Be unable to fund the training alone or with your parents’ help',
                    'Apply before the deadline linked to the start of the training'
                ],
                organization: 'Post-compulsory training service (SFP), grants and loans section'
            }
        }
    },
    {
        id: 'ju-social-assistance',
        theme: 'social',
        scope: 'JU',
        url: 'https://www.jura.ch/fr/Autorites/Administration/DSJP/SAS/Service-de-l-action-sociale-Action-sociale-SAS.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Aide sociale jurassienne',
                summary:
                    'La demande se fait auprès du service social régional du lieu de domicile ; le Service de l’action sociale décide du droit, les communes versent l’aide.',
                conditions: [
                    'S’adresser au service social régional de son lieu de domicile ou de séjour, oralement ou par écrit',
                    'Le dossier est complété par la commune puis transmis au Service de l’action sociale pour décision'
                ],
                organization: 'Service de l’action sociale (SAS) et service social régional'
            },
            en: {
                title: 'Jura social assistance',
                summary:
                    'Apply to the regional social service of your place of residence; the Social Action Service decides on the right, and municipalities pay the aid.',
                conditions: [
                    'Contact the regional social service of your place of residence or stay, orally or in writing',
                    'The file is completed by the municipality, then sent to the Social Action Service for a decision'
                ],
                organization: 'Social Action Service (SAS) and regional social service'
            }
        }
    },

    /* ── Berne (canton bilingue : pages officielles en français) ── */
    {
        id: 'be-premium-subsidy',
        theme: 'health',
        scope: 'BE',
        url: 'https://www.asv.dij.be.ch/fr/start/themen/pv.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Réduction des primes d’assurance-maladie',
                summary:
                    'Aide du canton de Berne pour les primes de l’assurance de base. Le droit est en principe calculé d’office d’après les données fiscales, puis versé directement à l’assureur ; certaines situations demandent une demande.',
                conditions: [
                    'Être domicilié dans le canton de Berne et assuré à la LAMal',
                    'Une demande est nécessaire notamment pour certains jeunes adultes, l’imposition à la source, l’absence de revenu déclaré, un déménagement depuis un autre canton ou un changement de situation en cours d’année',
                    'La demande vaut pour l’année civile en cours et doit parvenir à l’office au plus tard le 31 décembre'
                ],
                organization: 'Office des assurances sociales (OAS), réduction des primes'
            },
            en: {
                title: 'Health insurance premium reduction',
                summary:
                    'Help from the canton of Bern with basic insurance premiums. The right is in principle calculated automatically from tax data and paid directly to the insurer; some situations require an application.',
                conditions: [
                    'Live in the canton of Bern and be insured under the LAMal',
                    'An application is needed notably for some young adults, taxation at source, no declared income, a move from another canton or a change of situation during the year',
                    'The application covers the current calendar year and must reach the office by 31 December at the latest'
                ],
                organization: 'Social Insurance Office (OAS), premium reduction'
            }
        }
    },
    {
        id: 'be-family-allowance',
        theme: 'family',
        scope: 'BE',
        url: 'https://www.akbern.ch/fr/Assurances/AF/Allocations-familiales/Allocations-familiales.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Allocations familiales bernoises',
                summary:
                    'Allocations pour enfant et de formation selon le droit fédéral et les taux fixés par le canton de Berne. Le droit naît à la naissance de l’enfant. Les taux figurent sur la page officielle.',
                conditions: [
                    'Être salarié·e, indépendant·e ou sans activité lucrative',
                    'Avoir un lien de filiation avec l’enfant, vivre avec l’enfant de son conjoint ou en avoir la garde',
                    'Les salariés et indépendants adressent la demande à la caisse d’allocations familiales de l’employeur ou de leur propre caisse, les personnes sans activité à la caisse cantonale'
                ],
                organization: 'Caisse de compensation du canton de Berne (CCB), caisse d’allocations familiales'
            },
            en: {
                title: 'Bern family allowances',
                summary:
                    'Child and training allowances under federal law and the rates set by the canton of Bern. The right starts at the child’s birth. The rates are on the official page.',
                conditions: [
                    'Be an employee, self-employed or without gainful activity',
                    'Be the child’s parent, live with your spouse’s child or have custody',
                    'Employees and the self-employed apply to the employer’s or their own family allowance fund, people without activity to the cantonal fund'
                ],
                organization: 'Compensation fund of the canton of Bern (CCB), family allowance fund'
            }
        }
    },
    {
        id: 'be-scholarship',
        theme: 'education',
        scope: 'BE',
        url: 'https://www.bkd.be.ch/fr/start/dienstleistungen/foerderung-und-unterstuetzung/ausbildungsbeitraege.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Subsides de formation (bourses et prêts)',
                summary:
                    'Aide pour une première formation, calculée avant tout selon la situation financière des parents. La demande se fait uniquement en ligne sur BourseBE-Online, avec un compte BE-Login.',
                conditions: [
                    'Suivre une première formation reconnue, les parents étant domiciliés dans le canton de Berne',
                    'Ne pas pouvoir financer la formation seul·e ou avec l’aide de ses parents',
                    'Déposer la demande au plus tard le 30 juin pour une formation qui commence au premier semestre, le 31 décembre pour une formation qui commence au second'
                ],
                organization: 'Section des subsides de formation, Direction de l’instruction publique et de la culture (INC)',
                note: 'Un prêt peut être possible dans d’autres cas : voir la page officielle.'
            },
            en: {
                title: 'Training grants and loans',
                summary:
                    'Help for a first training, calculated mainly on the parents’ financial situation. The application is made online only, on BourseBE-Online, with a BE-Login account.',
                conditions: [
                    'Follow a recognised first training, with parents living in the canton of Bern',
                    'Be unable to fund the training alone or with your parents’ help',
                    'Apply by 30 June for training starting in the first half of the year, by 31 December for training starting in the second half'
                ],
                organization: 'Training grants section, Department of Education and Culture (INC)',
                note: 'A loan may be possible in other cases: see the official page.'
            }
        }
    },
    {
        id: 'be-social-assistance',
        theme: 'social',
        scope: 'BE',
        url: 'https://www.gsi.be.ch/fr/start/themen/soziales/sozialhilfe.html',
        verifiedAt: V,
        texts: {
            fr: {
                title: 'Aide sociale bernoise',
                summary:
                    'Aide temporaire pour les personnes qui ne peuvent pas subvenir seules à leurs besoins. Elle est assurée par le service social de la commune de domicile ; l’Office de l’intégration et de l’action sociale supervise le dispositif.',
                conditions: [
                    'Être domicilié dans le canton de Berne',
                    'Ne pas disposer de ressources suffisantes pour couvrir ses besoins',
                    'S’adresser au service social de sa commune de domicile (les règles diffèrent pour l’asile et certaines admissions provisoires)'
                ],
                organization: 'Service social de votre commune ; Office de l’intégration et de l’action sociale (OIAS)'
            },
            en: {
                title: 'Bern social assistance',
                summary:
                    'Temporary help for people who cannot meet their needs on their own. It is provided by the social service of your municipality of residence; the Integration and Social Action Office oversees the scheme.',
                conditions: [
                    'Live in the canton of Bern',
                    'Not have sufficient resources to cover your needs',
                    'Contact the social service of your municipality of residence (different rules apply to asylum and some provisional admissions)'
                ],
                organization: 'Your municipality’s social service; Integration and Social Action Office (OIAS)'
            }
        }
    }
];

/** Toutes les aides 2026 : Confédération, cantons romands et Berne ci-dessus, autres cantons dans `aids-2026-cantons.ts`. */
export const AIDS_2026: AidEntry[] = [...AIDS_2026_BASE, ...AIDS_2026_CANTONS];
