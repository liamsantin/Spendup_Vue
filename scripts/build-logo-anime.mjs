/**
 * Génère les logos animés de la marque à partir du logo statique `public/brand/spendup-logo-bleu.svg` :
 *   - `public/brand/spendup-logo-anime.svg`          (horizontal : icône à gauche, « Spend.Up » à droite)
 *   - `public/brand/spendup-logo-vertical-anime.svg` (vertical : icône centrée, « Spend.Up » dessous)
 *
 * Un seul fichier SVG autonome par variante (tracés + animations SMIL), utilisable comme une image.
 * Chorégraphie (boucle de 5 s) : la carte bleue (porte-monnaie) tombe en premier, de moins haut ;
 * les trois autres cartes y tombent et rebondissent ; éventail ; « Spend » monte lettre par lettre,
 * le point bleu tombe, « Up » monte ; pose ; le texte redescend, les cartes se replient et ressortent.
 *
 * Usage : node scripts/build-logo-anime.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = join(root, 'public', 'brand');

// ---------------------------------------------------------------------------------------------
// Tracés du mot-symbole, repris du logo statique (deux <path> : « Spend » puis « Up », + le point)
// ---------------------------------------------------------------------------------------------
const source = readFileSync(join(brandDir, 'spendup-logo-bleu.svg'), 'utf8');
const paths = [...source.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 100) / 100));
const subpaths = (d) =>
    round(d)
        .split(/\s*(?=M)/)
        .filter(Boolean);
const spend = subpaths(paths[0]);
const up = subpaths(paths[1]);
if (spend.length !== 8 || up.length !== 3) {
    throw new Error(`Tracés inattendus dans spendup-logo-bleu.svg (${spend.length} / ${up.length} sous-tracés)`);
}
/** Une entrée par glyphe (contour + contre-forme), dans l'ordre d'apparition. */
const glyphs = [
    { d: spend[0] }, // S
    { d: spend[1] + spend[2] }, // p
    { d: spend[3] + spend[4] }, // e
    { d: spend[5] }, // n
    { d: spend[6] + spend[7] }, // d
    'dot',
    { d: up[0] }, // U
    { d: up[1] + up[2] } // p
];

// ---------------------------------------------------------------------------------------------
// Chronologie (fractions de la boucle)
// ---------------------------------------------------------------------------------------------
const DUR = 5;
const HOLD = 0.84; // tout est posé jusqu'ici
const TEXT_OUT = 0.89; // le texte a fini de redescendre
const FOLD = 0.9; // les cartes sont repliées
const OUT = 0.97; // les cartes sont ressorties
const WALLET_FALL = [0, 0.05]; // la carte bleue tombe en premier, de moins haut
const CARD_FALLS = [0.06, 0.09, 0.12]; // arrière 1, arrière 2, noire
const FANS = [0.35, 0.33, 0.31]; // ouverture de l'éventail (même ordre)
const CHIP_AT = 0.34;
const BAR_AT = 0.37;
const TEXT_AT = 0.4;
const LETTER_STAGGER = 0.012;
const LETTER_RISE = 0.09;
const DOT_AT = TEXT_AT + 0.1;
const UP_AT = TEXT_AT + 0.16;

const f = (n) => String(Math.round(n * 1000) / 1000);
const keyed = (times, values, splines) =>
    `keyTimes="${times.map(f).join(';')}" values="${values.join(';')}"` +
    (splines ? ` calcMode="spline" keySplines="${splines.join(';')}"` : '');
const anim = (attr, times, values, splines) =>
    `<animate attributeName="${attr}" dur="${DUR}s" repeatCount="indefinite" ${keyed(times, values, splines)}/>`;
const move = (type, times, values, splines) =>
    `<animateTransform attributeName="transform" type="${type}" dur="${DUR}s" repeatCount="indefinite" ${keyed(times, values, splines)}/>`;

const LINEAR = '0 0 1 1';
const ACCEL = '.45 0 1 1';
const BOUNCE_UP = '.2 0 .6 1';
const BOUNCE_DOWN = '.4 0 1 1';
const SETTLE = '.2 .9 .25 1';
const LEAVE = '.6 0 .8 .4';

