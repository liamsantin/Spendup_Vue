/** Pre-commit : ne jamais vérifier `_template/` (références lecture seule). */
const TEMPLATE_DIR = /(?:^|[/\\])_template(?:[/\\]|$)/;

function withoutTemplate(files) {
    return files.filter((file) => !TEMPLATE_DIR.test(file));
}

function quote(files) {
    return files.map((file) => JSON.stringify(file)).join(' ');
}

export default {
    '*.{js,mjs,cjs,ts,vue}': (files) => {
        const next = withoutTemplate(files);
        if (!next.length) return [];
        const listed = quote(next);
        return [`eslint --fix --no-warn-ignored ${listed}`, `prettier --write ${listed}`];
    },
    '*.{json,md,scss,css,html,yml,yaml}': (files) => {
        const next = withoutTemplate(files);
        if (!next.length) return [];
        return [`prettier --write ${quote(next)}`];
    }
};
