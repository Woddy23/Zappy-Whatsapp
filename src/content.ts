import { defaults, STORAGE_KEY, migrateConfig, renderMessage, makeWhatsAppUrl, type Config, type Template } from './core';
import { readCustomer, sameCustomer, visible, type Customer } from './adapter';

// WhatsApp path: Simple Icons (CC0), see README.md asset provenance.
const whatsappIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;
const lineIcon = (path: string, className = '') => `<svg class="${className}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
const chevron = lineIcon('<path d="m9 5 7 7-7 7"/>', 'chevron');

if (!document.querySelector('[data-zappy-whatsapp-helper]')) start();
function start(): void {
  let config: Config = structuredClone(defaults);
  let configReady = false, configError = '', lastError = '';
  let current: Customer | null = null, snapshot: Customer | null = null;
  let changedAt = Date.now(), configLoad = 0;
  let expanded = false, waiting = false, stale = false;
  let selected: Template | null = null;
  const host = document.createElement('span');
  host.dataset.zappyWhatsappHelper = '0.1.0';
  host.style.cssText = 'display:inline-block;float:left;clear:none;margin:12px 0 0 8px;vertical-align:top;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{font:14px/1.5 system-ui,sans-serif;color:#20372d}*{box-sizing:border-box}
    button,textarea{font:inherit}button,a{touch-action:manipulation}button{cursor:pointer;color:inherit}
    button:disabled{cursor:not-allowed;opacity:.55}button{border:0;background:none;border-radius:6px}svg{flex-shrink:0;vertical-align:middle}
    #trigger{display:inline-flex;align-items:center;gap:7px;background:#157d48;border:1px solid #116b3d;color:#fff;border-radius:5px;padding:0 10px;height:30px;white-space:nowrap;font-size:12px;font-weight:650;line-height:1}
    #trigger .chevron{width:12px;height:12px;transform:rotate(90deg);margin-left:3px}#trigger[aria-expanded=true] .chevron{transform:rotate(-90deg)}#trigger:hover,#trigger[aria-expanded=true]{background:#106437;border-color:#0d572f}
    #panel{position:fixed;inset:auto;margin:0;color:#20372d;background:#fff;border:1px solid #d7e2dc;border-radius:12px;padding:16px;width:360px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);overflow:auto;overscroll-behavior:contain;box-shadow:0 10px 32px #142e2329;font:14px/1.5 system-ui,sans-serif;color-scheme:light}
    header{display:flex;align-items:center;justify-content:space-between;gap:8px}h2{display:flex;gap:8px;align-items:center;font-size:15px;margin:0;color:#176b46}#close{display:grid;place-items:center;width:28px;height:28px;color:#617469}
    #recipient{white-space:pre-line;font-size:13px;font-weight:600;margin:12px 0 0;padding-bottom:12px;border-bottom:1px solid #e5ece7;overflow-wrap:anywhere;line-height:1.65}.note{font-size:12px;color:#617469;margin:8px 0 12px}
    #choices{display:grid;gap:5px;margin:10px 0 12px}.choice-row{min-width:0}.choice{display:flex;align-items:center;gap:11px;width:100%;min-height:60px;text-align:left;padding:10px;border:1px solid #e1e8e3;border-radius:8px;background:#fff;overflow-wrap:anywhere}.choice-icon{display:grid;place-items:center;width:32px;height:32px;flex-shrink:0;color:#397658;background:#f0f5f2;border-radius:7px}.choice-content{display:block;min-width:0;flex:1}.choice-title{display:block;font-size:13px;font-weight:600;line-height:1.4}.choice-preview{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;font-weight:400;color:#63756a;margin-top:3px}.choice .chevron{width:14px;height:14px;color:#809086}.choice:disabled{opacity:1;color:#748078;background:#fafbf9;border-color:#e8ede9}.choice:disabled .choice-icon{color:#748078;background:#f0f2ef}.choice:disabled .chevron{display:none}.choice-note{font-size:12px;color:#63756a;margin:4px 10px 6px;overflow-wrap:anywhere}.choice:not(:disabled):is(:hover,:focus-visible){background:#edf7f0;border-color:#76ad8b;box-shadow:inset 3px 0 #17754f}.choice:not(:disabled):is(:hover,:focus-visible) .choice-icon{background:#d9efdf;color:#14653d}.choice:not(:disabled):is(:hover,:focus-visible) .chevron{color:#17754f}.choice:active:not(:disabled){background:#e1f1e7}
    #custom,#settings,#back{display:flex;align-items:center;gap:9px;padding:9px 8px;text-align:left;color:#176b46}#custom{width:100%;border:1px dashed #bfd1c5;border-radius:7px;font-size:13px}#settings{font-size:12px}#back{margin:4px 0;font-size:13px}#custom:hover:not(:disabled),#back:hover,#settings:hover,#close:hover{background:#eff6f1}#open:hover:not(:disabled){background:#125f40}
    #status{color:#456257;background:#f1f5f3;border-left:3px solid #9cb5a8;padding:8px 10px;font-size:13px;margin:10px 0;overflow-wrap:anywhere}#status[data-kind=error]{color:#9f351d;background:#fff4f0;border-color:#ba4b2b}#status[data-kind=success]{color:#176b46;background:#eff6f1;border-color:#17754f}#status:empty{display:none}
    #retry,#copy{background:#eff6f1;border:1px solid #b5cabe;padding:9px 12px}label{display:block;font-weight:600;margin:8px 0 5px}textarea{width:100%;height:145px;min-height:90px;resize:vertical;padding:10px;border:1px solid #9cb5a8;border-radius:6px;color:#20372d;background:#fff;line-height:1.5;font-size:15px}
    #media{margin:12px 0;border-top:1px solid #e3e9e5;padding-top:12px}#image{display:block;max-width:100%;object-fit:contain;object-position:left center;margin-bottom:10px}#download{display:inline-block;font-size:13px;color:#176b46;padding:9px}#download:hover{text-decoration-thickness:2px}
    #open{background:#17754f;color:#fff;padding:11px 14px;font-weight:600;width:100%;margin:8px 0}footer{border-top:1px solid #e3e9e5;margin-top:14px;padding-top:7px}footer .note{margin:4px 8px 0;font-size:11px}
    :focus-visible{outline:2px solid #17754f;outline-offset:2px}#panel:focus{outline:none}#trigger:focus-visible{outline-color:#125f40}[hidden]{display:none!important}
  </style>
  <button id="trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="panel">${whatsappIcon}<span>WhatsApp</span>${chevron}</button>
  <div id="panel" popover="auto" role="dialog" aria-labelledby="title" aria-describedby="recipient" tabindex="-1">
    <header><h2 id="title">${whatsappIcon}WhatsApp</h2><button id="close" type="button" aria-label="Fechar opções">${lineIcon('<path d="m6 6 12 12M18 6 6 18"/>')}</button></header>
    <div id="recipient" aria-live="polite"></div>
    <div id="status" role="status" aria-live="polite"></div>
    <button id="retry" type="button" hidden>Atualizar destinatário</button>
    <div id="menu"><p class="note">Escolha a mensagem para este cliente.</p><div id="choices"></div><button id="custom" type="button" disabled>${lineIcon('<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/>')}<span>Escrever mensagem…</span></button></div>
    <section id="editor" hidden>
      <button id="back" type="button">Voltar às mensagens</button>
      <label id="message-label" for="message">Mensagem</label><textarea id="message" name="message" autocomplete="off" maxlength="4000" spellcheck="true" disabled></textarea>
      <section id="media" hidden><img id="image" width="160" height="110" alt="Imagem desta mensagem"><button id="copy" type="button" disabled>Copiar imagem</button><a id="download" download="mensagem.png">Guardar imagem</a><p class="note">Abrir WhatsApp Web prepara a imagem com este texto como legenda (até 1024 caracteres). Reveja e clique em Enviar uma vez. Copiar/Guardar imagem são alternativas se a preparação falhar.</p></section>
      <button id="open" type="button" disabled>Abrir WhatsApp</button>
    </section>
    <footer><button id="settings" type="button">${lineIcon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="white"/><circle cx="15" cy="17" r="2" fill="white"/>')}<span>Configurar mensagens</span></button><p class="note">Reveja e envie pela conta iniciada no WhatsApp.</p></footer>
  </div>`;
  const el = <T extends HTMLElement>(id: string) => shadow.getElementById(id) as T;
  const trigger = el<HTMLButtonElement>('trigger'), panel = el('panel');
  const message = el<HTMLTextAreaElement>('message'), open = el<HTMLButtonElement>('open');
  const copy = el<HTMLButtonElement>('copy'), custom = el<HTMLButtonElement>('custom');
  const choices = el('choices'), status = el('status');
  trigger.popoverTargetElement = panel;
  trigger.popoverTargetAction = 'toggle';
  function notify(text: string, kind = 'info'): void { status.textContent = text; status.dataset.kind = kind; }

  function position(): void {
    if (!expanded) return;
    const anchor = trigger.getBoundingClientRect();
    const height = panel.offsetHeight, width = panel.offsetWidth;
    panel.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - width - 8))}px`;
    const below = anchor.bottom + 6;
    panel.style.top = `${Math.max(8, Math.min(below + height <= innerHeight - 8 ? below : anchor.top - height - 6, innerHeight - height - 8))}px`;
  }
  function clearDraft(reason = ''): void {
    snapshot = null; selected = null; message.value = ''; message.disabled = true;
    open.disabled = true; copy.disabled = true; custom.disabled = true;
    el('recipient').textContent = ''; el('editor').hidden = true; el('menu').hidden = false;
    el('media').hidden = true; el<HTMLImageElement>('image').removeAttribute('src');
    el<HTMLAnchorElement>('download').removeAttribute('href');
    choices.replaceChildren(); notify(reason, reason ? 'error' : 'info');
  }
  function close(returnFocus = false): void {
    if (expanded) panel.hidePopover();
    if (returnFocus) trigger.focus();
  }
  function invalidate(reason: string): void {
    if (!expanded || !snapshot) return;
    const hadFocus = !!shadow.activeElement && panel.contains(shadow.activeElement);
    stale = true; waiting = false; clearDraft(reason);
    el('retry').hidden = false; position();
    if (hadFocus) el('retry').focus();
  }
  function sync(): void {
    if (document.hidden) return;
    const anchors = Array.from(document.querySelectorAll<HTMLButtonElement>('#sendAppInviteBtn')).filter(visible);
    if (anchors.length !== 1) { close(); host.remove(); current = null; changedAt = Date.now(); return; }
    // Stay in this profile's action group; an unrelated/hidden citizen-card button is not an anchor.
    const citizenButtons = Array.from(anchors[0].parentElement!.children).filter(node => node.id === 'client_get_from_govid' && visible(node));
    const placement = citizenButtons.length === 1 ? citizenButtons[0] : anchors[0];
    if (host.previousElementSibling !== placement) placement.after(host);
    try {
      const next = readCustomer();
      if (!sameCustomer(current, next)) {
        changedAt = Date.now();
        invalidate('A ficha mudou. Confirme o destinatário antes de escolher outra mensagem.');
      }
      current = next; lastError = '';
    } catch (error) {
      lastError = (error as Error).message;
      invalidate(lastError); current = null; changedAt = Date.now();
    }
    trigger.title = lastError || 'Escolher uma mensagem para este cliente';
    if (expanded && waiting) prepare();
  }
  function checkRecipient(): Customer {
    try {
      const latest = readCustomer();
      if (stale || !snapshot || !sameCustomer(snapshot, latest)) throw new Error('A ficha mudou. Atualize o destinatário e escolha novamente.');
      return latest;
    } catch (error) { invalidate((error as Error).message); throw error; }
  }
  function prepare(): void {
    if (!configReady) { notify('A carregar as definições…'); return; }
    if (configError) { notify(configError, 'error'); return; }
    if (!current) { notify(lastError || 'A carregar a ficha…', lastError ? 'error' : 'info'); return; }
    if (Date.now() - changedAt < 700) { notify('A carregar a ficha…'); return; }
    snapshot = current; waiting = false; stale = false;
    el('recipient').textContent = `${snapshot.name}\n${snapshot.phone}`;
    notify(''); custom.disabled = false; choices.replaceChildren();
    for (const template of config.templates) {
      const row = document.createElement('div'); row.className = 'choice-row';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'choice'; button.dataset.template = template.id;
      button.setAttribute('aria-label', template.label);
      const kind = template.image ? '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>' : template.text.includes('{linkApp}') ? '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.92)"/>' : '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3H3V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>';
      button.innerHTML = `<span class="choice-icon">${lineIcon(kind)}</span><span class="choice-content"><span class="choice-title"></span><span class="choice-preview" aria-hidden="true"></span></span>${chevron}`;
      button.querySelector('.choice-title')!.textContent = template.label;
      row.append(button);
      let hint = template.image ? 'Com imagem' : '';
      try {
        const text = renderMessage(template.text, snapshot.name, config);
        makeWhatsAppUrl(snapshot.phone, text);
        button.querySelector('.choice-preview')!.textContent = `${template.image ? 'Com imagem · ' : ''}${text.replace(/\s+/g, ' ').trim()}`;
      } catch (error) {
        button.disabled = true; hint = template.text.includes('{linkApp}') && !config.appUrl ? 'Configure o link da app.' : template.text.includes('{salao}') && !config.business ? 'Configure o nome do salão.' : (error as Error).message;
        button.querySelector('.choice-preview')!.textContent = 'Indisponível';
      }
      if (hint) { const note = document.createElement('p'); note.className = 'choice-note'; note.hidden = !button.disabled; note.id = `choice-note-${choices.children.length}`; note.textContent = hint; row.append(note); button.setAttribute('aria-describedby', note.id); }
      button.addEventListener('click', () => {
        try {
          const recipient = checkRecipient();
          if (template.image) edit(template); else launch(renderMessage(template.text, recipient.name, config));
        } catch (error) { notify((error as Error).message, 'error'); }
      });
      choices.append(row);
    }
    position();
  }
  function begin(): void {
    stale = false; waiting = true; clearDraft(); el('retry').hidden = true;
    if (configError && configReady) void loadConfig();
    sync();
  }
  function edit(template: Template | null): void {
    const recipient = checkRecipient(); selected = template;
    el('menu').hidden = true; el('editor').hidden = false;
    el('message-label').textContent = template?.label || 'Escrever mensagem';
    message.value = template ? renderMessage(template.text, recipient.name, config) : '';
    message.disabled = false; open.disabled = !message.value.trim(); notify('');
    const image = template?.image ? config.images[template.image] : '';
    open.textContent = image ? 'Preparar imagem no WhatsApp Web' : 'Abrir WhatsApp';
    message.maxLength = image ? 1024 : 4000;
    el('media').hidden = !image; copy.disabled = !image;
    if (image) { el<HTMLImageElement>('image').src = image; el<HTMLAnchorElement>('download').href = image; }
    position(); message.focus();
  }
  function launch(text: string): void {
    const recipient = checkRecipient();
    const link = document.createElement('a');
    link.href = makeWhatsAppUrl(recipient.phone, text); link.target = '_blank'; link.rel = 'noopener noreferrer';
    shadow.append(link); link.click(); link.remove();
    notify('Reveja e envie no WhatsApp. Se não abriu, permita novas janelas neste site.');
    position();
  }
  panel.addEventListener('beforetoggle', event => {
    expanded = (event as ToggleEvent).newState === 'open';
    trigger.setAttribute('aria-expanded', String(expanded));
    if (expanded) begin(); else { waiting = false; stale = false; clearDraft(); }
  });
  panel.addEventListener('toggle', () => {
    position();
    if (expanded && (!shadow.activeElement || shadow.activeElement === trigger)) panel.focus({ preventScroll: true });
  });
  el('close').addEventListener('click', () => close(true));
  shadow.addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Escape' && expanded) { event.preventDefault(); close(true); } });
  el('retry').addEventListener('click', begin);
  custom.addEventListener('click', () => { try { edit(null); } catch (error) { notify((error as Error).message, 'error'); } });
  el('back').addEventListener('click', () => {
    selected = null; message.value = ''; el('editor').hidden = true; el('menu').hidden = false; notify('');
    position(); custom.focus();
  });
  message.addEventListener('input', () => { open.disabled = !message.value.trim() || !snapshot || stale; notify(''); });
  open.addEventListener('click', async () => {
    const template = selected, recipient = snapshot;
    try {
      const latest = checkRecipient();
      const image = template?.image ? config.images[template.image] : '';
      if (!image) { launch(message.value); return; }
      makeWhatsAppUrl(latest.phone, message.value);
      if (message.value.length > 1024) throw new Error('A legenda da imagem pode ter até 1024 caracteres. Reduza o texto antes de abrir.');
      open.disabled = true;
      const result = await chrome.runtime.sendMessage({ type: 'prepare-image', phone: latest.phone, text: message.value, image });
      if (!result?.ok) throw new Error(result?.error || 'Não foi possível preparar a imagem. Use Copiar imagem ou Guardar imagem.');
      if (snapshot === recipient && selected === template) notify('WhatsApp Web aberto. Aguarde a imagem e a legenda; confira o destinatário e clique em Enviar.');
    } catch (error) { if (snapshot === recipient && selected === template) notify((error as Error).message, 'error'); }
    finally { if (snapshot === recipient && selected === template) open.disabled = !message.value.trim(); }
  });
  copy.addEventListener('click', async () => {
    const template = selected, recipient = snapshot;
    try {
      checkRecipient();
      const image = template?.image && config.images[template.image];
      if (!image) throw new Error('Imagem indisponível.');
      copy.disabled = true; notify('A copiar imagem…');
      const bytes = Uint8Array.from(atob(image.split(',')[1]), char => char.charCodeAt(0));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bytes], { type: 'image/png' }) })]);
      if (snapshot === recipient && selected === template) notify('Imagem copiada. Abra o WhatsApp, envie o texto e cole a imagem com Ctrl+V.', 'success');
    } catch {
      if (snapshot === recipient && selected === template) notify('Não foi possível copiar. Use Guardar imagem e anexe o ficheiro no WhatsApp.', 'error');
    } finally { if (snapshot === recipient && selected === template) copy.disabled = false; }
  });
  el('settings').addEventListener('click', async () => {
    try { const result = await chrome.runtime.sendMessage({ type: 'open-settings' }); if (!result?.ok) throw new Error(); }
    catch { notify('Não foi possível abrir as definições. Use o ícone da extensão no navegador.', 'error'); }
  });
  async function loadConfig(): Promise<void> {
    const request = ++configLoad; configReady = false;
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (request !== configLoad) return;
      config = migrateConfig(result[STORAGE_KEY]); configError = '';
    } catch { if (request !== configLoad) return; configError = 'Não foi possível carregar as definições. Abra Configurar mensagens para recuperar.'; }
    configReady = true; if (expanded && waiting) prepare();
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) { invalidate('As mensagens foram alteradas. Atualize para usar as novas opções.'); void loadConfig(); }
  });
  document.addEventListener('input', event => {
    if (!event.composedPath().includes(shadow) && current && event.target === current.phoneNode) sync();
  }, true);
  // ponytail: legacy jQuery sets input.value without events; keep narrow polling until Zappy exposes a customer-change event.
  const timer = window.setInterval(sync, 300);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(position) : null;
  resize?.observe(panel);
  // Unrelated panel mutations must not erase a draft. Compare recipient values and nodes in sync.
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-busy', 'disabled', 'value'] });
  window.addEventListener('pagehide', event => {
    close(); clearDraft(); current = null; changedAt = Date.now();
    if (!event.persisted) { observer.disconnect(); resize?.disconnect(); clearInterval(timer); }
  });
  void loadConfig(); sync();
}
