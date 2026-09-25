import { defaults, STORAGE_KEY, validateConfig, migrateConfig, type Config, type Template } from './core';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = byId('status');
const list = byId('templates');
let imageData = '';
let loaded = false;
function addTemplate(t: Template): void {
  const row = document.createElement('div'); row.className = 'template'; row.dataset.id = t.id;
  const label = document.createElement('label'); label.textContent = 'Nome da opção';
  const name = document.createElement('input'); name.className = 'template-label'; name.value = t.label; name.maxLength = 60; name.required = true; name.id = `label-${t.id}`; label.htmlFor = name.id;
  const bodyLabel = document.createElement('label'); bodyLabel.textContent = 'Texto da mensagem';
  const body = document.createElement('textarea'); body.className = 'template-text'; body.value = t.text; body.maxLength = 3000; body.required = true; body.id = `text-${t.id}`; bodyLabel.htmlFor = body.id;
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remover esta opção'; remove.className = 'delete';
  remove.addEventListener('click', () => { if (list.children.length > 1) { row.remove(); status.textContent = 'Alterações por guardar.'; } else status.textContent = 'Mantenha pelo menos uma mensagem.'; });
  row.append(label, name, bodyLabel, body, remove); list.append(row);
}
function refreshImage(): void {
  const preview = byId<HTMLImageElement>('preview');
  if (imageData) preview.src = imageData; else preview.removeAttribute('src');
  preview.hidden = !imageData; byId('remove-image').hidden = !imageData;
}
async function load(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const c = migrateConfig(result[STORAGE_KEY]);
    byId<HTMLInputElement>('business').value = c.business;
    byId<HTMLInputElement>('app-url').value = c.appUrl;
    imageData = c.image; list.replaceChildren(); c.templates.forEach(addTemplate); refreshImage(); loaded = true;
  } catch { status.textContent = 'Não foi possível ler as definições. Recarregue esta página.'; }
}
byId('add').addEventListener('click', () => {
  if (list.children.length >= 8) { status.textContent = 'Pode guardar até 8 opções.'; return; }
  addTemplate({ id: crypto.randomUUID(), label: '', text: '' });
  (list.lastElementChild?.querySelector('input') as HTMLInputElement)?.focus();
});
byId('settings-form').addEventListener('input', () => { status.textContent = 'Alterações por guardar.'; });
byId('remove-image').addEventListener('click', () => { imageData = ''; byId<HTMLInputElement>('image-file').value = ''; refreshImage(); status.textContent = 'Imagem removida. Guarde as definições.'; });
byId<HTMLInputElement>('image-file').addEventListener('change', async event => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0]; if (!file) return;
  byId<HTMLButtonElement>('save').disabled = true;
  try {
    if (file.type !== 'image/png' || file.size > 2 * 1024 * 1024) throw new Error('Escolha uma imagem PNG até 2 MB.');
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(file); });
    if (!data.startsWith('data:image/png;base64,iVBORw0KGgo')) throw new Error('O ficheiro não é uma imagem PNG válida.');
    const img = new Image(); img.src = data; await img.decode();
    if (img.naturalWidth > 4096 || img.naturalHeight > 4096) throw new Error('Use uma imagem até 4096 × 4096 píxeis.');
    imageData = data; refreshImage(); status.textContent = 'Imagem pronta. Guarde as definições.';
  } catch (error) { status.textContent = (error as Error).message || 'Imagem inválida.'; input.value = ''; }
  finally { byId<HTMLButtonElement>('save').disabled = false; }
});
byId('settings-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!loaded) return;
  const save = byId<HTMLButtonElement>('save'); save.disabled = true;
  try {
    const c: Config = {
      version: 1, business: byId<HTMLInputElement>('business').value, appUrl: byId<HTMLInputElement>('app-url').value, image: imageData,
      templates: Array.from(list.children).map(row => ({ id: (row as HTMLElement).dataset.id!, label: (row.querySelector('.template-label') as HTMLInputElement).value, text: (row.querySelector('.template-text') as HTMLTextAreaElement).value }))
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: validateConfig(c) });
    status.textContent = 'Definições guardadas. Volte à ficha do cliente.';
  } catch (error) { status.textContent = (error as Error).message || 'Não foi possível guardar.'; }
  finally { save.disabled = false; }
});
void load();
