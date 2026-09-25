import { normalisePhone } from './core';
export interface Customer {
  name: string; phone: string; fingerprint: string;
  root: HTMLElement; nameNode: HTMLElement; phoneNode: HTMLInputElement; anchor: HTMLButtonElement;
}
export function visible(node: Element): boolean {
  if (!node.isConnected || node.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
  if (typeof node.checkVisibility === 'function') return node.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
  return !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
}
function unique<T extends HTMLElement>(selector: string): T {
  const nodes = Array.from(document.querySelectorAll<T>(selector)).filter(visible);
  if (nodes.length !== 1) throw new Error('Abra apenas uma ficha de cliente. Não foi possível identificar os campos com segurança.');
  return nodes[0];
}
export function readCustomer(): Customer {
  const anchor = unique<HTMLButtonElement>('#sendAppInviteBtn');
  const phoneNode = unique<HTMLInputElement>('input#telemovelttnc');
  const nameNode = unique<HTMLElement>('.cust_name');
  let root = anchor.parentElement;
  while (root && (!root.contains(phoneNode) || !root.contains(nameNode))) root = root.parentElement;
  // The enclosing customer container has not been supplied: derive its smallest common ancestor.
  // Refuse whole-document matching rather than joining unrelated fields.
  if (!root || root === document.body || root === document.documentElement) throw new Error('Não foi possível identificar a janela do cliente.');
  if (phoneNode.disabled || root.closest('[aria-busy="true"]')) throw new Error('Aguarde o carregamento da ficha.');
  const name = nameNode.textContent?.trim().replace(/\s+/g, ' ') ?? '';
  if (!name || name.length > 200) throw new Error('Não foi possível ler o nome do cliente.');
  const widget = phoneNode.closest('.intl-tel-input');
  const flag = widget?.querySelector('.selected-flag .iti-flag');
  const country = flag ? Array.from(flag.classList).find(c => /^[a-z]{2}$/.test(c)) : undefined;
  const raw = phoneNode.value; // Never read the placeholder or the HTML value attribute.
  const phone = normalisePhone(raw, country);
  return { name, phone, fingerprint: JSON.stringify([location.href, name, raw, country, phone]), root, nameNode, phoneNode, anchor };
}
export function sameCustomer(a: Customer | null, b: Customer): boolean {
  return !!a && a.fingerprint === b.fingerprint && a.root === b.root && a.nameNode === b.nameNode && a.phoneNode === b.phoneNode && a.anchor === b.anchor;
}
