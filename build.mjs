import { build } from 'esbuild';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
await mkdir('extension', { recursive: true });
await build({ entryPoints: ['src/content.ts', 'src/settings.ts', 'src/background.ts'], outdir: 'extension', bundle: true, format: 'iife', target: 'chrome120', minify: false, legalComments: 'eof' });
for (const file of ['settings.html', 'settings.css']) await copyFile(`src/${file}`, `extension/${file}`);
for (const file of ['LICENSE', 'LICENSE.Apache']) await copyFile(`node_modules/libphonenumber-js/${file}`, `extension/libphonenumber-js-${file}.txt`);
const manifest = {
  manifest_version: 3, name: 'Ficha Cliente Whatsapp Zappy', version: '0.1.0',
  description: 'Prepara mensagens para o cliente da ficha Zappy. O envio é feito manualmente no WhatsApp.',
  minimum_chrome_version: '120', permissions: ['storage', 'clipboardWrite'],
  action: { default_title: 'Configurar mensagens — WhatsApp na ficha' },
  options_page: 'settings.html',
  background: { service_worker: 'background.js' },
  content_scripts: [{ matches: ['https://zappysoftware.com/backoffice/*'], js: ['content.js'], run_at: 'document_idle' }],
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'" }
};
await writeFile('extension/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
