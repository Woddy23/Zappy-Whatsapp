import { build } from 'esbuild';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
await mkdir('extension', { recursive: true });
await build({ entryPoints: ['src/content.ts', 'src/settings.ts', 'src/background.ts', 'src/whatsapp.ts'], outdir: 'extension', bundle: true, format: 'iife', target: 'chrome120', minify: false, legalComments: 'eof' });
for (const file of ['settings.html', 'settings.css']) await copyFile(`src/${file}`, `extension/${file}`);
const settingsFixture = (await readFile('src/settings.html', 'utf8'))
  .replace('href="settings.css"', 'href="../extension/settings.css"')
  .replace('<script src="settings.js"></script>', '<script src="browser-mock.js"></script><script src="../extension/settings.js"></script>');
await writeFile('tests/settings-fixture.html', settingsFixture);
for (const file of ['LICENSE', 'LICENSE.Apache']) await copyFile(`node_modules/libphonenumber-js/${file}`, `extension/libphonenumber-js-${file}.txt`);
const manifest = {
  manifest_version: 3, name: 'WhatsApp na ficha — piloto Zappy', version: '0.1.0',
  description: 'Prepara mensagens para o cliente da ficha Zappy. O envio é feito manualmente no WhatsApp.',
  minimum_chrome_version: '120', permissions: ['storage', 'clipboardWrite'],
  action: { default_title: 'Configurar mensagens — WhatsApp na ficha' },
  options_page: 'settings.html',
  background: { service_worker: 'background.js' },
  content_scripts: [{ matches: ['https://zappysoftware.com/backoffice/*'], js: ['content.js'], run_at: 'document_idle' }, { matches: ['https://web.whatsapp.com/*'], js: ['whatsapp.js'], run_at: 'document_idle' }],
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'" }
};
await writeFile('extension/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await build({ entryPoints: ['src/core.ts', 'src/adapter.ts'], outdir: 'tests/compiled', bundle: true, format: 'esm', platform: 'node', target: 'node22' });