/** Chute d'une carte depuis le haut, deux rebonds, puis sortie par le haut en fin de boucle. */
const cardFall = (s) =>
    move(
        'translate',
        [0, s, s + 0.055, s + 0.085, s + 0.115, s + 0.133, s + 0.15, FOLD, OUT, 1],
        ['0 -650', '0 -650', '0 0', '0 -65', '0 0', '0 -16', '0 0', '0 0', '0 -650', '0 -650'],
        [LINEAR, ACCEL, BOUNCE_UP, BOUNCE_DOWN, BOUNCE_UP, BOUNCE_DOWN, LINEAR, '.5 0 1 1', LINEAR]
    );

/** Le porte-monnaie : chute courte en fondu, un seul rebond, remonte en fondu après les autres. */
const walletFall =
    move(
        'translate',
        [WALLET_FALL[0], WALLET_FALL[1], 0.08, 0.11, 0.125, 0.14, 0.93, 0.98, 1],
        ['0 -380', '0 0', '0 -45', '0 0', '0 -10', '0 0', '0 0', '0 -380', '0 -380'],
        [ACCEL, BOUNCE_UP, BOUNCE_DOWN, BOUNCE_UP, BOUNCE_DOWN, LINEAR, '.5 0 1 1', LINEAR]
    ) + anim('opacity', [0, 0.03, 0.93, 0.97, 1], [0, 1, 1, 0, 0]);

/** Éventail : léger dépassement d'angle avant de se poser, repli en fin de boucle. */
const fan = (deg, s) => {
    const r = (v) => `${v} 300 650`;
    return move(
        'rotate',
        [0, s, s + 0.07, s + 0.1, HOLD, FOLD, 1],
        [r(0), r(0), r(deg * 1.25), r(deg), r(deg), r(0), r(0)],
        [LINEAR, '.2 .8 .3 1', '.4 0 .6 1', LINEAR, '.6 0 .4 1', LINEAR]
    );
};

/** Détail blanc qui se dessine (puis s'efface à la sortie). */
const grow = (attr, s, from, to) =>
    anim(
        attr,
        [0, s, s + 0.06, HOLD, HOLD + 0.04, 1],
        [from, from, to, to, from, from],
        [LINEAR, '.2 .8 .2 1', LINEAR, '.6 0 .4 1', LINEAR]
    );

/** Lettre qui monte depuis sous la ligne de base, puis redescend à la sortie. */
const rise = (t0) =>
    move(
        'translate',
        [0, t0, t0 + LETTER_RISE, HOLD, TEXT_OUT, 1],
        ['0 230', '0 230', '0 0', '0 0', '0 230', '0 230'],
        [LINEAR, SETTLE, LINEAR, LEAVE, LINEAR]
    );

/** Le point bleu tombe d'en haut avec un rebond. */
const dotDrop = move(
    'translate',
    [0, DOT_AT, DOT_AT + 0.05, DOT_AT + 0.07, DOT_AT + 0.09, HOLD, TEXT_OUT, 1],
    ['0 -240', '0 -240', '0 0', '0 -45', '0 0', '0 0', '0 230', '0 230'],
    [LINEAR, BOUNCE_DOWN, BOUNCE_UP, '.4 0 .8 1', LINEAR, LEAVE, LINEAR]
);

// ---------------------------------------------------------------------------------------------
// Assemblage
// ---------------------------------------------------------------------------------------------
const icon = `
    <g>${cardFall(CARD_FALLS[0])}<g>${fan(-21, FANS[0])}<rect x="260" y="310" width="420" height="280" class="back"/></g></g>
    <g>${cardFall(CARD_FALLS[1])}<g>${fan(-14, FANS[1])}<rect x="272" y="324" width="420" height="280" class="back"/></g></g>
    <g>${cardFall(CARD_FALLS[2])}<g>${fan(-7, FANS[2])}<rect x="284" y="338" width="420" height="280" class="mid"/></g></g>
    <g>${walletFall}
      <rect x="300" y="370" width="420" height="290" class="front"/>
      <rect x="350.4" y="422.2" width="79.8" height="63.8" class="detail">
        ${grow('y', CHIP_AT, 454.1, 422.2)}
        ${grow('height', CHIP_AT, 0, 63.8)}
      </rect>
      <rect x="350.4" y="573" width="168" height="26.1" class="detail">
        ${grow('width', BAR_AT, 0, 168)}
      </rect>
    </g>`;

