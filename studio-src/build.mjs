// Builds the single-file app: Mindea-Creative-Studio.html
// Usage: node studio-src/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(join(dir, f), 'utf8');
const js = readdirSync(join(dir, 'js')).filter(f => f.endsWith('.js')).sort().map(f => `/* ── ${f} ── */\n` + read('js/' + f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS must not contain a closing script tag');
const themeBoot = `<script>try{var t=localStorage.getItem('mcs-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>`;
const html = `${read('head.html')}${themeBoot}
<style>
${read('styles.css')}
</style>
</head>
<body>
${read('shell.html')}
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync(join(dir, '..', 'Mindea-Creative-Studio.html'), html);
console.log('Built Mindea-Creative-Studio.html', (html.length / 1024).toFixed(0) + ' KB');
