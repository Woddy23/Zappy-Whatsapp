import { defaults, STORAGE_KEY, migrateConfig, renderMessage, makeWhatsAppUrl, type Config, type Template } from './core';
import { readCustomer, sameCustomer, visible, type Customer } from './adapter';

// Deliberately runs only on the backoffice origins in manifest.json.
const existing = document.querySelector('[data-zappy-whatsapp-helper]');
if (!existing) start();
function start(): void {
  let config: Config = structuredClone(defaults);
  let configReady = false;
  let configError = '';
  let current: Customer | null = null;
  let snapshot: Customer | null = null;
  let changedAt = Date.now();
  let lastError = '';
  let stale = false;
  const host = document.createElement('span');
  host.dataset.zappyWhatsappHelper = '0.1.0';
  host.style.cssText = 'display:inline-block;float:left;margin:12px 6px 0 0;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{font:14px Arial,sans-serif;color:#213b32}*{box-sizing:border-box}
    button,select,textarea{font:inherit}button,a{touch-action:manipulation}
    button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.55}
    #trigger{background:#17754f;color:white;border:0;border-radius:3px;padding:6px 13px;font-size:12px;font-weight:700;min-height:27px}
    dialog{color:#233a32;background:#fff;border:1px solid #d7e4dc;border-radius:14px;padding:24px;width:460px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 16px 64px #0004;font:14px/1.5 Arial,sans-serif}
    dialog::backdrop{background:#0e211d66}h2{font-size:21px;line-height:1.2;margin:0}header{display:flex;align-items:center;justify-content:space-between;gap:12px}
    #close{background:none;border:0;padding:6px;font-size:23px;color:#456257}.muted{color:#5b7067;font-size:12px}#recipient{white-space:pre-line;background:#eff6f1;border:1px solid #cbded1;border-radius:8px;padding:12px;margin:18px 0 14px;font-weight:600}#recipient-label{font-size:12px;color:#456257;margin:0 0 -12px}
    label{display:block;font-weight:600;margin:12px 0 5px}select,textarea{width:100%;padding:10px;border:1px solid #9cb5a8;border-radius:6px;background:#fff;color:#20372d}textarea{height:188px;min-height:120px;resize:vertical;line-height:1.5;font-size:15px}
    #status{font-size:13px;color:#87400c;background:#fff6eb;border-left:3px solid #b85c18;padding:7px 9px;margin:10px 0;min-height:20px}#status:empty{display:none}footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap}
    #open{border:0;border-radius:7px;background:#17754f;color:white;font-weight:700;padding:11px 16px}#settings{color:#235e45;font-size:13px}
    #media{margin-top:14px;border-top:1px solid #dfebe3;padding-top:12px}#image{width:58px;height:58px;object-fit:contain;vertical-align:middle;margin-right:8px;border:1px solid #ddd;border-radius:4px}
    #copy{border:1px solid #9cb5a8;background:#f4f8f5;border-radius:6px;padding:8px;color:#214633}.note{margin:10px 0 0;font-size:12px;color:#5b7067}
    :focus-visible{outline:3px solid #276de0;outline-offset:3px}[hidden]{display:none!important}
  </style>
  <button id="trigger" type="button" aria-haspopup="dialog">WhatsApp ▾</button>
  <dialog aria-labelledby="title">
    <header><h2 id="title">Mensagem por WhatsApp</h2><button id="close" type="button" aria-label="Fechar">×</button></header>
    <p id="recipient-label">Destinatário — confirme antes de abrir o WhatsApp</p><div id="recipient" aria-live="polite"></div>
    <label for="template">Escolher mensagem</label><select id="template"></select>
    <label for="message">Mensagem</label><textarea id="message" maxlength="4000" spellcheck="true"></textarea>
    <div id="status" role="status" aria-live="polite"></div>
    <section id="media" hidden><img id="image" alt="Imagem configurada"><button id="copy" type="button">Copiar imagem</button><p class="note">Depois de enviar o texto, cole a imagem no WhatsApp (Ctrl+V) e envie. Se não funcionar, anexe o ficheiro guardado.</p></section>
    <footer><a id="settings" target="_blank" rel="noopener noreferrer">Definições</a><button id="open" type="button">Abrir WhatsApp</button></footer>
    <p class="note">Confirme o destinatário e a conta do salão. O envio é manual. Se WhatsApp não abrir, permita novas janelas para este site.</p>
  </dialog>`;
  const el = <T extends HTMLElement>(id: string) => shadow.getElementById(id) as T;
  const trigger = el<HTMLButtonElement>('trigger');
  const dialog = shadow.querySelector('dialog')!;
  const select = el<HTMLSelectElement>('template');
  const message = el<HTMLTextAreaElement>('message');
  const open = el<HTMLButtonElement>('open');
  const copy = el<HTMLButtonElement>('copy');
  const status = el<HTMLDivElement>('status');
  el<HTMLAnchorElement>('settings').href = chrome.runtime.getURL('settings.html');

  function clearDraft(reason = ''): void {
    snapshot = null;
    message.value = '';
    el('recipient').textContent = '';
    open.disabled = true;
    copy.disabled = true;
    select.disabled = true;
    message.disabled = true;
    status.textContent = reason;
  }
  function invalidate(reason: string): void {
    if (dialog.open) { stale = true; clearDraft(reason); }
  }
  function sync(): void {
    if (document.hidden) return;
    const anchors = Array.from(document.querySelectorAll<HTMLButtonElement>('#sendAppInviteBtn')).filter(visible);
    if (anchors.length !== 1) {
      if (dialog.open) dialog.close();
      host.remove(); current = null; changedAt = Date.now(); return;
    }
    if (host.previousElementSibling !== anchors[0]) anchors[0].after(host);
    try {
      const next = readCustomer();
      if (!sameCustomer(current, next)) {
        changedAt = Date.now();
        invalidate('A ficha foi alterada. Feche esta janela e volte a abrir o WhatsApp do cliente.');
      }
      current = next; lastError = '';
    } catch (error) {
      lastError = (error as Error).message;
      if (current) invalidate(lastError);
      current = null; changedAt = Date.now();
    }
    trigger.title = lastError || 'Preparar uma mensagem para o cliente desta ficha';
  }
  function checkRecipient(): Customer {
    const latest = readCustomer();
    if (stale || !snapshot || !sameCustomer(snapshot, latest)) {
      invalidate('A ficha foi alterada. Feche esta janela e volte a abrir o WhatsApp do cliente.');
      throw new Error('A ficha foi alterada. Volte a abrir esta janela.');
    }
    return latest;
  }
  function isAppMessage(template: Template | undefined): boolean {
    if (!template) return false;
    return template.id === 'app' || template.id === 'app_login' || template.id.startsWith('app') || /app/i.test(template.label);
  }
  function isAvailableTemplate(template: Template): boolean {
    if (template.text.includes('{linkApp}') && !config.appUrl) return false;
    return true;
  }
  function updateMedia(selectedTemplate: Template | undefined): void {
    const showImage = Boolean(config.image && isAppMessage(selectedTemplate));
    el('media').hidden = !showImage;
    copy.disabled = !showImage;
  }
  function setTemplate(): void {
    if (!snapshot || stale) return;
    try {
      checkRecipient();
      const template = config.templates.find(t => t.id === select.value);
      if (!template) throw new Error('Escolha uma mensagem.');
      message.value = renderMessage(template.text, snapshot.name, config);
      message.disabled = false; status.textContent = ''; open.disabled = !message.value.trim();
      updateMedia(template);
    } catch (error) {
      message.value = ''; message.disabled = true; open.disabled = true;
      el('media').hidden = true; copy.disabled = true;
      status.textContent = (error as Error).message;
    }
  }
  trigger.addEventListener('click', () => {
    sync(); stale = false; clearDraft(); select.replaceChildren();
    const availableTemplates = config.templates.filter(isAvailableTemplate);
    for (const t of availableTemplates) select.add(new Option(t.label, t.id));
    const initialTemplate = availableTemplates[0];
    updateMedia(initialTemplate);
    el<HTMLImageElement>('image').src = config.image || '';
    try {
      if (!configReady) throw new Error('A carregar as definições. Tente novamente.');
      if (configError) throw new Error(configError);
      if (availableTemplates.length === 0) throw new Error('Não há mensagens disponíveis. Configure o link nas definições.');
      if (!current) throw new Error(lastError || 'Não foi possível ler a ficha.');
      if (Date.now() - changedAt < 700) throw new Error('A ficha está a atualizar. Feche esta janela e tente novamente dentro de um segundo.');
      snapshot = readCustomer();
      el('recipient').textContent = `${snapshot.name}\n${snapshot.phone}${config.business ? `\nSalão: ${config.business}` : ''}`;
      select.disabled = false; copy.disabled = false; setTemplate();
    } catch (error) { clearDraft((error as Error).message); }
    dialog.showModal();
  });
  select.addEventListener('change', setTemplate);
  message.addEventListener('input', () => {
    open.disabled = !message.value.trim() || !snapshot || stale;
    status.textContent = message.value.trim() ? '' : 'Escreva uma mensagem para abrir WhatsApp.';
  });
  el('close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { stale = false; clearDraft(); trigger.focus(); });
  open.addEventListener('click', () => {
    try {
      const recipient = checkRecipient();
      const href = makeWhatsAppUrl(recipient.phone, message.value);
      const link = document.createElement('a');
      link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
      // Native navigation needs no access to WhatsApp's page or its internal API.
      shadow.append(link); link.click(); link.remove();
      status.textContent = 'Confirme e envie no WhatsApp. Se a conversa não abriu, verifique o bloqueio de novas janelas.';
    } catch (error) { status.textContent = (error as Error).message; open.disabled = true; }
  });
  copy.addEventListener('click', async () => {
    try {
      checkRecipient();
      if (!config.image) throw new Error('Adicione uma imagem nas definições.');
      const bytes = Uint8Array.from(atob(config.image.split(',')[1]), char => char.charCodeAt(0));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bytes], { type: 'image/png' }) })]);
      if (snapshot && !stale) status.textContent = 'Imagem copiada. Envie o texto, depois cole a imagem no WhatsApp com Ctrl+V.';
    } catch { status.textContent = 'Não foi possível copiar. Anexe a imagem guardada no WhatsApp.'; }
  });
  async function loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      config = migrateConfig(result[STORAGE_KEY]);
      configError = '';
    } catch { configError = 'Não foi possível carregar as definições. Abra as definições e guarde novamente.'; }
    configReady = true;
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) {
      invalidate('As definições foram alteradas. Feche esta janela e volte a abri-la.');
      void loadConfig();
    }
  });
  document.addEventListener('input', event => {
    if (event.composedPath().includes(shadow)) return;
    if (current && event.target === current.phoneNode) sync();
  }, true);
  // Polling is intentional: legacy jQuery can change input.value without a DOM mutation/event.
  // Only three precise selectors are read; paused while the document is hidden.
  const timer = window.setInterval(sync, 300);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    sync();
  });
  const observer = new MutationObserver(records => {
    const relevant = records.some(record => {
      if (record.target === host) return false;
      const nodes = [...record.addedNodes, ...record.removedNodes];
      if (nodes.length && nodes.every(n => n === host)) return false;
      return !!current?.root.contains(record.target) || (!!current && !current.root.isConnected);
    });
    if (relevant) { changedAt = Date.now(); invalidate('A ficha foi atualizada. Feche esta janela e volte a abri-la.'); }
    sync();
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-busy', 'disabled', 'value'] });
  // Keep listeners for back/forward-cache restoration; the browser suspends them with the document.
  window.addEventListener('pagehide', event => {
    if (dialog.open) dialog.close();
    clearDraft(); current = null; changedAt = Date.now();
    if (!event.persisted) { observer.disconnect(); clearInterval(timer); }
  });
  void loadConfig(); sync();
}
