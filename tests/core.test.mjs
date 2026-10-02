import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, MAX_IMAGE_BYTES, migrateConfig, validateConfig, validateImage, normalisePhone, renderMessage, makeWhatsAppUrl, validateUrl } from './compiled/core.js';

test('international prefixes and national numbers normalize without guessing country', () => {
  assert.equal(normalisePhone('+1 (202) 555-0147'), '+12025550147');
  assert.equal(normalisePhone('0012025550147', 'pt'), '+12025550147');
  assert.equal(normalisePhone('2025550147', 'us'), '+12025550147');
  for (const args of [['2025550147'], ['2025550147', 'zz'], ['123', 'pt'], ['+12025550147 ext 2']]) assert.throws(() => normalisePhone(...args));
});
test('template expansion validates required and unknown variables', () => {
  const config = { ...defaults, business: 'Example Salon', appUrl: 'https://example.com/app' };
  assert.equal(renderMessage('{primeiroNome}|{nome}|{salao}|{linkApp}', 'Ana Silva', config), 'Ana|Ana Silva|Example Salon|https://example.com/app');
  assert.throws(() => renderMessage('{linkApp}', 'Ana', defaults));
  assert.throws(() => renderMessage('{unknown}', 'Ana', config));
});
test('oversized PNG data is rejected by production validation', () => {
  const bytes = Buffer.alloc(MAX_IMAGE_BYTES + 1);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes);
  assert.throws(() => validateImage(`data:image/png;base64,${bytes.toString('base64')}`), /2 MB/);
});
test('valid individual image sizes cannot bypass total configuration budget', () => {
  const bytes = Buffer.alloc(MAX_IMAGE_BYTES);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes);
  const image = `data:image/png;base64,${bytes.toString('base64')}`;
  assert.equal(validateImage(image), image);
  const templates = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, label: `T${i}`, text: 'Hello', image: `i${i}` }));
  const images = Object.fromEntries(templates.map(t => [t.image, image]));
  assert.throws(() => validateConfig({ ...defaults, templates, images }), /9 MB/);
});
test('custom Unicode text round trips through WhatsApp URL; corrupt text fails', () => {
  const text = 'Olá Ana! 😊\nExact custom text & link';
  const url = new URL(makeWhatsAppUrl('+12025550147', text));
  assert.equal(url.pathname, '/12025550147');
  assert.equal(url.searchParams.get('text'), text);
  for (const text of ['', 'x'.repeat(4001), '\ufffd', '\ud800']) assert.throws(() => makeWhatsAppUrl('+12025550147', text));
  assert.throws(() => makeWhatsAppUrl('2025550147', 'Hello'));
});
test('configuration defaults are isolated and legacy migration preserves edits/order', () => {
  const fresh = migrateConfig(undefined); fresh.templates[0].text = 'changed';
  assert.notEqual(defaults.templates[0].text, 'changed');
  const old = { version: 1, business: 'Salon', appUrl: '', image: '', templates: [{ id: 'custom', label: 'Mine', text: 'Custom 😊' }] };
  const migrated = migrateConfig(old);
  assert.equal(migrated.version, 2); assert.deepEqual(migrated.templates, old.templates);
  assert.throws(() => migrateConfig({ ...old, version: 99 }));
});
test('configuration rejects limits, duplicate IDs, broken images and variables', () => {
  for (const patch of [
    { templates: [] }, { templates: Array(9).fill(defaults.templates[0]) },
    { templates: [defaults.templates[0], defaults.templates[0]] },
    { business: 'x'.repeat(101) },
    { templates: [{ id: 'x', label: 'X', text: '{unknown}' }] },
    { templates: [{ id: 'x', label: 'X', text: 'Hello', image: 'missing' }] },
  ]) assert.throws(() => validateConfig({ ...defaults, ...patch }));
  assert.throws(() => validateImage('data:image/png;base64,YmFk'));
  assert.throws(() => validateImage('data:image/jpeg;base64,YmFk'));
  assert.throws(() => validateUrl('http://example.com'));
  assert.throws(() => validateUrl('https://user:password@example.com'));
});
test('legacy image associations become explicit; unreferenced assets are removed', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const migrated = migrateConfig({ version: 1, business: '', appUrl: '', image: png, templates: [{ id: 'app', label: 'App', text: 'Hello' }, { id: 'custom', label: 'Other', text: 'Custom' }] });
  assert.equal(migrated.templates[0].image, 'legacy');
  assert.equal(migrated.templates[1].image, undefined);
  assert.equal(migrated.images.legacy, png);
  assert.deepEqual(validateConfig({ ...defaults, images: { unused: png } }).images, {});
});
