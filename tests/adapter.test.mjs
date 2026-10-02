import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readCustomer, sameCustomer } from './compiled/adapter.js';

function fixture() {
  const dom = new JSDOM('<main><span class="cust_name">Ana Silva</span><div class="intl-tel-input"><div class="selected-flag"><span class="iti-flag us"></span></div><input id="telemovelttnc" value="2025550147" placeholder="999"><input id="alternate" value="2025550199"></div><button id="sendAppInviteBtn"></button></main>', { url: 'https://zappysoftware.com/backoffice/test' });
  Object.assign(globalThis, { document: dom.window.document, location: dom.window.location, getComputedStyle: dom.window.getComputedStyle });
  dom.window.Element.prototype.checkVisibility = function () { return this.style.display !== 'none'; };
  return dom;
}
test('extracts unique customer and current primary value, never alternate/placeholder', () => {
  const dom = fixture();
  const customer = readCustomer();
  assert.equal(customer.name, 'Ana Silva'); assert.equal(customer.phone, '+12025550147');
  document.querySelector('#telemovelttnc').value = '';
  assert.throws(readCustomer);
  dom.window.close();
});
test('missing, duplicate, unrelated and loading fields fail closed', () => {
  for (const mutate of [
    () => document.querySelector('.cust_name').remove(),
    () => document.querySelector('main').append(document.querySelector('#telemovelttnc').cloneNode()),
    () => { document.querySelector('#telemovelttnc').disabled = true; },
    () => document.querySelector('main').setAttribute('aria-busy', 'true'),
    () => document.body.append(document.querySelector('.cust_name')),
  ]) { const dom = fixture(); mutate(); assert.throws(readCustomer); dom.window.close(); }
});
test('hidden duplicates do not create ambiguity; changed values/nodes invalidate identity', () => {
  const dom = fixture();
  const copy = document.querySelector('#telemovelttnc').cloneNode(); copy.hidden = true; document.body.append(copy);
  const before = readCustomer(); assert.equal(sameCustomer(before, readCustomer()), true);
  document.querySelector('#telemovelttnc').value = '2025550199'; assert.equal(sameCustomer(before, readCustomer()), false);
  const next = readCustomer(); const input = document.querySelector('#telemovelttnc'); input.replaceWith(input.cloneNode());
  assert.equal(sameCustomer(next, readCustomer()), false);
  dom.window.close();
});
