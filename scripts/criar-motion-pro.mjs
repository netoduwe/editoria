import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!name || !/^[a-z0-9][a-z0-9_-]*$/i.test(name)) {
  console.error('Uso: node scripts/criar-motion-pro.mjs <nome> (letras, números, hífen ou sublinhado)');
  process.exit(1);
}
const target = path.join(root, 'projetos', name);
if (fs.existsSync(target)) {
  console.error('O projeto já existe. Escolha outro nome para preservar seu trabalho.');
  process.exit(1);
}
const source = path.join(root, '.agents', 'skills', 'motion-graphics-pro');
fs.mkdirSync(path.join(target, 'assets', 'fonts'), { recursive: true });
fs.mkdirSync(path.join(target, 'out'));
fs.copyFileSync(path.join(source, 'templates', 'index.html'), path.join(target, 'index.html'));
fs.copyFileSync(path.join(source, 'templates', 'gsap.min.js'), path.join(target, 'assets', 'gsap.min.js'));
fs.copyFileSync(path.join(source, 'templates', 'fonts.css'), path.join(target, 'assets', 'fonts', 'fonts.css'));
for (const font of ['inter-800.woff2', 'OFL-Inter.txt']) {
  fs.copyFileSync(path.join(root, 'fontes', font), path.join(target, 'assets', 'fonts', font));
}
for (const script of ['render.mjs', 'audio.py', 'contact_sheet.py']) {
  fs.copyFileSync(path.join(source, 'scripts', script), path.join(target, script));
}
fs.copyFileSync(path.join(root, 'marca', 'design.md'), path.join(target, 'design.md'));
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({
  private: true, type: 'module', dependencies: { playwright: '1.56.1' }
}, null, 2) + '\n');
fs.writeFileSync(path.join(target, '.gitignore'), 'node_modules/\nout/\n');
console.log(`Projeto criado: ${target}\nEntre nessa pasta e siga o setup da skill motion-graphics-pro.`);
