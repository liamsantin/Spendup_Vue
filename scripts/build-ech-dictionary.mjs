/**
 * Génère le dictionnaire des champs de montant de la norme eCH-0278 (déclaration d'impôts des personnes physiques)
 * à partir du classeur Excel de la norme : nom standard, libellés français / allemand / italien, personnes concernées,
 * et ressort (canton / Confédération). Aucune dépendance : le classeur est un zip lu avec `node:zlib`.
 *
 * Usage : node scripts/build-ech-dictionary.mjs [chemin/du/classeur.xlsx]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultInput = path.resolve(
    here,
    '../../Spendup_Api/Conception/Impots/eCH-0278_E-Tax-NP_v1.0.0/BEIL_d_f_I_DEF_2026-01-22-eCH-0278_V1.0.0_E-Tax_NP.xlsx'
);
const input = process.argv[2] ? path.resolve(process.argv[2]) : defaultInput;
const output = path.resolve(here, '../src/features/tax/reader/ech/ech-0278-fields.json');

/** Lit les fichiers d'une archive zip (méthodes « stocké » et « deflate »). */
function readZip(buffer) {
    const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error('Archive zip invalide');
    const count = buffer.readUInt16LE(eocd + 10);
    let offset = buffer.readUInt32LE(eocd + 16);
    const files = new Map();
    for (let i = 0; i < count; i++) {
        const method = buffer.readUInt16LE(offset + 10);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const localOffset = buffer.readUInt32LE(offset + 42);
        const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
        const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
        const raw = buffer.subarray(dataStart, dataStart + compressedSize);
        files.set(name, method === 0 ? raw : zlib.inflateRawSync(raw));
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return files;
}

const decode = (text) =>
    text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\r\n|\r/g, '\n')
        .trim();

const files = readZip(fs.readFileSync(input));
const sharedXml = files.get('xl/sharedStrings.xml').toString('utf8');
const strings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decode([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
);
const sheetXml = files.get('xl/worksheets/sheet1.xml').toString('utf8');

const rows = [];
for (const row of sheetXml.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cell of row[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const value = /<v>([\s\S]*?)<\/v>/.exec(cell[3] ?? '');
        if (value) cells[cell[1]] = /t="s"/.test(cell[2]) ? strings[Number(value[1])] : value[1];
    }
    rows.push({ line: Number(row[1]), cells });
}

// colonnes : B niveau, D nom du champ, F type, I/J/K personnes, Q/R ressort, V/W/X libellés DE/FR/IT, Y description FR
const flag = (cell) => (cell === undefined ? undefined : cell.trim().toLowerCase() === 'x');
const stack = [];
const fields = [];
for (const { line, cells } of rows) {
    if (line < 31 || !cells.D) continue;
    const level = Number(cells.B);
    if (Number.isNaN(level)) continue;
    stack.length = level;
    stack[level] = {
        name: cells.D.trim(),
        fr: (cells.W ?? cells.A ?? '').trim(),
        flags: { p1: flag(cells.I), p2: flag(cells.J), both: flag(cells.K), cantonal: flag(cells.Q), federal: flag(cells.R) }
    };
    if (!/moneyType/.test(cells.F ?? '')) continue;
    const ancestors = stack.slice(0, level).filter(Boolean);
    const inherit = (key) =>
        [stack[level].flags[key], ...[...ancestors].reverse().map((a) => a.flags[key])].find((value) => value !== undefined);
    fields.push({
        field: cells.D.trim(),
        path: [...ancestors.map((a) => a.name), cells.D.trim()].join('/'),
        section: ancestors[ancestors.length - 1]?.fr ?? '',
        de: (cells.V ?? cells.A ?? '').trim(),
        fr: (cells.W ?? '').trim(),
        it: (cells.X ?? '').trim(),
        descriptionFr: (cells.Y ?? '').trim(),
        person1: inherit('p1') ?? false,
        person2: inherit('p2') ?? false,
        cantonal: inherit('cantonal') ?? false,
        federal: inherit('federal') ?? false
    });
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify({ source: 'eCH-0278 E-Tax NP v1.0.0 (22.01.2026)', fields }, null, 2)}\n`);
console.log(`${fields.length} champs de montant écrits dans ${path.relative(process.cwd(), output)}`);
