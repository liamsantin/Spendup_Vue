/**
 * Build Tauri (Windows) puis publie le MSI sous un nom stable pour la landing :
 * `public/downloads/SpendUp-Setup-x64.msi`
 *
 * Usage :
 *   node scripts/publish-windows-msi.mjs          # build + copie
 *   node scripts/publish-windows-msi.mjs --copy-only
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const msiDir = join(root, 'src-tauri', 'target', 'release', 'bundle', 'msi');
const outDir = join(root, 'public', 'downloads');
const outFile = join(outDir, 'SpendUp-Setup-x64.msi');
const copyOnly = process.argv.includes('--copy-only');

function fail(message) {
    console.error(`\n✗ ${message}\n`);
    process.exit(1);
}

function findLatestMsi() {
    if (!existsSync(msiDir)) {
        fail(`Aucun dossier MSI : ${msiDir}\n  Lance d’abord un build Tauri (sans --copy-only).`);
    }

    const files = readdirSync(msiDir)
        .filter((name) => name.toLowerCase().endsWith('.msi'))
        .map((name) => {
            const path = join(msiDir, name);
            return { name, path, mtime: statSync(path).mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
        fail(`Aucun fichier .msi dans ${msiDir}`);
    }

    return files[0];
}

function publishMsi() {
    const latest = findLatestMsi();
    mkdirSync(outDir, { recursive: true });
    copyFileSync(latest.path, outFile);

    const mb = (statSync(outFile).size / (1024 * 1024)).toFixed(1);
    console.log(`✓ MSI publié : ${latest.name}`);
    console.log(`  → public/downloads/SpendUp-Setup-x64.msi (${mb} Mo)`);
    console.log(`  URL landing : /downloads/SpendUp-Setup-x64.msi`);
}

if (!copyOnly) {
    console.log('→ npm run tauri:build…\n');
    const result = spawnSync('npm', ['run', 'tauri:build'], {
        cwd: root,
        stdio: 'inherit',
        shell: true,
        env: process.env
    });
    if (result.status !== 0) {
        fail(`tauri:build a échoué (code ${result.status ?? 'inconnu'})`);
    }
    console.log('');
}

publishMsi();
