import { defaults, STORAGE_KEY, MAX_IMAGE_BYTES, validateImage, validateConfig, validateUrl, validateMessageText, migrateConfig, renderMessage, type Config, type Template } from './core';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = byId('status');
const list = byId('templates');
const picker = byId<HTMLSelectElement>('message-picker');
const editor = byId<HTMLFieldSetElement>('editor');
const images = new Map<string, string>();
let loaded = false, loading = false, dirty = false, saving = false, conflict = false, pendingImages = 0;
let baseline: string | undefined;
let ownWrite: string | undefined;
let removed: { row: HTMLElement; index: number; image?: string } | null = null;
// Storage serialization may reorder object keys. Array order still identifies message order.
const fingerprint = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
function notify(text: string, kind = 'info'): void { status.textContent = text; status.dataset.kind = kind; }
function controls(): void {
  editor.disabled = !loaded || saving;
  byId<HTMLButtonElement>('save').disabled = !loaded || saving || pendingImages > 0 || conflict;
  byId('save').textContent = saving ? 'A guardar…' : 'Guardar alterações';
  byId('settings-form').setAttribute('aria-busy', String(saving));
  byId<HTMLButtonElement>('undo').disabled = saving || !loaded;
  byId<HTMLButtonElement>('reload').disabled = loading || saving || pendingImages > 0;
  byId<HTMLButtonElement>('reset').disabled = loading || saving || pendingImages > 0;
}
function changed(): void { dirty = true; notify(conflict ? 'Definições alteradas noutra página. Recarregue antes de guardar.' : 'Alterações por guardar.', conflict ? 'error' : 'info'); }
function fieldError(field: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  let error = byId(`${field.id}-error`);
  if (!error) { error = document.createElement('p'); error.id = `${field.id}-error`; error.className = 'field-error'; field.after(error); }
  error.textContent = text; error.hidden = !text;
  field.setAttribute('aria-invalid', String(Boolean(text)));
  field.setAttribute('aria-describedby', error.id);
}
function validateFields(): boolean {
  let first: HTMLInputElement | HTMLTextAreaElement | null = null;
  const check = (field: HTMLInputElement | HTMLTextAreaElement, error: string) => { fieldError(field, error); if (error && !first) first = field; };
  const business = byId<HTMLInputElement>('business'), url = byId<HTMLInputElement>('app-url');
  check(business, business.value.length > 100 ? 'Use um nome até 100 caracteres.' : '');
  let urlError = '';
  try { validateUrl(url.value); } catch (error) { urlError = (error as Error).message; }
  check(url, urlError);
  for (const row of list.children) {
    const title = row.querySelector<HTMLInputElement>('.template-label')!, text = row.querySelector<HTMLTextAreaElement>('.template-text')!;
    check(title, !title.value.trim() ? 'Escreva um título para esta opção.' : title.value.length > 60 ? 'Use um título até 60 caracteres.' : '');
    let error = '';
    try { validateConfig({ ...defaults, templates: [{ id: 'check', label: 'Mensagem', text: text.value }] }); validateMessageText(text.value); }
    catch (cause) { error = !text.value.trim() ? 'Escreva a mensagem.' : (cause as Error).message; }
    check(text, error);
  }
  if (!first) return true;
  const invalid = first as HTMLInputElement | HTMLTextAreaElement;
  const row = invalid.closest<HTMLElement>('.template'); if (row) selectTemplate(row.dataset.id!);
  invalid.focus(); notify('Corrija os campos assinalados antes de guardar.', 'error');
  return false;
}
function readConfig(): Config {
  const assets: Record<string, string> = Object.create(null);
  return { version: 2, business: byId<HTMLInputElement>('business').value, appUrl: byId<HTMLInputElement>('app-url').value, images: assets, templates: Array.from(list.children).map(row => {
    const id = (row as HTMLElement).dataset.id!;
    const data = images.get(id);
    const image = data ? Object.keys(assets).find(key => assets[key] === data) ?? id : undefined;
    if (image && data) assets[image] = data;
    return { id, label: (row.querySelector('.template-label') as HTMLInputElement).value, text: (row.querySelector('.template-text') as HTMLTextAreaElement).value, ...(image ? { image } : {}) };
  }) };
}
function preview(): void {
  const c = readConfig();
  for (const row of list.children) {
    const body = (row.querySelector('textarea') as HTMLTextAreaElement).value;
    const output = row.querySelector('.message-preview')!;
    row.querySelector('.char-count')!.textContent = `${body.length} / 3000`;
    try { output.textContent = renderMessage(body, 'Ana Silva', c); output.classList.remove('error'); }
    catch (error) { output.textContent = (error as Error).message; output.classList.add('error'); }
  }
}
function selectTemplate(id: string): void {
  picker.value = id;
  for (const row of list.children) (row as HTMLElement).hidden = (row as HTMLElement).dataset.id !== id;
}
function refreshPicker(id = picker.value): void {
  picker.replaceChildren(...Array.from(list.children, row => new Option((row.querySelector('.template-label') as HTMLInputElement).value || 'Nova mensagem', (row as HTMLElement).dataset.id)));
  selectTemplate(Array.from(picker.options).some(option => option.value === id) ? id : picker.options[0]?.value || '');
}
picker.addEventListener('change', () => selectTemplate(picker.value));
function addTemplate(t: Template, open = false, imageData = ''): void {
  const row = document.createElement('section'); row.className = 'template'; row.dataset.id = t.id;
  const grid = document.createElement('div'); grid.className = 'editor-grid';
  const fields = document.createElement('div'); fields.className = 'editor-fields';
  const label = document.createElement('label'); label.textContent = 'Título';
  const name = document.createElement('input'); name.className = 'template-label'; name.value = t.label; name.maxLength = 60; name.required = true; name.id = `label-${t.id}`; name.name = name.id; name.autocomplete = 'off'; label.htmlFor = name.id;
  const bodyLabel = document.createElement('label'); bodyLabel.textContent = 'Mensagem';
  const body = document.createElement('textarea'); body.className = 'template-text'; body.value = t.text; body.maxLength = 3000; body.required = true; body.id = `text-${t.id}`; body.name = body.id; body.autocomplete = 'off'; body.spellcheck = false; bodyLabel.htmlFor = body.id;
  const tools = document.createElement('div'); tools.className = 'compose-tools';
  const variables = document.createElement('select'); variables.className = 'variable'; variables.setAttribute('aria-label', 'Inserir dados na mensagem');
  variables.add(new Option('Inserir dado do cliente…', ''));
  for (const [key, title] of Object.entries({ primeiroNome: 'Primeiro nome', nome: 'Nome completo', salao: 'Salão', linkApp: 'Link da app' })) {
    variables.add(new Option(title, key));
  }
  variables.addEventListener('change', () => {
    const key = variables.value; if (!key) return;
    variables.value = '';
    if (body.value.length - (body.selectionEnd - body.selectionStart) + key.length + 2 > 3000) { notify('A mensagem pode ter até 3000 caracteres.', 'error'); return; }
    body.setRangeText(`{${key}}`, body.selectionStart, body.selectionEnd, 'end'); fieldError(body, ''); body.focus(); changed(); preview();
  });
  const count = document.createElement('span'); count.className = 'char-count'; count.setAttribute('aria-hidden', 'true'); tools.append(variables, count);
  const imageTools = document.createElement('div'); imageTools.className = 'image-tools';
  const imageLabel = document.createElement('label'); imageLabel.textContent = 'Imagem opcional'; imageLabel.className = 'sr-only';
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/png'; file.id = `image-${t.id}`; file.name = file.id; file.className = 'file-input'; imageLabel.htmlFor = file.id;
  file.tabIndex = -1;
  const pickImage = document.createElement('button'); pickImage.type = 'button'; pickImage.className = 'secondary'; pickImage.addEventListener('click', () => file.click());
  const imageHint = document.createElement('span'); imageHint.className = 'image-hint hint'; imageHint.id = `${file.id}-hint`; imageHint.textContent = 'PNG até 2 MB';
  file.setAttribute('aria-describedby', imageHint.id);
  const imageStatus = document.createElement('p'); imageStatus.className = 'field-error'; imageStatus.setAttribute('role', 'status'); imageStatus.hidden = true;
  const thumbnail = document.createElement('img'); thumbnail.className = 'thumbnail'; thumbnail.alt = 'Imagem desta mensagem'; thumbnail.width = 160; thumbnail.height = 110;
  const removeImage = document.createElement('button'); removeImage.type = 'button'; removeImage.className = 'delete remove-image'; removeImage.textContent = 'Remover imagem';
  if (imageData) images.set(t.id, imageData);
  const refresh = () => { const data = images.get(t.id); thumbnail.hidden = !data; imageBubble.hidden = !data; imageCaption.hidden = !data; removeImage.hidden = !data; imageHint.hidden = !!data; pickImage.textContent = data ? 'Substituir imagem' : 'Adicionar imagem'; if (data) { thumbnail.src = data; imageBubble.append(output); bubble.hidden = true; } else { thumbnail.removeAttribute('src'); bubble.append(output); bubble.hidden = false; } };
  let imageRequest = 0;
  removeImage.addEventListener('click', () => { imageRequest++; images.delete(t.id); file.value = ''; imageStatus.hidden = true; refresh(); changed(); pickImage.focus(); });
  file.addEventListener('change', async () => {
    const selected = file.files?.[0]; if (!selected) return;
    const request = ++imageRequest; pendingImages++; changed(); controls();
    imageStatus.hidden = false; imageStatus.classList.remove('error'); imageStatus.textContent = 'A preparar imagem…';
    try {
      if (selected.type !== 'image/png' || selected.size > MAX_IMAGE_BYTES) throw new Error('Escolha uma imagem PNG até 2 MB.');
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reader.onabort = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(selected); });
      validateImage(data);
      const img = new Image(); img.src = data; await img.decode();
      if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth > 4096 || img.naturalHeight > 4096) throw new Error('Use uma imagem até 4096 × 4096 píxeis.');
      if (request !== imageRequest || !row.isConnected) return;
      images.set(t.id, data); refresh(); changed(); imageStatus.textContent = 'Imagem pronta. Guarde as alterações.';
    } catch (error) { if (request === imageRequest && row.isConnected) { imageStatus.textContent = `${(error as Error).message}${images.has(t.id) ? ' A imagem anterior foi mantida.' : ''}`; imageStatus.classList.add('error'); file.value = ''; } }
    finally { pendingImages--; controls(); }
  });
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remover mensagem'; remove.className = 'delete remove-template';
  remove.addEventListener('click', () => {
    if (list.children.length <= 1) { notify('Mantenha pelo menos uma mensagem.', 'error'); return; }
    imageRequest++; imageStatus.hidden = true; removed = { row, index: Array.from(list.children).indexOf(row), image: images.get(t.id) };
    images.delete(t.id); row.remove(); refreshPicker();
    byId('undo-note').textContent = `“${name.value || 'Nova mensagem'}” removida.`; byId('undo-bar').hidden = false;
    byId('undo').focus(); changed();
  });
  name.addEventListener('input', () => refreshPicker(t.id));
  imageTools.append(imageLabel, file, pickImage, imageHint, removeImage);
  fields.append(label, name, bodyLabel, body, tools, imageTools, imageStatus, remove);
  const panel = document.createElement('aside'); panel.className = 'preview-panel';
  const heading = document.createElement('div'); heading.className = 'preview-heading';
  const previewTitle = document.createElement('h3'); previewTitle.textContent = 'Pré-visualização';
  const recipient = document.createElement('span'); recipient.textContent = 'Para Ana Silva'; heading.append(previewTitle, recipient);
  const chat = document.createElement('div'); chat.className = 'chat-preview';
  const bubble = document.createElement('div'); bubble.className = 'message-bubble';
  const output = document.createElement('p'); output.className = 'message-preview'; bubble.append(output);
  const imageBubble = document.createElement('div'); imageBubble.className = 'image-bubble'; imageBubble.append(thumbnail);
  chat.append(bubble, imageBubble);
  const caption = document.createElement('p'); caption.className = 'preview-caption'; caption.textContent = 'Exemplo com um nome fictício.';
  const imageCaption = document.createElement('span'); imageCaption.textContent = 'O texto abre preenchido no WhatsApp. A imagem fica copiada para colar com Ctrl+V quando quiser.'; caption.append(imageCaption);
  panel.append(heading, chat, caption);
  grid.append(fields, panel); row.append(grid); list.append(row); refresh(); refreshPicker(open ? t.id : picker.value);
}
function populate(c: Config): void {
  byId<HTMLInputElement>('business').value = c.business; byId<HTMLInputElement>('app-url').value = c.appUrl;
  images.clear(); list.replaceChildren(); c.templates.forEach((t, index) => addTemplate(t, index === 0, t.image ? c.images[t.image] : '')); preview();
  removed = null; byId('undo-bar').hidden = true;
  loaded = true; dirty = false; conflict = false; byId('reset').hidden = true; byId('reload').hidden = true; controls();
}
async function load(): Promise<void> {
  if (loading) return;
  loading = true; loaded = false; controls(); notify('A carregar…');
  try { const result = await chrome.storage.local.get(STORAGE_KEY); baseline = fingerprint(result[STORAGE_KEY]); populate(migrateConfig(result[STORAGE_KEY])); notify('Definições carregadas.'); }
  catch { notify('Não foi possível ler as definições. Recarregue ou reponha as mensagens iniciais.', 'error'); byId('reset').hidden = false; byId('reload').hidden = false; }
  finally { loading = false; controls(); }
}
function storageConflict(): void { conflict = true; notify('Definições alteradas noutra página. Recarregue antes de guardar.', 'error'); byId('reload').hidden = false; controls(); }
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(STORAGE_KEY in changes)) return;
  const next = fingerprint(changes[STORAGE_KEY].newValue);
  if (saving && next === ownWrite) return;
  if (next !== baseline) storageConflict();
});
byId('add').addEventListener('click', () => {
  if (list.children.length >= 8) { status.textContent = 'Pode guardar até 8 mensagens.'; return; }
  addTemplate({ id: crypto.randomUUID(), label: '', text: '' }, true); changed(); preview();
  (list.lastElementChild?.querySelector('input') as HTMLInputElement)?.focus();
});
byId('undo').addEventListener('click', () => {
  if (!removed || saving) return;
  if (list.children.length >= 8) { notify('Remova uma mensagem antes de repor esta opção.', 'error'); return; }
  const { row, index, image } = removed;
  if (image) images.set(row.dataset.id!, image);
  list.insertBefore(row, list.children[index] || null); refreshPicker(row.dataset.id); row.querySelector<HTMLInputElement>('.template-label')?.focus();
  removed = null; byId('undo-bar').hidden = true; changed(); preview();
});
byId('settings-form').addEventListener('input', event => {
  const field = event.target;
  if (field === picker) return;
  if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.getAttribute('aria-invalid') === 'true') fieldError(field, '');
  changed(); preview();
});
window.addEventListener('beforeunload', event => { if (dirty || saving || pendingImages) { event.preventDefault(); event.returnValue = ''; } });
byId('reload').addEventListener('click', () => { if (loading || saving || pendingImages) return; if (!dirty || window.confirm('Descartar as alterações por guardar e recarregar?')) void load(); });
byId('reset').addEventListener('click', () => {
  if (!window.confirm('Repor as mensagens iniciais? Ao guardar, substituirá as definições anteriores.')) return;
  populate(structuredClone(defaults)); changed();
});
byId('settings-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!loaded || saving || pendingImages || conflict) return;
  if (!validateFields()) return;
  saving = true; controls(); notify('A guardar…');
  try {
    const c = validateConfig(readConfig());
    // One compare-and-write across settings tabs. A stale editor cannot overwrite a newer save.
    await navigator.locks.request(STORAGE_KEY, async () => {
      const current = await chrome.storage.local.get(STORAGE_KEY);
      if (fingerprint(current[STORAGE_KEY]) !== baseline || conflict) { storageConflict(); return; }
      ownWrite = fingerprint(c);
      await chrome.storage.local.set({ [STORAGE_KEY]: c });
      baseline = ownWrite;
      if (!conflict) { dirty = false; for (const row of list.children) { const note = row.querySelector<HTMLElement>('.image-tools + .field-error'); if (note && !note.classList.contains('error')) note.hidden = true; } notify('Alterações guardadas.', 'success'); }
    });
  } catch (error) { notify((error as Error).message || 'Não foi possível guardar. Tente novamente.', 'error'); }
  finally { ownWrite = undefined; saving = false; controls(); }
});
void load();