const wordmark = glyphs
    .map((g, i) => {
        if (g === 'dot') return `    <g><rect x="983.7" y="259.4" width="32" height="32" class="dot"/>${dotDrop}</g>`;
        const t0 = i < 5 ? TEXT_AT + i * LETTER_STAGGER : UP_AT + (i - 6) * LETTER_STAGGER;
        return `    <g><path d="${g.d}" class="ink"/>${rise(t0)}</g>`;
    })
    .join('\n');

const style = `  <style>
    .back { fill: #E1E3E8; }
    .mid { fill: #0B0C10; }
    .front { fill: #5D87FF; }
    .detail { fill: #FFFFFF; }
    .ink { fill: #0B0C10; }
    .dot { fill: #5D87FF; }
  </style>`;

/**
 * @param {object} o
 * @param {number} o.width  largeur du canevas
 * @param {number} o.height hauteur du canevas
 * @param {string} o.iconTransform  position/échelle de l'icône (mêmes valeurs que le logo statique)
 * @param {string} o.markTransform  position/échelle du mot-symbole (repère du logo horizontal)
 * @param {string} o.iconClip  zone visible de l'icône (les cartes arrivent par le haut)
 * @param {string} o.markClip  zone visible du texte (les lettres arrivent par le bas, le point par le haut)
 */
const build = ({
    width,
    height,
    iconTransform,
    markTransform,
    iconClip,
    markClip
}) => `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <title>Spend.Up</title>
${style}
  <defs>
    <clipPath id="icon-clip">${iconClip}</clipPath>
    <clipPath id="mark-clip">${markClip}</clipPath>
  </defs>
  <g clip-path="url(#icon-clip)">
  <g transform="${iconTransform}">${icon}
  </g>
  </g>
  <g clip-path="url(#mark-clip)">
  <g transform="${markTransform}">
${wordmark}
  </g>
  </g>
</svg>
`;

// Horizontal : mêmes positions que spendup-logo-bleu.svg (1353 × 395)
const horizontal = build({
    width: 1353,
    height: 395,
    iconTransform: 'translate(80 80) scale(0.4556) translate(-140 -196)',
    markTransform: 'translate(0 0)',
    iconClip: '<rect x="0" y="0" width="400" height="395"/>',
    markClip: '<rect x="400" y="110" width="900" height="235"/>'
});

// Vertical : canevas de spendup-logo-vertical-bleu.svg (811 × 629), texte réduit à 75 %.
// L'icône est 10 % plus petite que dans le logo statique (centrée, même bord bas) et le texte est
// décalé de 12 px à droite : centrage optique sous la carte bleue, elle-même à droite de l'éventail.
const vertical = build({
    width: 811,
    height: 629,
    iconTransform: 'translate(237 111) scale(0.58) translate(-140 -196)',
    markTransform: 'translate(-212.05 330.8) scale(0.75)',
    iconClip: '<rect x="0" y="0" width="811" height="405"/>',
    // s'arrête juste sous le jambage du « p » : les lettres en attente (230 × 0,75 plus bas) restent cachées
    markClip: '<rect x="0" y="415" width="811" height="175"/>'
});

writeFileSync(join(brandDir, 'spendup-logo-anime.svg'), horizontal);
writeFileSync(join(brandDir, 'spendup-logo-vertical-anime.svg'), vertical);
console.log('Écrit : public/brand/spendup-logo-anime.svg, public/brand/spendup-logo-vertical-anime.svg');
